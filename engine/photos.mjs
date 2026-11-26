// fastreel photos: real photographs from Wikimedia Commons and quotes from the reel's Wikipedia reference, for templates with
// "photos: commons" under ## checks (documentary explainers that pin real evidence beside the drawings).
//   photos  the production plan names each photo it wants ({id, shot, shows, search, label}); the engine searches Commons for
//           free-licence bitmaps (CC BY, CC BY-SA, CC0, public domain), downloads up to 6 candidates, and M3 looks at them and picks
//           the one that really shows the thing (or none). Each kept photo carries its credit line ("<label>. Photo: <artist>,
//           <licence>, via Wikimedia Commons"), drawn under it on screen by h.photo and listed in CREDITS.md.
//   quotes  the plan copies one or two sentences of the REFERENCE and marks the words to underline; the engine snaps them to the
//           reference's own wording (M3 paraphrases when it copies) and names the article as the source.
// The stage never touches the network: photos reach it as JPEG bytes (stage_asset.html loadPhotos).
import fs from 'node:fs';
import path from 'node:path';
import { run, log, pool } from './lib.mjs';

const UA = { 'User-Agent': 'fastreel-reference/1.0' };
const FREE = /^(cc[ -]?by|cc0|cc-zero|public domain|pd|attribution|no restrictions)/i;
const strip = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// free-licence bitmaps on Commons for a search, best match first
export async function searchCommons(q, n = 6, skip = new Set()) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=${Math.min(40, n * 4)}&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1000`;
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(20000) });
  const pages = Object.values((await r.json()).query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  const out = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0]; if (!ii || skip.has(p.title)) continue;
    const md = ii.extmetadata || {}, lic = strip(md.LicenseShortName?.value);
    if (!/^image\/(jpeg|png|webp|tiff)$/.test(ii.mime) || ii.width < 600 || ii.height < 400) continue;
    if (!FREE.test(lic) || /non-free|fair use|nc|nd/i.test(lic)) continue; // only licences that allow reuse with credit
    if (ii.width / ii.height > 3 || ii.height / ii.width > 2.2) continue; // panoramas and strips crop badly
    if (/\b(map|logo|flag|coat of arms|diagrams?|charts?|graph|scheme|schema|schematic|icon|seal|infographic|drawing|sketch)\b|schem/i.test(p.title)) continue; // photographs only
    const artist = strip(md.Artist?.value).replace(/^(user|own work)\s*:?\s*/i, '').slice(0, 60) || null;
    out.push({ title: p.title, page: ii.descriptionurl, thumb: ii.thumburl, w: ii.thumbwidth, h: ii.thumbheight, license: lic, artist, desc: strip(md.ImageDescription?.value).slice(0, 160) });
    if (out.length >= n) break;
  }
  return out;
}

async function download(url, file) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (r.status === 429) { await new Promise(res => setTimeout(res, 3000 * (a + 1))); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const raw = `${file}.src`; fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
      // one JPEG, at most 1000 px wide, for the stage (and a 360 px copy for M3's eyes)
      await run('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-frames:v', '1', '-vf', "scale='min(1000,iw)':-2", '-q:v', '3', file]);
      await run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vf', 'scale=360:-2', '-q:v', '5', file.replace(/\.jpg$/, '.small.jpg')]);
      fs.rmSync(raw); return true;
    } catch (e) { if (a === 2) { log(`photos: download failed (${e.message.slice(0, 60)}): ${url.slice(0, 90)}`); return false; } }
  }
  return false;
}
const dims = async f => { const o = String(await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f], { collect: true })).trim().split(','); return { w: +o[0], h: +o[1] }; };

export function creditLine(p) {
  const pd = /public domain|^pd|cc0|cc-zero|no restrictions/i.test(p.license || '');
  return `${p.label ? `${p.label.replace(/[.\s]+$/, '')}. ` : ''}${pd ? `${p.artist ? `${p.artist}, ` : ''}public domain` : `Photo: ${p.artist || 'unknown'}, ${p.license}`}, via Wikimedia Commons`;
}

// find every planned photo: search, download candidates, M3 picks one by looking (or none). Kept photos land in <work>/photos/.
// m3(step, system, messages, maxTokens) and img(dataUrl) come from asset_reel.mjs; extractJson parses M3's answer.
export async function findPhotos(wanted, workDir, { m3, img, extractJson }) {
  const dir = path.join(workDir, 'photos'); fs.mkdirSync(dir, { recursive: true });
  const used = new Set();
  const one = async ph => {
    // Commons' search wants every word, so a long query finds nothing ("Chena Hot Springs geothermal plant": 0 hits; "Chena Hot
    // Springs": 24): each query is also tried with its last words dropped, down to 2 words; at most 6 searches per photo
    const base = [ph.search, ...(ph.also || [])].map(x => String(x || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const tries = [...new Set(base.flatMap(q => { const w = q.split(' '), out = [q]; for (let n = w.length - 1; n >= 2; n--) out.push(w.slice(0, n).join(' ')); return out; }))].slice(0, 6);
    for (const q of tries) {
      let cands = [];
      try { cands = await searchCommons(q, 6, used); } catch (e) { log(`photos: search "${q}" failed (${e.message.slice(0, 60)})`); continue; }
      if (!cands.length) { log(`photos: ${ph.id}: nothing free on Commons for "${q}"`); continue; }
      const got = [];
      for (const [k, c] of cands.entries()) { const f = path.join(dir, `${ph.id}_c${k + 1}.jpg`); if (await download(c.thumb, f)) got.push({ ...c, file: f }); }
      if (!got.length) continue;
      const content = [{ type: 'text', text: `A documentary reel needs a real photograph that shows: ${ph.shows}\nIt is shown as a framed inset beside a drawing, about 600 px wide. Below are ${got.length} candidates from Wikimedia Commons, numbered.` }];
      got.forEach((c, k) => { content.push({ type: 'text', text: `Candidate ${k + 1}: ${c.title.replace(/^File:/, '')}${c.desc ? ` (${c.desc})` : ''}` }); content.push(img(`data:image/jpeg;base64,${fs.readFileSync(c.file.replace(/\.jpg$/, '.small.jpg')).toString('base64')}`)); });
      content.push({ type: 'text', text: 'Pick the candidate that clearly shows exactly that: a real photograph, the subject big, sharp and easy to recognise at a glance, no text, captions, watermarks or collage borders over it, not a drawing, map, chart or screenshot. A candidate that shows only something related (the wrong thing, a sign about it, a tiny subject in a wide view) does not count. Return only JSON: {"pick": the candidate number, or 0 if none fits, "focus": [x, y] the centre of the subject as fractions of the picture width and height (0 to 1), "label": "what the picked photo shows, 2 to 7 plain words with the place if known, e.g. \\"A [thing] in [place]\\""}' });
      let pick = null;
      try { pick = extractJson(await m3(`photo:${ph.id}`, 'You are a photo editor choosing real photographs for a documentary explainer. You judge only what you can see in each picture.', [{ role: 'user', content }], 1500)); } catch (e) { log(`photos: ${ph.id}: no usable pick (${e.message.slice(0, 60)})`); }
      const k = Math.round(+pick?.pick || 0);
      if (k >= 1 && k <= got.length) {
        const c = got[k - 1], file = path.join(dir, `${ph.id}.jpg`); fs.copyFileSync(c.file, file);
        got.forEach(g => { for (const f of [g.file, g.file.replace(/\.jpg$/, '.small.jpg')]) fs.rmSync(f, { force: true }); });
        used.add(c.title);
        const { w, h } = await dims(file), focus = Array.isArray(pick.focus) && pick.focus.length === 2 && pick.focus.every(v => +v >= 0 && +v <= 1) ? pick.focus.map(Number) : [0.5, 0.5];
        const label = String(pick.label || ph.label || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        const out = { ...ph, file: path.relative(workDir, file).replace(/\\/g, '/'), w, h, focus, label, title: c.title, page: c.page, license: c.license, artist: c.artist, query: q };
        out.credit = creditLine(out);
        log(`photos: ${ph.id}: "${c.title.replace(/^File:/, '').slice(0, 70)}" (${c.license}) for "${String(ph.shows).slice(0, 60)}"`);
        return out;
      }
      got.forEach(g => { used.add(g.title); for (const f of [g.file, g.file.replace(/\.jpg$/, '.small.jpg')]) fs.rmSync(f, { force: true }); });
      log(`photos: ${ph.id}: none of ${got.length} candidates for "${q}" shows it`);
    }
    log(`photos: ${ph.id}: no photo found; the shot draws it instead`);
    return null;
  };
  // 2 at a time: Commons asks clients to keep requests modest
  return (await pool(wanted.map(ph => () => one(ph)), 2)).filter(Boolean);
}

// ---------- quotes: the plan's sentence snapped to the reference's own words, with the article it comes from ----------
const norm = s => String(s || '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const wordsOf = s => norm(s).toLowerCase().match(/[a-z0-9]+/g) || [];
function sentences(ref) {
  const out = []; let title = '';
  for (const para of String(ref).split(/\n+/)) {
    const m = para.match(/^###\s+(.+?)\s*$/); if (m) { title = m[1].replace(/\s*\(passages about:.*\)$/, ''); continue; }
    if (/^==/.test(para.trim())) continue;
    for (const s of para.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)) if (s.trim().length > 30) out.push({ s: norm(s), title });
  }
  return out;
}
const overlap = (a, b) => { const A = new Set(a), B = new Set(b); let n = 0; for (const w of A) if (B.has(w)) n++; return n / Math.max(1, Math.max(A.size, B.size)); };
// returns {quote} fixed to the reference, or {error}
export function snapQuote(q, ref) {
  const S = sentences(ref); if (!S.length) return { error: `quote "${q.id}": there is no REFERENCE text to quote` };
  const want = wordsOf(q.text);
  let best = null;
  for (let i = 0; i < S.length; i++) for (const span of [1, 2]) {
    if (i + span > S.length || (span === 2 && S[i + 1].title !== S[i].title)) continue;
    const s = S.slice(i, i + span).map(x => x.s).join(' '), o = overlap(want, wordsOf(s));
    if (!best || o > best.o + 0.001 || (Math.abs(o - best.o) <= 0.001 && span < best.span)) best = { s, o, span, title: S[i].title };
  }
  if (!best || best.o < 0.6) return { error: `quote "${q.id}" is not in the REFERENCE: copy one or two whole sentences from the REFERENCE word for word` };
  if (best.s.length > 320) return { error: `quote "${q.id}" is ${best.s.length} characters long; pick one shorter sentence (at most 300 characters)` };
  // the marked words: exact if they are in the sentence, else the window of the same length that shares the most words
  let mark = norm(q.mark);
  if (!mark || !best.s.toLowerCase().includes(mark.toLowerCase())) {
    const toks = best.s.split(' '), n = Math.max(2, wordsOf(q.mark).length), mw = wordsOf(q.mark); let top = null;
    for (let i = 0; i + n <= toks.length; i++) { const win = toks.slice(i, i + n).join(' '), o = overlap(mw, wordsOf(win)); if (!top || o > top.o) top = { win, o }; }
    if (!top || top.o < 0.6) return { error: `quote "${q.id}": "mark" must be 3 to 12 words copied from its own text ("${best.s.slice(0, 120)}...")` };
    mark = top.win;
  } else mark = best.s.substr(best.s.toLowerCase().indexOf(mark.toLowerCase()), mark.length);
  return { quote: { ...q, text: best.s, mark, source: `Wikipedia: ${best.title}` } };
}
