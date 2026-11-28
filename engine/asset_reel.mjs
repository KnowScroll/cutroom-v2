#!/usr/bin/env node
// fastreel asset_reel: every creative step is MiniMax-M3 (thinking off by default for speed; --effort low|medium|high|max turns adaptive thinking on).
// template -> story writer (engine/writer.mjs: facts, spine, script, test viewer + fact check, revision) -> production plan
// (art direction + storyboard for the finished script) -> style kit -> each asset drawn on its own (with a craft pass on its own render)
// -> voices -> each shot animated from the assets (with a craft pass on its own frames) -> render -> M3 director rounds.
//   node asset_reel.mjs "<brief>" [--template <name> | path/to/template.md] [--effort off] --seconds 45 [--rounds 1] [--out reels/<name>]
// Templates live in templates/: _base.md (every reel) + <name>.md (one kind of reel), split into "## section" blocks.
// Without --template, M3 picks one from each template's "## about".

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { report } from './cost_report.mjs';
import { pathToFileURL } from 'node:url';
import { HERE, VAR, TEMPLATE_DIR, SR, log, sha1, clamp, slugify, stamp, run, pool, withRetry, loadKeys, decodeMono, trimSilence, renderVideo, addSfx, writeWavStereo, extractJson, extractCode, launchStage, BANNED } from './lib.mjs';
import { voiceModel, normVoice, castVoices, voiceGuide, speak, voiceCacheKey, voiceRate, recordRate, voiceCheck, wordTimes, MUSIC_FEELS, pickMusic, mixReel } from './audio.mjs';
import { createWriter, words, numWords, DEVICES, numbersNotInSource, requestOf, padding, shotTimes, silenceOf, rateMoved, lineNoteErrors } from './writer.mjs';
import { findPhotos, snapQuote } from './photos.mjs';
import { fetchArticles, fetchPassages } from './reference.mjs';
import { placeErrors, subjectErrors } from './plan_checks.mjs';

const MODEL = 'MiniMax-M3', PRICE = { in: 0.30, cached: 0.06, out: 1.20 };
const STAGE = pathToFileURL(path.join(HERE, 'engine', 'stage_asset.html')).href;
const argv = process.argv.slice(2), flag = k => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
// --no-assets (A/B test): the plan's assets stay as design notes, nothing is pre-drawn, and every shot draws every character and object itself
const NOASSETS = argv.includes('--no-assets');
// the brief is the first plain argument, or a whole file (--brief-file, for scripts and long briefs)
const brief = flag('--brief-file') ? fs.readFileSync(flag('--brief-file'), 'utf8').trim() : argv.find((a, i) => !a.startsWith('--') && !['--seconds', '--rounds', '--out', '--template', '--effort', '--brief-file', '--until', '--look-images', '--voice-model', '--music-source', '--cut', '--apply-notes'].includes(argv[i - 1]));
const seconds = +(flag('--seconds') || 45), rounds = +(flag('--rounds') || 1), EFFORT = flag('--effort') || 'off';
// --cut <n> names the output <out>-v<n>; --apply-notes <file> restores the checkpoints, applies a director-notes file (applyNotes) and renders that cut
const CUT = +(flag('--cut') || 1), NOTES_FILE = flag('--apply-notes');
// 'off' = thinking disabled: about 4x faster. MiniMax barely honours effort levels (low still thinks thousands of tokens).
// speech budget: Kokoro narrators measured at 2.5 to 2.9 words/s (5 cuts; 2.1 made every reel 10 s short); each shot adds its lead and tail (writer.mjs PAD), each extra line 0.22 s
// voice engine (engine/audio.mjs): eleven-v4 by default (cutroom's bake-off), kokoro for the cheapest; music: library (CC BY, fitted), lyria or synth
const VM = flag('--voice-model') || 'eleven-v4', MUSIC_SOURCE = flag('--music-source') || 'library'; voiceModel(VM);
// spoken words per second of the narrator's voice: measured on past reels (cache/voice/rates.json), else the table in engine/audio.mjs; the budget follows it
const wpsOf = p => voiceRate(VM, normVoice(VM, p?.cast?.narrator?.voice, true)), WPS = wpsOf(null);
// a shot's time beside its words: its lead and tail (the template's checks may set them: "lead: 0.3"), the pause before each extra
// line (0.22 s, or its gap_before), its silent hold; the timeline uses the same times (writer.mjs shotTimes)
const pads = () => padding(TPL ? checks() : {});
const padOf = shots => silenceOf(shots, pads());
const budgetGuess = () => Math.floor((seconds - padOf(Array(7).fill({}))) * WPS); // first guess, assuming 7 one-line shots
const base = path.resolve(flag('--out') || path.join(VAR, 'runs', `${slugify(brief)}-${stamp()}`));
const T0 = performance.now(), calls = [], KEY = loadKeys();
const SFX = ['pop', 'whoosh', 'boom', 'knock', 'splash', 'thunder', 'zap'];
const read = f => fs.readFileSync(path.join(HERE, f), 'utf8');
const prompt = step => read(`engine/prompts/${step}.txt`); // the M3 system prompt of each step

// ---------- templates ----------
const TDIR = TEMPLATE_DIR, SECTIONS = ['about', 'look', 'motion', 'story', 'plan', 'sound', 'assets', 'shots', 'director'];
const parseMd = f => { const o = {}; let cur = null; for (const ln of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { const m = ln.match(/^##\s+(\w+)\s*$/); if (m) cur = o[m[1].toLowerCase()] = []; else if (cur) cur.push(ln); } return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.join('\n').trim()])); };
const templateNames = () => fs.readdirSync(TDIR).filter(f => f.endsWith('.md') && !f.startsWith('_')).map(f => f.slice(0, -3));
let TPL = null; // { name, base, own }
// a template is a name in templates/ or a path to a .md file elsewhere (reference-lab writes its test templates outside the engine)
const tplFile = ref => /\.md$/i.test(ref) ? path.resolve(ref) : path.join(TDIR, `${ref}.md`);
const useTemplate = ref => { TPL = { ref, name: path.basename(ref).replace(/\.md$/i, ''), base: parseMd(path.join(TDIR, '_base.md')), own: parseMd(tplFile(ref)) }; };
// the guide for one step: the named sections, base rules first, then this kind of reel's rules
const guide = (...keys) => `REEL TEMPLATE "${TPL.name}". Follow these directions exactly; they override any general habit.\n\n` + keys.map(k => { const t = [TPL.base[k], TPL.own[k]].filter(Boolean).join('\n\n'); return t ? `## ${k.toUpperCase()}\n${t}` : ''; }).filter(Boolean).join('\n\n');
async function pickTemplate() {
  const names = templateNames(), want = flag('--template');
  if (want && /\.md$/i.test(want)) { if (!fs.existsSync(want)) throw new Error(`no template file ${want}`); return want; }
  if (want) { if (!names.includes(want)) throw new Error(`no template "${want}" in templates/ (have: ${names.join(', ')})`); return want; }
  if (names.length === 1) return names[0];
  const list = names.map(n => `- ${n}: ${parseMd(path.join(TDIR, `${n}.md`)).about || ''}`).join('\n');
  const text = await m3('pick-template', 'You choose which reel template fits a brief best. Reply with only the template name.', [{ role: 'user', content: `Brief: ${brief}\n\nTemplates:\n${list}` }], 8000);
  return names.find(n => text.includes(n)) || names[0];
}
// "## checks" in a template: "key: value" lines the engine and validators enforce (rules M3 skips as prose become rejections)
const checks = () => Object.fromEntries((TPL.own.checks || '').split(/\r?\n/).map(l => l.match(/^\s*-?\s*([a-z ]+?)\s*:\s*(.+?)\s*$/i)).filter(Boolean).map(m => [m[1].toLowerCase(), m[2]]));
const range = s => (s ? s.split(/\s*(?:-|to)\s*/).map(Number) : null);
// "renderer: three" in a template's checks: a 3D reel (engine/stage3d.js). The engine builds the characters (from each character
// asset's look3d), the rooms (from each background's room spec) and the furniture; M3 stages the shots with h.d3 and may build one prop
const D3MODE = () => /^(three|lowpoly)$/i.test(checks().renderer || '');
// "renderer: lowpoly": the PS1 low-poly 3D stage (engine/stage3d_lowpoly.js): flat-shaded models of a few hundred triangles with 64 px
// painted textures, rendered at 270 x 480 with snapped vertices and dither; one host (a low-poly animal in a suit, built by the engine
// from its look3d, a new pose on every sentence) beside the subject, which M3 builds from low-poly parts and the shots slice open
const LPMODE = () => /^lowpoly$/i.test(checks().renderer || '');
const KIT3D = 'function makeKit(h) { return h.d3.kit(); }';
const NOOP_ASSET = 'function drawAsset(ctx, p, h, kit) {}';
// "photos: commons" in a template's checks: a documentary reel with real evidence. The plan names real photos (found on Wikimedia
// Commons and picked by M3 looking at the candidates, engine/photos.mjs) and quotes copied from the reference; shots pin them in
// with h.photo / h.quote, each with its credit or source line, and add footnotes with h.note
const PHOTOMODE = () => /^commons$/i.test(checks().photos || '');
const list = s => (s ? s.split(',').map(x => x.trim().toLowerCase()).filter(Boolean) : []);

// ---------- reference: real facts from Wikipedia, so plan and director do not rely on M3's memory ----------
// M3 names the articles (a search on a long brief returns junk; engine/reference.mjs searches only for a title with no page) and
// engine/reference.mjs fetches their text. No network: the run goes on without it.
async function getReference() {
  const saved = ckLoad('reference.txt'); if (saved !== null) return saved;
  let ref = '';
  try {
    const text = await m3('reference', 'You name English Wikipedia articles. Reply with only a JSON array of exact article titles.', [{ role: 'user', content: `Brief: ${brief}\nName 1 to 3 English Wikipedia articles holding the facts this short reel needs: first the article about the brief's exact subject (the event, person, thing or idea itself, for example the event's own article rather than a general history), then its key person or object if that has its own article (for a procedure, the organ or machine it is done to). Never a generic article about an everyday thing that only appears in the story. Most important first.` }], 400);
    ref = await fetchArticles(JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)).slice(0, 3), { request: requestOf(brief) });
  } catch (e) { log(`reference: skipped (${e.message.slice(0, 80)})`); }
  ref = ref.trim(); log(`reference: ${ref.length} chars`); ckSave('reference.txt', ref); return ref;
}
// the writer's facts step names what the answer needs and the reference lacks: an article (fetched whole, 4000 chars), or an
// article with words to look for (its matching passages); added to the reference once
async function addArticles(needs) {
  let add = '';
  for (const n of needs) {
    const title = typeof n === 'string' ? n : n?.article, words = Array.isArray(n?.look_for) ? n.look_for.filter(w => typeof w === 'string' && w.trim().length > 2).map(w => w.trim()).slice(0, 6) : [];
    const have = `${REF}${add}`; if (title) add += words.length ? await fetchPassages(title, words, { have }) : await fetchArticles([title], { have, firstMax: 0 });
  }
  add = add.trim(); if (add) { REF = `${REF}\n\n${add}`.trim(); ckSave('reference.txt', REF); } return add.length;
}
let REF = '';
const refBlock = () => (REF ? `\n\nREFERENCE (Wikipedia). It wins over your memory: every name, position, size, proportion, shape, date and step in your lines and asset descriptions must agree with it, and a procedure uses its real steps in its order.\n${REF}` : '');

const img = dataUrl => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: dataUrl.split(',')[1] } });

// network-level failures (resets, timeouts) are retried with growing waits; HTTP 4xx errors are not.
// Token Plan limit (error 2056): wait for the quota to come back, checking every 10 minutes for up to 24 hours.
let quotaWaits = 0;
async function netRetry(fn) {
  const waits = [5, 15, 30, 60, 120];
  for (let a = 0; ; a++) {
    try { return await fn(); }
    catch (e) {
      if (e.message.includes('(2056)') && quotaWaits++ < 144) { log('MiniMax Token Plan limit reached; waiting 10 min for quota (finished work is checkpointed)'); await new Promise(r => setTimeout(r, 600000)); a = -1; continue; }
      if (e.noRetry || a >= waits.length) throw e; log(`network/server error (${e.message.slice(0, 80)}); retrying in ${waits[a]}s`); await new Promise(r => setTimeout(r, waits[a] * 1000));
    }
  }
}
// checkpoints: everything finished is saved under <base>-work/ and reused on restart
const WORK = `${base}-work`;
const ckSave = (name, data) => { fs.mkdirSync(WORK, { recursive: true }); fs.writeFileSync(path.join(WORK, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2)); };
const ckLoad = name => { const f = path.join(WORK, name); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };

// Streamed request: bytes keep flowing while M3 thinks. A plain fetch is cut off by Node when no response headers
// arrive within 300 s, and M3 at high effort can think longer than that.
function m3Request(body) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://api.minimax.io/anthropic/v1/messages', { method: 'POST', headers: { Authorization: `Bearer ${KEY.minimax}`, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' } }, res => {
      const out = { content: [{ type: 'text', text: '' }], usage: {}, stop_reason: null }; let buf = '', err = '';
      res.setEncoding('utf8');
      res.on('data', d => {
        if (res.statusCode !== 200) { err += d; return; }
        buf += d;
        for (let i; (i = buf.indexOf('\n')) >= 0;) {
          const ln = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!ln.startsWith('data:')) continue;
          let ev; try { ev = JSON.parse(ln.slice(5)); } catch { continue; }
          if (ev.type === 'message_start') Object.assign(out.usage, ev.message?.usage);
          else if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') out.content[0].text += ev.delta.text;
          else if (ev.type === 'message_delta') { Object.assign(out.usage, ev.usage); out.stop_reason = ev.delta?.stop_reason ?? out.stop_reason; }
          else if (ev.type === 'error') err = JSON.stringify(ev);
        }
      });
      res.on('end', () => {
        if (res.statusCode === 200 && !err) return resolve(out);
        const e = new Error(`MiniMax HTTP ${res.statusCode}: ${err.slice(0, 300)}`); e.noRetry = res.statusCode < 500 && ![200, 429].includes(res.statusCode); reject(e);
      });
      res.on('error', reject);
    });
    req.setTimeout(300000, () => req.destroy(new Error('stream stalled: nothing received for 300 s')));
    req.on('error', reject);
    req.end(JSON.stringify({ ...body, stream: true }));
  });
}

async function m3(step, system, messages, maxTokens = 64000, efforts = [EFFORT]) {
  // if the whole budget goes to thinking with no answer, the next effort in the list (if any) gets one more try
  for (const effort of efforts) {
    const s = performance.now();
    const r = await netRetry(() => m3Request({ model: MODEL, max_tokens: maxTokens, ...(effort === 'off' ? { thinking: { type: 'disabled' } } : { thinking: { type: 'adaptive' }, output_config: { effort } }), system, messages }));
    const text = (r.content || []).filter(b => b.type === 'text').map(b => b.text).join(''), u = r.usage || {};
    calls.push({ step: `${step}${effort === EFFORT ? '' : `@${effort}`}`, input_tokens: u.input_tokens || 0, cached: u.cache_read_input_tokens || 0, output_tokens: u.output_tokens || 0, thinking: u.output_tokens_details?.thinking_tokens || 0, seconds: +((performance.now() - s) / 1000).toFixed(1) });
    ckSave('calls.json', { brief, template: TPL?.name, calls }); // live cost log: a stopped run can still be reported (node engine/cost_report.mjs <out>-work/calls.json)
    log(`${step} [${effort}]: ${u.output_tokens} out (${u.output_tokens_details?.thinking_tokens || 0} thinking), ${calls.at(-1).seconds}s, stop=${r.stop_reason}`);
    if (text.trim() || r.stop_reason !== 'max_tokens') return text;
    log(`${step}: thinking used the whole ${maxTokens}-token budget with no answer`);
  }
  return '';
}
const cost = () => calls.reduce((a, c) => a + (c.input_tokens * PRICE.in + c.cached * PRICE.cached + c.output_tokens * PRICE.out) / 1e6, 0);

// ---------- plan: the writer (engine/writer.mjs) makes the script; the production plan adds the art direction and the storyboard ----------
// the production plan's own checks (the lines, beats, holds and cues are the script's and are not changed here)
function checkProduction(p, story) {
  const E = [];
  if (!p?.style?.palette || !p.style.backgrounds?.length) E.push('style needs a palette and 2 to 5 backgrounds');
  if (!Array.isArray(p?.assets) || p.assets.length < 2 || p.assets.length > 5) E.push(`need 2 to 5 assets (the things that need real craft or appear in several shots; shots draw simple things themselves), got ${p?.assets?.length}`);
  if (!Array.isArray(p?.shots) || p.shots.length !== story.shots.length) E.push(`need exactly ${story.shots.length} shots, one per script shot in order, got ${p?.shots?.length}`);
  if (E.length) return E;
  // a background named by "id" (or inside its set or room spec) instead of "name": take that name (seen: 4 plan rejections in a row)
  p.style.backgrounds.forEach(b => { if (b && !b.name) b.name = b.id || b.set?.name || b.room?.name; });
  if (D3MODE()) E.push(...(LPMODE() ? planLpErrors(p) : plan3dErrors(p)));
  const ids = new Set(p.assets.map(a => a.id)), bgs = new Set(p.style.backgrounds.map(b => b.name));
  p.assets.forEach(a => { if (!(a.w > 0 && a.h > 0)) E.push(`asset ${a.id} needs w and h`); });
  p.shots.forEach((s, i) => {
    if (!s?.idea) E.push(`shot ${i + 1} needs an "idea"`);
    (s?.uses || []).forEach(u => { if (!ids.has(u)) E.push(`shot ${i + 1} uses unknown asset "${u}"`); });
    if (!bgs.has(s?.background)) E.push(`shot ${i + 1} uses unknown background "${s?.background}"; "background" must be exactly the "name" of one of style.backgrounds: ${[...bgs].map(n => JSON.stringify(n)).join(', ')}`);
    if (!['how', 'start', 'end'].every(k => typeof s?.demo?.[k] === 'string' && s.demo[k].trim())) E.push(`shot ${i + 1} needs "demo": {"how", "start", "end"}: how its picture shows its point, its first frame and its last frame`);
    if (!D3MODE() && i < p.shots.length - 1) E.push(...carryErrors(s?.carry, i, ids));
  });
  for (const [id, c] of Object.entries(p.cast || {})) if (c?.asset && !ids.has(c.asset)) E.push(`cast "${id}" is shown by unknown asset "${c.asset}"`);
  E.push(...subjectErrors(p, brief, { d3: D3MODE() }));
  if (PHOTOMODE()) E.push(...evidenceErrors(p, story));
  return E;
}
// a shot's "carry": what is on screen at its end and still there, unchanged, when the next shot starts (validateShot checks both sides)
function carryErrors(carry, i, ids) {
  if (carry == null) return []; if (!Array.isArray(carry)) return [`shot ${i + 1}: "carry" is a list (empty when nothing carries over)`];
  const E = [], num = v => typeof v === 'number' && Number.isFinite(v);
  for (const c of carry) {
    if (c?.label != null) { if (!String(c.label).trim() || !num(c.x) || !num(c.y)) E.push(`shot ${i + 1} carry: a label needs its exact words and numbers x, y (its centre on screen), got ${JSON.stringify(c)}`); continue; }
    if (!ids.has(c?.thing)) { E.push(`shot ${i + 1} carry: "thing" must be an asset id (${[...ids].join(', ')}) or the entry a "label", got ${JSON.stringify(c?.thing)}`); continue; }
    if (!num(c.x) || !num(c.y) || !(num(c.scale) && c.scale > 0)) E.push(`shot ${i + 1} carry "${c.thing}" needs numbers x, y (its centre on screen) and scale (h.asset's scale)`);
    if (c.look != null && (typeof c.look !== 'object' || Array.isArray(c.look))) E.push(`shot ${i + 1} carry "${c.thing}": "look" is an object of its params, such as {"pose": "wave"}`);
  }
  for (const c of carry) if (c?.alpha != null && !(num(c.alpha) && c.alpha > 0 && c.alpha <= 1)) E.push(`shot ${i + 1} carry "${c.thing ?? c.label}": "alpha" is its opacity, above 0 and at most 1 (leave it out for 1)`);
  return E;
}
// photos and quotes of a documentary plan; quotes are snapped to the reference's own words here (p.quotes is fixed in place)
function evidenceErrors(p, story) {
  const E = [], n = story.shots.length, seen = new Set(), okId = id => /^[a-z][a-z0-9_]*$/.test(id || '') && !seen.has(id) && seen.add(id);
  const ph = Array.isArray(p.photos) ? p.photos : [], qs = Array.isArray(p.quotes) ? p.quotes : [];
  if (ph.length < 2 || ph.length > 6) E.push(`need 2 to 6 "photos" (real photographs of the real things the script names), got ${ph.length}`);
  ph.forEach((x, k) => {
    if (!okId(x?.id)) E.push(`photo ${k + 1}: "id" must be a new short_snake_case name`);
    if (!(Number.isInteger(+x?.shot) && +x.shot >= 1 && +x.shot <= n)) E.push(`photo "${x?.id}": "shot" must be a shot number from 1 to ${n}`);
    if (!x?.shows || String(x.shows).split(/ +/).length < 3) E.push(`photo "${x?.id}": "shows" must say what the photograph shows (a real, findable thing)`);
    if (!x?.search || String(x.search).split(/ +/).length > 6) E.push(`photo "${x?.id}": "search" must be 1 to 6 words to search Wikimedia Commons with`);
  });
  if (qs.length > 3) E.push(`at most 3 "quotes", got ${qs.length}`);
  // a photo and a quote in one shot crowd the picture band (e2: a 320x115 photo strip squeezed under a quote, credits over the clipping)
  for (const q of qs) for (const x of ph) if (+q?.shot === +x?.shot) E.push(`shot ${q.shot} has both the photo "${x.id}" and the quote "${q.id}": one piece of evidence per shot; move one of them to another shot (never two photos in a row)`);
  qs.forEach((q, k) => {
    if (!okId(q?.id)) E.push(`quote ${k + 1}: "id" must be a new short_snake_case name`);
    if (!(Number.isInteger(+q?.shot) && +q.shot >= 1 && +q.shot <= n)) E.push(`quote "${q?.id}": "shot" must be a shot number from 1 to ${n}`);
    if (!REF) { E.push('there is no REFERENCE to quote: leave "quotes" empty'); return; }
    const r = snapQuote(q || {}, REF); if (r.error) E.push(r.error); else qs[k] = r.quote;
  });
  return E;
}
// a 3D plan: every background has a room spec, every character a look3d, at most one non-character asset (a prop with a size in metres)
const ROOM_PROPS = ['door', 'window', 'clock', 'shelf', 'calendar', 'frame', 'poster', 'cabinet', 'shelf_unit', 'lockers', 'plant', 'board', 'tv', 'counter_back', 'fridge', 'sink'];
const HAIRS = ['none', 'short', 'long', 'bun', 'puffs'];
function plan3dErrors(p) {
  const E = [], pal = p.style?.palette || {}, colOk = c => c == null || c === '' || pal[c] != null || /^#[0-9a-f]{3,8}$/i.test(String(c));
  const badCol = (where, o, keys) => keys.forEach(k => { if (o && !colOk(o[k])) E.push(`${where}: "${k}": "${o[k]}" is not a palette name (${Object.keys(pal).join(', ')}) or a hex colour`); });
  for (const b of p.style?.backgrounds || []) {
    const r = b.room; if (!r || typeof r !== 'object') { E.push(`background "${b.name}" needs "room": {"upper", "lower", "floor", "lamp", "props": [...]} (this is a 3D reel: the engine builds the room from it)`); continue; }
    badCol(`background "${b.name}" room`, r, ['upper', 'lower', 'rail', 'floor_colour', 'rug', 'lamp', 'ceiling']);
    if (r.floor && !['wood', 'tile', 'carpet'].includes(r.floor)) E.push(`background "${b.name}" room "floor" must be wood, tile or carpet`);
    const bad = (r.props || []).filter(x => !ROOM_PROPS.includes(x)); if (bad.length) E.push(`background "${b.name}" room props ${bad.join(', ')} are unknown; room props are: ${ROOM_PROPS.join(', ')} (furniture people stand at, sit on or put things on is placed by the shots, not the room)`);
    if ((r.props || []).length > 7) E.push(`background "${b.name}" has ${r.props.length} room props; at most 7 fit the back wall`);
  }
  const chars = (p.assets || []).filter(a => a.kind === 'character'), others = (p.assets || []).filter(a => a.kind !== 'character');
  if (!chars.length) E.push('a 3D reel needs at least one character asset (kind "character") with a "look3d"');
  if (others.length > 1) E.push(`at most ONE non-character asset in a 3D reel (the one object the story turns on); got ${others.map(a => a.id).join(', ')}. Furniture and small props (counter, desk, table, chair, computer, laptop, phone, paper, mug, pizza_box, coins, cash, box, bag ...) are built in`);
  for (const a of chars) {
    const L = a.look3d; if (!L || typeof L !== 'object') { E.push(`character "${a.id}" needs "look3d": {"shirt", "cap" or "hair", ...} (the engine builds the 3D character from it)`); continue; }
    const chk = (where, o) => { badCol(where, o, ['skin', 'shirt', 'jacket', 'tie', 'cap', 'hair_colour', 'shoes']); if (o.hair && !HAIRS.includes(o.hair)) E.push(`${where}: "hair" must be one of ${HAIRS.join(', ')}`); };
    chk(`character "${a.id}" look3d`, L);
    for (const [r, o] of Object.entries(L.roles || {})) { if (!/^[a-z][a-z0-9_]*$/.test(r)) E.push(`character "${a.id}" role "${r}" must be short_snake_case`); chk(`character "${a.id}" role "${r}"`, o || {}); }
  }
  for (const a of others) if (!Array.isArray(a.size) || a.size.length !== 3 || !a.size.every(v => +v > 0 && +v < 4)) E.push(`asset "${a.id}" needs "size": [width, height, depth] in metres (a desk is [1.4, 0.7, 0.7], a phone [0.08, 0.15, 0.02])`);
  return E;
}
// a low-poly plan: every background has a set spec, ONE character (the host) with a look3d, one or two subjects with a size and named inside parts
const LP_SETS = { outdoor: ['fence', 'pines', 'house', 'bushes', 'bins', 'hills'], room: ['window', 'door', 'plant', 'shelf', 'sofa', 'rug', 'lamp', 'frame', 'clock'], studio: [] };
const LP_LOOK = { ears: ['pointy', 'round', 'long', 'none'], snout: ['short', 'long', 'beak', 'flat'], tail: ['none', 'bushy', 'thin', 'stub'] };
function planLpErrors(p) {
  const E = [], pal = p.style?.palette || {}, colOk = c => c == null || c === '' || pal[c] != null || /^#[0-9a-f]{3,8}$/i.test(String(c));
  const badCol = (where, o, keys) => keys.forEach(k => { if (o && !colOk(o[k])) E.push(`${where}: "${k}": "${o[k]}" is not a palette name (${Object.keys(pal).join(', ')}) or a hex colour`); });
  for (const b of p.style?.backgrounds || []) {
    const st = b.set; if (!st || typeof st !== 'object' || !LP_SETS[st.kind]) { E.push(`background "${b.name}" needs "set": {"kind": "outdoor" | "studio" | "room", ...} (this is a low-poly 3D reel: the engine builds the set from it)`); continue; }
    badCol(`background "${b.name}" set`, st, ['ground', 'wall', 'wall2', 'floor', 'house', 'roof', 'hills', 'rug', 'sofa', 'view']);
    for (const c of [].concat(st.sky || [])) if (!colOk(c)) E.push(`background "${b.name}" set "sky": "${c}" is not a palette name or a hex colour`);
    const bad = (st.props || []).filter(x => !LP_SETS[st.kind].includes(x)); if (bad.length) E.push(`background "${b.name}" (${st.kind}) props ${bad.join(', ')} are unknown; ${st.kind} props are: ${LP_SETS[st.kind].join(', ') || 'none'}`);
  }
  const chars = (p.assets || []).filter(a => a.kind === 'character'), others = (p.assets || []).filter(a => a.kind !== 'character');
  if (chars.length !== 1) E.push(`a low-poly reel has exactly ONE character asset, the host (kind "character" with a "look3d"); got ${chars.length}`);
  if (p.assets?.[0]?.kind !== 'character') E.push('list the host FIRST in "assets", then the subject(s)');
  for (const a of chars) {
    const L = a.look3d; if (!L || typeof L !== 'object') { E.push(`the host "${a.id}" needs "look3d": {"ears", "snout", "fur", "jacket", ...} (the engine builds it from that)`); continue; }
    badCol(`host "${a.id}" look3d`, L, ['fur', 'fur2', 'mask', 'eye', 'jacket', 'shirt', 'tie', 'tie2', 'trousers', 'shoes', 'hands', 'beak']);
    for (const [k, vals] of Object.entries(LP_LOOK)) if (L[k] != null && !vals.includes(L[k])) E.push(`host "${a.id}" look3d "${k}" must be one of ${vals.join(', ')}`);
  }
  if (others.length < 1 || others.length > 2) E.push(`one or two subject assets (the things the reel slices open), got ${others.length}`);
  for (const a of others) {
    if (!Array.isArray(a.size) || a.size.length !== 3 || !a.size.every(v => +v > 0 && +v <= 3.5)) E.push(`subject "${a.id}" needs "size": [width, height, depth] in metres, at most 3.5 (the host is 1.3 m tall; a model of a small thing is scaled up to read)`);
    if (!Array.isArray(a.parts) || a.parts.length < 2 || a.parts.length > 6 || !a.parts.every(x => typeof x === 'string' && x.trim())) E.push(`subject "${a.id}" needs "parts": 2 to 6 names of the parts INSIDE it that the shots reveal and label (short real names)`);
  }
  return E;
}
const writer = () => createWriter({ brief, seconds, budget: budgetGuess(), m3, prompt, guide, checks, range, list, ckSave, ckLoad, log, extractJson, refBlock, hasRef: () => !!REF, addArticles, numbersNotIn,
  voiceGuide: voiceGuide(VM), voiceModel: voiceModel(VM).id, feels: MUSIC_FEELS, wpsOf, padOf });
// the production plan: style, assets, backgrounds and a storyboard for each shot of the finished script, merged with it
async function productionPlan(story) {
  const script = story.shots.map((s, i) => ({ shot: i + 1, beat: s.beat, point: s.point, device: s.device, link: s.link, lines: s.lines.map((l, k) => `${k}. ${l.who}: ${l.text}`), cue: s.cue, see: s.see, ...(s.hold ? { hold_s: s.hold } : {}) }));
  const facts = (story.facts || []).map(f => `${f.id}: ${f.text}`).join('\n'), speakers = Object.keys(story.cast || {}).filter(k => k !== 'narrator');
  const messages = [{ role: 'user', content: `Brief: ${brief}\nTitle: ${story.title}${story.question ? `\nThe question the reel answers: ${story.question}\nThe answer: ${story.answer}` : ''}\nSpeakers besides the narrator: ${speakers.join(', ') || 'none'}\n\nSCRIPT (final; line numbers are the line indexes for sfx)\n${JSON.stringify(script, null, 1)}${facts ? `\n\nFACT SHEET\n${facts}` : ''}\n\nReturn only the JSON object.` }];
  for (let a = 1; a <= 4; a++) {
    const text = await m3(`plan#${a}`, `${prompt('plan')}${D3MODE() ? `\n\n${prompt(LPMODE() ? 'plan3dlp' : 'plan3d')}` : ''}${PHOTOMODE() ? `\n\n${prompt('planphotos')}` : ''}\n\n${guide('about', 'look', 'motion', 'plan', 'sound', 'assets', 'shots')}${refBlock()}`, messages);
    let p, E, plan = null; try { p = extractJson(text); E = checkProduction(p, story); } catch (e) { E = [e.message]; }
    if (!E.length) { plan = mergePlan(story, p); if (checks().places === 'wikipedia') E = await placeErrors(plan); }
    if (!E.length) return plan;
    log(`plan rejected: ${E.slice(0, 4).join('; ')}`);
    messages.push({ role: 'assistant', content: text || '(empty)' }, { role: 'user', content: `Fix these problems and return the complete JSON:\n- ${E.join('\n- ')}` });
  }
  throw new Error('no usable plan');
}
// the shots keep the script's line objects (the voice may already be attaching its clips to them)
function mergePlan(story, p) {
  const voices = castVoices(VM, story.cast), cast = Object.fromEntries(Object.keys(story.cast).map(id => [id, { voice: voices[id], asset: id === 'narrator' ? null : (p.cast?.[id]?.asset || null) }]));
  const shots = story.shots.map((s, i) => { const q = p.shots[i]; return { ...s, idea: q.idea, background: q.background, uses: q.uses || [], sfx: (q.sfx || []).filter(f => SFX.includes(f.kind) && Number.isInteger(f.line) && f.line < s.lines.length),
    ...(q.demo ? { demo: q.demo } : {}), ...(!D3MODE() && i < p.shots.length - 1 && q.carry?.length ? { carry: q.carry } : {}) }; });
  const evidence = PHOTOMODE() ? { photos: (p.photos || []).map(x => ({ id: x.id, shot: +x.shot, shows: x.shows, search: x.search, also: x.also, label: x.label })), quotes: (p.quotes || []).map(q => ({ id: q.id, shot: +q.shot, text: q.text, mark: q.mark, source: q.source })) } : {};
  return { title: story.title, music: story.music, ...(story.question ? { story: { question: story.question, answer: story.answer, payoff: story.payoff, facts: story.facts } } : {}), subject: p.subject, style: p.style, cast, assets: p.assets, shots, ...evidence };
}
const planJson = plan => JSON.stringify(plan, (k, v) => (k === '_clip' ? undefined : v), 2);

// ---------- generic make -> validate -> repair -> craft pass ----------
// forbidden browser globals, looked for in code only: "// the bedroom window" or a 'window' string is fine, and so is a
// variable the code declares itself (const window = ...); comic rooms made M3 trip over "window" a dozen times per reel
const codeOnly = c => c.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ').replace(/(['"`])(?:\\.|(?!\1)[^\\])*?\1/g, '""');
const bannedIn = c => { const s = codeOnly(c); for (const m of s.matchAll(new RegExp(BANNED.source, 'g'))) if (!new RegExp(`\\b(const|let|var|function)\\s+${m[0].replace('.', '\\.')}\\b`).test(s)) return m[0]; return null; };
// --look-images a.jpg,b.jpg: frames of a reference reel shown to the kit, asset and shot steps as the look to match (reference-lab test 3)
const LOOK_IMAGES = (flag('--look-images') || '').split(',').filter(Boolean).map(f => img(`data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}`));
const LOOK_NOTE = 'Reference frames from the reel whose LOOK to match: drawing style, pixel size, outlines, shading, texture, palette relations, type and UI. Match the look only. Never copy its subject, objects, text, numbers, handles or layout.';
async function make(label, system, firstUser, validate, craftAsk, prevCode = null) {
  const look = LOOK_IMAGES.length && /^(kit|asset:|shot\d)/.test(label) && !label.endsWith('-rev');
  const messages = [{ role: 'user', content: look ? [{ type: 'text', text: firstUser }, { type: 'text', text: LOOK_NOTE }, ...LOOK_IMAGES] : firstUser }];
  let code = null, res = null, lastRunnable = null;
  for (let a = 1; a <= 3; a++) {
    const text = await m3(`${label}#${a}`, system, messages);
    const c = extractCode(text), bad = bannedIn(c);
    res = bad ? { ok: false, errors: [`uses the forbidden browser global "${bad}" in code (comments and strings are fine; the page has no ${bad} for you)`] } : await validate(c);
    log(`${label} attempt ${a}: ${res.ok ? 'valid' : 'rejected: ' + res.errors.slice(0, 3).join('; ')}`);
    if (res.ok) { code = c; messages.push({ role: 'assistant', content: text }); break; }
    if (c && !res.errors.some(e => /SyntaxError|runtime error|crashed|not defined|is not a function|nearly blank|forbidden browser global/i.test(e))) lastRunnable = { code: c, errors: res.errors };
    messages.push({ role: 'assistant', content: text || '(empty)' }, { role: 'user', content: `The validator rejected it:\n- ${res.errors.join('\n- ')}\nReturn the complete corrected code.` });
  }
  if (!code && !prevCode && lastRunnable) log(`${label}: no attempt passed every check; using the last one that runs (it failed: ${lastRunnable.errors.slice(0, 2).join('; ').slice(0, 200)})`);
  if (!code && prevCode) { // a redraw that never passed is never silent (27 of 164 redraws kept the old code unannounced, findings §P)
    // the old code is checked against the step as it is now (its lines may have changed): kept while it still passes (the note is
    // not applied: a rejection the review reads), else it ships failing in the line the shipped_failing gate counts, replaced by the
    // last attempt that runs if there is one
    const bad = bannedIn(prevCode), old = bad ? { ok: false, errors: [`uses the forbidden browser global "${bad}" in code`] } : await validate(prevCode);
    const errs = es => es.slice(0, 2).join('; ').replace(/\s+/g, ' ').slice(0, 200), tried = errs((lastRunnable || res).errors);
    if (old.ok) { log(`${label} rejected: no redraw passed every check (${tried}), so the note is not applied; the previous code still passes and is kept`); return { code: prevCode, preview: null, crafted: false }; }
    log(`${label}: no attempt passed every check; using the last one that runs (it failed: ${lastRunnable ? `${tried}; the previous code fails too: ${errs(old.errors)}` : `the previous code is kept and fails now: ${errs(old.errors)}`})`);
    return { code: lastRunnable ? lastRunnable.code : prevCode, preview: null, crafted: false };
  }
  if (!code) return { code: lastRunnable?.code || null, preview: null, crafted: false };
  if (craftAsk && res.preview && !label.endsWith('-rev')) { // craft pass: the model looks at its own render and improves it (not on director revisions: the director's notes are that review)
    messages.push({ role: 'user', content: [{ type: 'text', text: craftAsk }, img(res.preview), { type: 'text', text: 'If it already meets the craft guide fully, reply with just KEEP. Otherwise return the complete improved code.' }] });
    const text = await m3(`${label}-craft`, system, messages);
    if (!/^\s*KEEP\s*$/i.test(text.replace(/```[a-z]*|```/g, '').trim()) && /function\s/.test(text)) {
      const check = async c => { const bad = bannedIn(c); return bad ? { ok: false, errors: [`uses the forbidden browser global "${bad}" in code (comments and strings are fine)`] } : validate(c); };
      let c = extractCode(text), r2 = await check(c);
      if (!r2.ok) { // one repair try, so a good improvement is not thrown away over one slip
        log(`${label} craft pass rejected (${r2.errors[0]}), one repair try`);
        messages.push({ role: 'assistant', content: text }, { role: 'user', content: `The validator rejected your improved version:\n- ${r2.errors.join('\n- ')}\nKeep the improvements, fix only this, and return the complete corrected code.` });
        const t2 = await m3(`${label}-craftfix`, system, messages);
        if (/function\s/.test(t2)) { c = extractCode(t2); r2 = await check(c); }
      }
      log(`${label} craft pass: ${r2.ok ? 'improved' : 'improvement rejected (' + r2.errors[0] + '), keeping first version'}`);
      if (!r2.ok) ckSave(`rejected_${label.replace(/[^w-]+/g, '_')}.js`, c); // kept for diagnosing validator rejections
      if (r2.ok) return { code: c, preview: r2.preview, crafted: true };
    } else log(`${label} craft pass: KEEP`);
  }
  return { code, preview: res.preview, crafted: false };
}

function mouthEnv(pcm) {
  const hop = Math.round(SR / 30), n = Math.ceil(pcm.length / hop), rms = new Float32Array(n);
  for (let f = 0; f < n; f++) { let s = 0, c = 0; for (let i = f * hop; i < Math.min(pcm.length, (f + 1) * hop); i++) { s += pcm[i] * pcm[i]; c++; } rms[f] = Math.sqrt(s / Math.max(1, c)); }
  const mx = Math.max(...rms) || 1, env = []; let open = 0;
  for (let f = 0; f < n; f++) { const v = rms[f] / mx; open = open ? (v > 0.12 ? 1 : 0) : (v > 0.2 ? 1 : 0); env.push(open); }
  return env;
}
let speechUsd = 0, voiceStats = null;
async function voiceAll(plan) {
  const cacheDir = path.join(VAR, 'cache', 'voice'); fs.mkdirSync(cacheDir, { recursive: true });
  const voices = castVoices(VM, plan.cast); for (const [id, c] of Object.entries(plan.cast || {})) c.voice = voices[id]; // a restored plan may name another engine's voices
  const all = plan.shots.flatMap(s => s.lines);
  const clips = await pool(all.map(ln => async () => {
    const voice = plan.cast[ln.who]?.voice || normVoice(VM, null, ln.who === 'narrator'), file = path.join(cacheDir, `${sha1(voiceCacheKey(VM, voice, ln.tone, ln.text))}.mp3`);
    const wordsFile = file.replace(/\.mp3$/, '.words.json'); // ElevenLabs character timings, kept beside the cached clip
    if (!fs.existsSync(file)) { const r = await withRetry(() => speak(KEY.openrouter, VM, ln.text, voice, ln.tone), 5); fs.writeFileSync(file, r.buf); if (r.align) fs.writeFileSync(wordsFile, JSON.stringify(r.align)); speechUsd += r.usd; }
    const pcm = await decodeMono(file), { start, end } = trimSilence(pcm), cut = pcm.subarray(start, end), dur = cut.length / SR;
    let align = null; try { if (fs.existsSync(wordsFile)) align = JSON.parse(fs.readFileSync(wordsFile, 'utf8')); } catch { }
    const wt = wordTimes(ln.text, align, start / SR, dur);
    return { pcm: cut, dur, env: mouthEnv(cut), voice, words: wt.words, timed: wt.measured };
  }), /eleven/i.test(voiceModel(VM).id) ? 2 : 3);
  let k = 0; plan.shots.forEach(s => s.lines.forEach(l => { l._clip = clips[k++]; }));
  log(`voice: word timings measured for ${clips.filter(c => c.timed).length} of ${clips.length} lines (the rest by letter share)`);
  // measured, not guessed (cutroom voice_check.py): the speaking rate per voice feeds the next word budget; the narrator's pitch spread is gated at 4 semitones
  const byVoice = {};
  all.forEach(l => { const b = byVoice[l._clip.voice] ||= { words: 0, secs: 0, pcm: [] }; b.words += words(l.text); b.secs += l._clip.dur; b.pcm.push(l._clip.pcm); });
  for (const [v, b] of Object.entries(byVoice)) recordRate(VM, v, b.words, b.secs);
  const nv = byVoice[plan.cast.narrator?.voice] ? plan.cast.narrator.voice : Object.keys(byVoice)[0], nb = byVoice[nv];
  if (nb) {
    const cat = new Float32Array(nb.pcm.reduce((a, x) => a + x.length, 0)); let o = 0; for (const x of nb.pcm) { cat.set(x, o); o += x.length; }
    voiceStats = { model: voiceModel(VM).id, voice: nv, words_per_s: +(nb.words / nb.secs).toFixed(2), ...voiceCheck(cat) };
    const ok = voiceStats.pitch_st_sd == null || voiceStats.pitch_st_sd >= 4;
    log(`voice: ${voiceStats.model} ${nv}, ${voiceStats.words_per_s} words/s, pitch spread ${voiceStats.pitch_st_sd} st (gate >= 4; 3.5 for a calm style): ${ok ? 'PASS' : 'LOW (flat delivery: change the tones or the voice)'}, loudness range ${voiceStats.loud_range_db} dB`);
  }
}
function timeline(plan) {
  let t = 0; const pad = pads();
  const shots = plan.shots.map((s, k) => {
    const st = shotTimes(s, s.lines.map(l => l._clip.dur), pad, k === plan.shots.length - 1);
    const lines = s.lines.map((l, i) => {
      const c = l._clip, lt = st.lines[i].start;
      return { who: l.who, text: l.text, start: +lt.toFixed(3), end: +(lt + c.dur).toFixed(3), env: c.env, ...(c.words ? { words: c.words.map(([w, a, b]) => ({ w, start: +(lt + a).toFixed(3), end: +(lt + b).toFixed(3) })) } : {}) };
    });
    const o = { start: +t.toFixed(3), dur: +st.dur.toFixed(3), lines, code: s.code, background: s.background, ...(s.cue?.word ? { cue: s.cue.word } : {}) }; t += o.dur; return o;
  });
  // "host zoom: 0.03" in a template's checks: the host's slow push-in over each shot (stage_asset.html render; off by default)
  return { W: 1080, H: 1920, fps: 30, total: +t.toFixed(3), pixel: +checks()['pixel grid'] || 0, captions: checks().captions || '', zoom: +checks()['host zoom'] || 0, kit: plan.kit, assets: plan.assets.map(a => ({ id: a.id, w: a.w, h: a.h, code: a.code, poses: a.poses ? a.poses.map(p => p.name) : null })), shots, ...(D3MODE() ? { d3: d3Data(plan) } : {}), ...(PHOTOMODE() ? { photos: photoData(plan), quotes: plan.quotes || [] } : {}) };
}
// the found photos as JPEG bytes for the stage (it never touches the network), read once
const PHOTO_B64 = {};
const photoData = plan => (plan.pics || []).filter(p => p.file && fs.existsSync(path.join(WORK, p.file))).map(p => ({ id: p.id, credit: p.credit, focus: p.focus, b64: (PHOTO_B64[p.file] ||= fs.readFileSync(path.join(WORK, p.file)).toString('base64')) }));
async function getPhotos(plan) {
  const saved = ckLoad('photos.json'); if (saved) { plan.pics = JSON.parse(saved); log(`photos: ${plan.pics.length} restored from checkpoint`); return; }
  try { plan.pics = await findPhotos(plan.photos || [], WORK, { m3, img, extractJson }); }
  catch (e) { log(`photos: search failed (${e.message.slice(0, 100)}); the shots draw everything`); plan.pics = []; }
  ckSave('photos.json', plan.pics); log(`photos: ${plan.pics.length} of ${(plan.photos || []).length} found`);
}
function d3Data(plan) {
  return { mode: LPMODE() ? 'lowpoly' : 'three', style: { font: plan.style.font, palette: plan.style.palette, backgrounds: plan.style.backgrounds },
    cast: Object.fromEntries(plan.assets.filter(a => a.kind === 'character').map(a => [a.id, { kind: a.kind, look3d: a.look3d || {} }])),
    props: Object.fromEntries(plan.assets.filter(a => a.kind !== 'character').map(a => [a.id, { kind: a.kind, size: a.size, parts: a.parts, code: a.code }])) };
}
const kitApi = plan => `Style kit API (kit): kit.palette = ${JSON.stringify(plan.style.palette)}; kit.font(size, weight); kit.bg(ctx, lt, name) with names ${plan.style.backgrounds.map(b => `"${b.name}"`).join(', ')}; kit.panel(ctx, x, y, w, hgt, {accent, alpha}); kit.title(ctx, text, x, y, {size, align, color, k}) where x, y is the CENTRE of the text line (so put it at its panel's centre) and k = seconds since this text appeared (lt minus the moment it appears; it drives the entrance, and a negative k hides it): leave k out for text that is simply shown, never pass a constant 0 or a word; kit.post is applied by the host.`;
const kitApi3d = plan => `Style kit API (kit), for the 2D layer drawn AFTER h.d3.render(): kit.palette = ${JSON.stringify(plan.style.palette)}; kit.font(size, weight); kit.panel(ctx, x, y, w, hgt, {accent, alpha}) draws a paper (default) or, with accent: a palette colour, a screen; kit.title(ctx, text, x, y, {size, color, align, k}) draws text only, centred on x, y (k = seconds since it appeared; leave k out to simply show it). Rooms (h.d3.room): ${plan.style.backgrounds.map(b => `"${b.name}"`).join(', ')}.`;
const cast3d = plan => plan.assets.map(a => a.kind === 'character' ? { actor: a.id, description: a.description, ...(LPMODE() ? {} : { roles: Object.keys(a.look3d?.roles || {}) }) } : { thing: a.id, description: a.description, size_m: a.size, ...(LPMODE() ? { inside_parts: a.parts } : {}) });
const kitApiLp = plan => `Style kit API (kit), for the 2D layer drawn AFTER h.d3.render(): kit.palette = ${JSON.stringify(plan.style.palette)}; kit.header(ctx, n, total, text, {k}) draws the step header at the top left ("n/total" in the accent colour, then the text in white with a dark outline, wrapped to two lines; total 0 shows n alone); kit.title(ctx, text, x, y, {size, color, align, k}) draws outlined text centred on x, y; kit.panel(ctx, x, y, w, hgt) draws a wooden sign board (only with text on it); k = seconds since the text appeared (leave it out to simply show it). Sets (h.d3.set): ${plan.style.backgrounds.map(b => `"${b.name}" (${b.set?.kind || 'studio'})`).join(', ')}.`;
// what the script asks of a shot (writer): the point the picture must make, its device, the word its change lands on, its silent hold
// and the plan's demonstration (first and last frame) and what carries over each cut (prev: the shot before)
const carried = list => (list || []).map(c => `${c.label != null ? `the label "${c.label}" centred at x ${c.x}, y ${c.y}` : `h.asset('${c.thing}', ${c.x}, ${c.y}, ${c.scale}${c.look && Object.keys(c.look).length ? `, ${JSON.stringify(c.look)}` : ''})`}${c.alpha != null && c.alpha < 1 ? ` at opacity ${c.alpha}` : ''}`).join('; ');
const shotStory = (s, prev) => [s.point && `Point (the claim the picture must make the viewer understand): ${s.point}`, s.device && `Device: ${s.device}${DEVICES[s.device] ? ` (${DEVICES[s.device]})` : ''}`,
  s.demo && `Demonstration: ${s.demo.how}\nFirst frame: ${s.demo.start}\nLast frame: ${s.demo.end}`,
  prev?.carry?.length && `Carried in from the shot before (it ends this way, so the cut must not jump): your first frame (lt = 0) already shows ${carried(prev.carry)}, in full, with no entrance; change them only after that, as the storyboard says. x, y and scale are on screen, after any camera move`,
  s.carry?.length && `Carried into the next shot (it starts this way): your last frame shows ${carried(s.carry)}, in full. x, y and scale are on screen, after any camera move`,
  s.cue?.word && `Cue: on the word "${s.cue.word}" (h.cue(${JSON.stringify(s.cue.word)})): ${s.cue.show || ''}`, s.hold && `Hold: ${s.hold} s of silent screen time after the last line: the payoff stays on screen, still and readable`].filter(Boolean).map(x => `\n${x}`).join('');
// the narrator's sentences of a shot with times from the timeline's lines (the same split as h.d3.sentences() on the stage)
function sentencesOfShot(sh) {
  const out = [];
  for (const ln of sh.lines || []) {
    if (ln.who !== 'narrator') continue;
    const ws = ln.words?.length ? ln.words.map(w => ({ w: w.w, s: w.start, e: w.end })) : (() => { const t = String(ln.text).split(/\s+/).filter(Boolean), tot = t.reduce((a, w) => a + w.length + 1, 0); let acc = 0; return t.map(w => { const s = ln.start + (ln.end - ln.start) * acc / tot; acc += w.length + 1; return { w, s, e: ln.start + (ln.end - ln.start) * acc / tot }; }); })();
    let cur = []; ws.forEach((w, i) => { cur.push(w); if (/[.!?]["')]?$/.test(w.w) || i === ws.length - 1) { out.push({ text: cur.map(x => x.w).join(' '), start: +cur[0].s.toFixed(2), end: +cur.at(-1).e.toFixed(2) }); cur = []; } });
  }
  return out;
}
const assetCatalog = plan => plan.assets.map(a => ({ id: a.id, kind: a.kind, description: a.description, box: `${a.w}x${a.h}`, animated: !!a.animated, params: a.params || [], ...(a.poses ? { poses: a.poses.map(p => `${p.name}: ${p.look}`) } : {}) }));

// validate a drawing; if its ONLY fault is spilling outside its declared box, refit the box to what it really draws (+8%)
// instead of asking for a redraw: the box is just a size label for placing it, and M3 often guesses it wrong for lying poses
const fitValidate = (page, a, plan) => async c => {
  const run = spec => page.evaluate((code, sp, kit) => window.validateAsset(code, sp, kit), c, spec, plan.kit);
  const r = await run(a), outside = x => !x.ok && x.ext && x.errors.every(e => /^in state .* it draws from x/.test(e));
  if (!outside(r)) return r;
  // only a size error is refitted: a drawing whose centre lies outside its box is misplaced (drawn in frame coordinates),
  // and growing the box around (0, 0) to reach it made a 760 px figure box 6411 px tall; that goes back to M3 to move
  const cx = (r.ext.x0 + r.ext.x1) / 2, cy = (r.ext.y0 + r.ext.y1) / 2;
  if (Math.abs(cx) > a.w / 2 || Math.abs(cy) > a.h / 2) return r;
  // a drawing far bigger than its box is cut off at the canvas edge while measured, so refit up to 3 times
  let spec = a, cur = r;
  for (let k = 0; k < 3 && outside(cur); k++) {
    const w = Math.ceil(2 * Math.max(Math.abs(cur.ext.x0), Math.abs(cur.ext.x1)) * 1.08), h = Math.ceil(2 * Math.max(Math.abs(cur.ext.y0), Math.abs(cur.ext.y1)) * 1.08);
    spec = { ...spec, w: Math.max(spec.w, w), h: Math.max(spec.h, h) }; cur = await run(spec);
  }
  // more than 2.5x the PLAN's box is a wrong drawing, not a wrong label (counted from the first box: each revision used to
  // refit again from the last one, so a lighthouse grew 1180 -> 1707 -> 2483 -> 3415 px and swamped every shot)
  const w0 = (a.w0 ||= a.w), h0 = (a.h0 ||= a.h);
  if (!cur.ok || spec.w > w0 * 2.5 || spec.h > h0 * 2.5) return r;
  log(`asset ${a.id}: box refit ${a.w}x${a.h} -> ${spec.w}x${spec.h} (the drawing was fine, its box was too small)`);
  a.w = spec.w; a.h = spec.h; return cur;
};

// numbers on screen or in a fact that the reference and the brief never state (engine/writer.mjs numbersNotInSource: digits without
// separators, a magnitude by value so "1 million" matches "a million", a full date as one unit; one-digit numbers alone pass)
function numbersNotIn(texts) { return numbersNotInSource(`${REF || ''} ${requestOf(brief)}`, texts); } // the intake's Goal lines are no source
// ---------- poses: after the storyboard, M3 lists only the body poses each character's shots need ----------
async function planPoses(plan) {
  const saved = ckLoad('poses.json'); if (saved) { log('poses: restored from checkpoint'); return JSON.parse(saved); }
  const chars = plan.assets.filter(a => a.kind === 'character');
  const user = `Characters: ${JSON.stringify(chars.map(a => ({ id: a.id, description: a.description, planned_box: `${a.w}x${a.h}` })))}\n\nShots: ${JSON.stringify(plan.shots.map((s, i) => ({ shot: i + 1, idea: s.idea, uses: s.uses, lines: s.lines.map(l => `${l.who}: ${l.text}`) })))}\n\nReturn only the JSON object.`;
  const messages = [{ role: 'user', content: user }];
  for (let a = 1; a <= 3; a++) {
    const text = await m3(`poses#${a}`, prompt('poses'), messages, 8000);
    let P, E = [];
    try {
      P = extractJson(text);
      for (const c of chars) {
        const e = P[c.id];
        if (!e?.poses?.length) { E.push(`no poses for "${c.id}"`); continue; }
        if (e.poses.length > 6) E.push(`"${c.id}" has ${e.poses.length} poses (${e.poses.map(p => p.name).join(', ')}); merge the ones whose BODY looks alike (expression, eyes and mouth are separate params, so happy and sad versions of one body are one pose; furniture is not part of a pose) to at most 6`);
        if (!(e.box?.w > 0 && e.box?.h > 0)) E.push(`"${c.id}" needs "box": {"w", "h"}`);
        e.poses.forEach(p => { if (!/^[a-z][a-z0-9_]*$/.test(p.name || '')) E.push(`pose name "${p.name}" must be short_snake_case`); });
      }
    } catch (e) { E = [e.message]; }
    if (!E.length) { ckSave('poses.json', P); log(`poses: ${chars.map(c => `${c.id} ${P[c.id].poses.map(p => p.name).join(', ')}`).join(' | ')}`); return P; }
    log(`poses rejected: ${E.slice(0, 3).join('; ')}`);
    messages.push({ role: 'assistant', content: text || '(empty)' }, { role: 'user', content: `Fix these and return the complete JSON:\n- ${E.join('\n- ')}` });
  }
  // still too many after 3 tries: keep the first 6 per character (listed most-used first; shots pick the closest, the stage names the available poses)
  try { const P = extractJson(messages.at(-2).content); for (const c of chars) if (P[c.id]?.poses?.length > 6) P[c.id].poses = P[c.id].poses.slice(0, 6); if (chars.every(c => P[c.id]?.poses?.length && P[c.id].box?.w > 0)) { ckSave('poses.json', P); log('poses: kept the first 6 per character'); return P; } } catch { }
  log('poses: no usable list; characters keep their planned params'); return {};
}
// the pose list becomes the asset's "pose" param, its preview states (every pose is drawn and checked) and its box
function applyPoses(plan, P) {
  for (const a of plan.assets) {
    const e = P[a.id]; if (!e?.poses?.length) continue;
    const kept = ckLoad(`asset_${a.id}.poses.json`); // a resumed run keeps the poses its saved drawing actually has
    a.poses = (kept ? JSON.parse(kept) : e.poses).map(p => ({ name: p.name, look: p.look, shots: p.shots }));
    if (e.box?.w > 0 && e.box?.h > 0) { a.w = Math.round(e.box.w); a.h = Math.round(e.box.h); }
    a.params = [{ name: 'pose', type: 'string', description: `one of: ${a.poses.map(p => p.name).join(', ')}` }, ...(a.params || []).filter(p => p.name !== 'pose')];
    a.states = a.poses.map(p => ({ ...(a.states?.[0] || {}), pose: p.name })); // each pose keeps the planned params (a ball's flag), so the sheet shows the real thing
  }
}

// save: checkpoint the result (first drawings and sprite-sheet fixes; redraws from director notes are checkpointed too)
async function makeAsset(plan, stage, a, notes = null, save = !notes) {
  // a character with many poses: draw the character with its 3 most-used poses first (full attention on the identity),
  // then add the rest to that code from the same inner functions. Ten poses in one go lost the face and the craft.
  if (a.poses && a.poses.length > 3 && !notes && !a.code) {
    const all = a.poses, core = all.slice(0, 3), setPoses = ps => { a.poses = ps; a.states = ps.map(p => ({ ...(a.states?.[0] || {}), pose: p.name })); a.params = [{ name: 'pose', type: 'string', description: `one of: ${ps.map(p => p.name).join(', ')}` }, ...a.params.filter(p => p.name !== 'pose')]; };
    setPoses(core); await makeAsset(plan, stage, a, null, false);
    if (!a.code) { setPoses(all); return; } // the run stops on a missing asset as before
    const page = await stage.newPage();
    try {
      const modelCode = a.code; setPoses(all);
      const validate = fitValidate(page, a, plan);
      const rest = all.slice(3);
      const user = `This drawAsset for "${a.id}" is approved: keep its head, face, hair, body, limbs, outfit and its existing poses (${core.map(p => p.name).join(', ')}) exactly as they are.\n\nAdd these poses to it, built ONLY from the same inner functions, so it is the same character:\n${rest.map(p => `- ${p.name}: ${p.look}`).join('\n')}\n\nEvery pose stays inside the ${a.w}x${a.h} box; the face stays visible.\n\nApproved code:\n\`\`\`js\n${modelCode}\n\`\`\`\n\nReturn the complete drawAsset with all ${all.length} poses.`;
      const r = await make(`asset:${a.id}-poses`, `${prompt('draw')}\n\n${guide('look', 'assets')}`, user, validate, null, null);
      if (r.code) { a.code = r.code; if (r.preview) a._preview = r.preview; }
      else { a.code = modelCode; setPoses(core); log(`asset ${a.id}: extra poses failed; keeping ${core.map(p => p.name).join(', ')}`); }
      if (save) { ckSave(`asset_${a.id}.js`, a.code); if (a._preview) ckSave(`asset_${a.id}.preview`, a._preview); ckSave(`asset_${a.id}.poses.json`, a.poses); }
    } finally { await page.close(); }
    return;
  }
  const page = await stage.newPage();
  try {
    const validate = fitValidate(page, a, plan);
    const poseRule = a.poses ? `\n\nPOSES: p.pose is one of the poses listed in "poses"; draw each exactly as its look says. Write the head, face, hair, body, limbs and outfit ONCE as inner functions and build every pose from them, so the character is the same person in every pose. Expression, eyes and mouth params work in every pose. Every pose stays inside the ${a.w}x${a.h} box (the check draws each one).` : '';
    const user = `Art style: ${JSON.stringify(plan.style)}\n\n${kitApi(plan)}\n\nThe asset to draw:\n${JSON.stringify({ ...a, code: undefined, _preview: undefined }, null, 2)}${poseRule}${notes ? `\n\nThe art director reviewed the current version and asks:\n${notes}\n\nCurrent code:\n\`\`\`js\n${a.code}\n\`\`\`` : ''}\n\nWrite drawAsset.`;
    // no craft pass here: one sprite-sheet review of every pose of every asset replaces the per-asset passes
    const r = await make(`asset:${a.id}${notes ? '-rev' : ''}`, `${prompt('draw')}\n\n${guide('look', 'assets')}`, user, validate, null, a.code);
    if (r.code) { a.code = r.code; if (r.preview) a._preview = r.preview; if (save) { ckSave(`asset_${a.id}.js`, a.code); if (a._preview) ckSave(`asset_${a.id}.preview`, a._preview); } }
  } finally { await page.close(); }
}

async function makeProp3d(plan, stage, a, notes = null, save = !notes) {
  const page = await stage.newPage();
  try {
    const validate = c => page.evaluate((code, spec, d3) => window.validateProp3d(code, spec, d3), c, { id: a.id, size: a.size, parts: a.parts }, d3Data(plan));
    const user = `Palette (colour names for k): ${JSON.stringify(plan.style.palette)}\n\n${LPMODE() ? 'The subject to build' : 'The prop to build'}: ${JSON.stringify({ id: a.id, description: a.description, size_m: a.size, ...(LPMODE() ? { inside_parts_to_name: a.parts } : {}) })}${notes ? `\n\nThe director reviewed it and asks:\n${notes}\n\nCurrent code:\n\`\`\`js\n${a.code}\n\`\`\`` : ''}\n\nWrite buildAsset.`;
    const r = await make(`asset:${a.id}${notes ? '-rev' : ''}`, `${prompt(LPMODE() ? 'draw3dlp' : 'draw3d')}\n\n${guide('look', 'assets')}`, user, validate, LPMODE() ? 'These are your subject rendered by the engine at 270 x 480 (front left, front right, and sliced open down the middle). Judge it like a viewer: is the outer silhouette the real thing with its real proportions, and when sliced, do the named inside parts sit where they really are, big and clearly separate in colour?' : null, a.code);
    if (r.code) { a.code = r.code; if (r.preview) a._preview = r.preview; if (save) { ckSave(`asset_${a.id}.js`, a.code); if (a._preview) ckSave(`asset_${a.id}.preview`, a._preview); } }
  } finally { await page.close(); }
}
async function renderSheets3d(plan, stage, dir, name = 'assets') {
  const page = await stage.newPage();
  try { const sheets = await page.evaluate(d3 => window.castSheet3d(d3), d3Data(plan)); return sheets.map((d, k) => { const f = path.join(dir, `${name}${k ? `_${k + 1}` : ''}.jpg`); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); return f; }); }
  finally { await page.close(); }
}

// ---------- sprite sheet: every pose of every asset in one picture, reviewed by M3 in one request ----------
const sheetAssets = plan => plan.assets.map(a => ({ id: a.id, kind: a.kind, w: a.w, h: a.h, code: a.code, states: a.states }));
async function renderSheets(plan, stage, dir, name = 'assets') {
  const page = await stage.newPage();
  try {
    const r = await page.evaluate((assets, kit) => window.poseSheet(assets, kit), sheetAssets(plan), plan.kit);
    return r.sheets.map((d, k) => { const f = path.join(dir, `${name}${k ? `_${k + 1}` : ''}.jpg`); fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); return f; });
  } finally { await page.close(); }
}
async function sheetReview(plan, stage, maxRounds = 2) {
  if (ckLoad('sheet-review.json')) { log('sheet review: restored from checkpoint'); return; }
  fs.mkdirSync(WORK, { recursive: true });
  const looks = plan.assets.map(a => `${a.id} (${a.kind}): ${a.description}${a.poses ? `\n  poses: ${a.poses.map(p => `${p.name} = ${p.look}`).join('; ')}` : ''}`).join('\n');
  const noteText = v => (v && typeof v === 'object' ? Object.entries(v).map(([k, x]) => `- ${k}: ${typeof x === 'object' ? JSON.stringify(x) : x}`).join('\n') : String(v || '').trim());
  const history = [];
  // up to 2 rounds: review the sheet, redraw only the flagged assets, review again (a single redraw often misses part of the note)
  for (let round = 1; round <= maxRounds; round++) {
    const files = await renderSheets(plan, stage, WORK, round === 1 ? 'sheet' : `sheet-r${round}`);
    const content = [{ type: 'text', text: `Sprite sheet of every asset of this reel (round ${round}): each tile is labelled "asset: pose". Characters are drawn at ONE shared scale, so their heights and proportions compare directly.${history.length ? `\n\nIn the last round you asked for these fixes; check that each was really done, and ask again, more concretely, for any that were not:\n${history.at(-1)}` : ''}\n\nWhat each should be:\n${looks}` },
      ...files.map(f => img(`data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}`)), { type: 'text', text: 'Return only the JSON object.' }];
    const text = await m3(`sheet-review-r${round}`, `${prompt('sheet')}\n\n${guide('look', 'assets')}`, [{ role: 'user', content }], 8000);
    let n; try { n = extractJson(text); } catch { log('sheet review: no usable notes'); break; }
    const fixes = Object.entries(n.fixes || {}).map(([id, v]) => [id, noteText(v)]).filter(([id, v]) => v && plan.assets.find(a => a.id === id));
    log(`sheet review r${round}: ${fixes.length ? `fixing ${fixes.map(([id]) => id).join(', ')}` : 'approved'}${n.summary ? ` - ${String(n.summary).slice(0, 200)}` : ''}`);
    ckSave(`sheet-review-r${round}.json`, n);
    if (!fixes.length) break;
    history.push(fixes.map(([id, note]) => `${id}: ${note}`).join('\n'));
    await pool(fixes.map(([id, note]) => () => makeAsset(plan, stage, plan.assets.find(a => a.id === id), note, true)), 8);
    if (round === maxRounds) await renderSheets(plan, stage, WORK, 'sheet-final');
  }
  ckSave('sheet-review.json', { rounds: history.length });
}
// recheck: the shot's lines changed (applyNotes); its code is kept while it still passes against them, and redrawn only when not
async function makeShot(plan, stage, tl, i, notes = null, recheck = false) {
  const page = await stage.newPage(), s = plan.shots[i], sh = tl.shots[i];
  try {
    if (PHOTOMODE() && tl.photos?.length) await page.evaluate(p => window.loadPhotos(p), tl.photos);
    const ck = checks(), hero = NOASSETS ? { id: null } : plan.assets[0];
    const heroBox = hero.code && !D3MODE() ? (await page.evaluate((code, spec, kit) => window.validateAsset(code, spec, kit).box, hero.code, hero, plan.kit)) : null;
    // "subject size: off": shots may hold a quote, a map or a number instead of an asset (documentary reels), so no subject size or opening rule
    // "numbers: said": every number on screen is one the shot's lines say (stage_asset.html validateShot)
    const sc = { hero: ck['subject size'] === 'off' ? null : hero.id, heroBox, acting: +ck['acting beat'] || 0, heroSize: range(ck['hero size']), heroWidth: range(ck['hero width']), heroCentreY: range(ck['hero centre y']), labels: ck.labels || null, uses: s.uses || [], scenery: plan.assets.filter(a => a.kind === 'scenery').map(a => a.id), carryIn: plan.shots[i - 1]?.carry || [], carryOut: s.carry || [], numbers: ck.numbers || null };
    const validate0 = c => page.evaluate((code, shot, t, k) => window.validateShot(code, shot, t, k), c, { ...sh, code: null }, { ...tl, shots: [], photos: undefined }, sc);
    // "numbers: reference": every number written on screen must appear in the fetched reference or the brief (M3 invented values to fill a beat)
    const validateN = ck.numbers !== 'reference' ? validate0 : async c => { const res = await validate0(c); const bad = numbersNotIn((res.stats && res.stats.shown) || []); if (bad.length) { res.errors = [...res.errors, `the number(s) ${bad.map(b => `"${b}"`).join(', ')} on screen are not in the reference: show only numbers the reference states (with their unit), or leave the number out`]; res.ok = false; } return res; };
    // documentary reels: the photo and quote the storyboard pins in this shot must really be drawn
    const mine = PHOTOMODE() ? [...(plan.pics || []).filter(p => p.shot === i + 1).map(p => ['photo', p.id]), ...(plan.quotes || []).filter(q => q.shot === i + 1).map(q => ['quote', q.id])] : [];
    const sliceBeats = list(ck['slice beats']), mustSlice = LPMODE() && sliceBeats.includes(String(s.beat || '').toLowerCase()), mustClose = LPMODE() && list(ck['closed beats']).includes(String(s.beat || '').toLowerCase());
    const validateL = !LPMODE() ? validateN : async c => { const res = await validateN(c); const E = [];
      if (/kit\.panel\(|\.fillText\(|\.strokeText\(/.test(codeOnly(c))) E.push('draw words only with kit.header (the step header) and h.d3.label (the one label on a part): no kit.panel plaques, no ctx.fillText or strokeText');
      const steps = plan.shots.map((x, j) => [String(x.beat || '').toLowerCase(), j]).filter(([b]) => b === 'step').map(([, j]) => j), hd = res.stats?.lp?.header;
      if (res.stats?.lp) { if (!hd) E.push('draw the header with kit.header(ctx, ...) in every frame of the shot'); else if (steps.includes(i)) { const k = steps.indexOf(i) + 1; if (String(hd.n) !== String(k) || +hd.total !== steps.length) E.push(`this is step ${k} of ${steps.length}: its header is kit.header(ctx, ${k}, ${steps.length}, '<the part's name>'), not ${hd.n == null ? 'unnumbered' : `${hd.n}/${hd.total}`}`); } else if (hd.n != null) E.push(`this ${s.beat} shot is not a step: its header has no number: kit.header(ctx, null, 0, '${String(hd.text).replace(/'/g, '')}')`); }
      if (mustClose && res.stats?.lp && res.stats.lp.slice > 0.05) E.push(`this ${s.beat} shot shows the subject whole and closed: leave slice out of h.d3.thing (the slices belong to the step shots)`);
      if (mustSlice && res.stats && res.stats.lp) { if (res.stats.lp.slice < 0.6) E.push(`this ${s.beat} shot never opens the subject (slice reaches ${res.stats.lp.slice.toFixed(2)} in its second half): pass slice to h.d3.thing, rising from 0 to 1 over 0.6 s on the cue word, e.g. h.d3.thing('<id>', { x, z, slice: h.clamp((lt - h.cue('<word>')) / 0.6) }), and keep it open to the end`); if (!res.stats.lp.labels) E.push(`this ${s.beat} shot labels no part: once the subject is open, call h.d3.label('<thing id>', '<inside part>', '<NAME>', { k: lt - <when it appears> }) after h.d3.render(), every frame to the end of the shot`); }
      if (E.length) { res.errors = [...res.errors, ...E]; res.ok = false; } return res; };
    const validate = !mine.length ? validateL : async c => { const res = await validateL(c); const miss = mine.filter(([f, id]) => !new RegExp(`h\\.${f}\\(\\s*['"\`]${id}['"\`]`).test(c)); if (miss.length) { res.errors = [...res.errors, ...miss.map(([f, id]) => `the storyboard pins the real ${f} "${id}" in this shot: draw it with h.${f}('${id}', ...)`)]; res.ok = false; } return res; };
    if (recheck && s.code) { // h.cue finds its words at their new times; a word the lines no longer say is an error here (the stage's strict h.cue)
      const res = await validate(s.code);
      if (res.ok) { log(`shot${i + 1}: its lines changed and its code still passes every check; kept`); return; }
      log(`shot${i + 1} kept code rejected: ${res.errors.slice(0, 3).join('; ')}; redrawing it for the new lines`);
      notes = `${notes}\nAgainst the new lines the current code fails these checks:\n- ${res.errors.join('\n- ')}`;
    }
    const evidence = !PHOTOMODE() ? '' : `\nReference articles (the only sources to name in h.note, as 'Wikipedia: <title>'): ${JSON.stringify([...new Set([...String(REF).matchAll(/^### (.+?)(?: \(passages about:.*\))?$/gm)].map(m => m[1].trim()))])}\nReal photos of this reel (h.photo draws one with its credit line): ${JSON.stringify((plan.pics || []).map(p => ({ id: p.id, shows: p.label || p.shows, aspect_w_over_h: +(p.w / p.h).toFixed(2), planned_for_shot: p.shot })))}\nReference quotes (h.quote draws one with its source line): ${JSON.stringify((plan.quotes || []).map(q => ({ id: q.id, underlined: q.mark, planned_for_shot: q.shot })))}${(plan.photos || []).filter(p => p.shot === i + 1 && !(plan.pics || []).some(x => x.id === p.id)).map(p => `\nNo real photo was found for "${p.id}" (${p.shows}): leave its h.photo out and draw that thing yourself in the drawing style.`).join('')}`;
    const cast = Object.fromEntries(Object.entries(plan.cast).filter(([k]) => k !== 'narrator').map(([k, v]) => [k, v.asset]));
    const user = D3MODE() ? `Art style: ${plan.style.name}: ${plan.style.description}\n\n${LPMODE() ? kitApiLp(plan) : kitApi3d(plan)}\n\nShot ${i + 1} of ${plan.shots.length}. Storyboard: ${s.idea}${shotStory(s, plan.shots[i - 1])}\n${LPMODE() ? 'Set' : 'Room'}: "${s.background}"\nShot length: ${sh.dur.toFixed(2)} s\nLines (sh.lines): ${JSON.stringify(sh.lines.map(({ who, text, start, end }) => ({ who, text, start, end })))}\n${LPMODE() ? `Sentences of the narration with their times (h.d3.sentences() returns these): ${JSON.stringify(sentencesOfShot(sh))}\nThe host (h.d3.actor id) and the subjects (h.d3.thing ids) with the inside parts h.d3.label can name: ${JSON.stringify(cast3d(plan))}` : `Cast (h.d3.actor ids with their roles) and the story's own prop (an extra h.d3.thing id): ${JSON.stringify(cast3d(plan))}`}${notes ? `\n\nThe director reviewed this shot and asks:\n${notes}\n\nCurrent code:\n\`\`\`js\n${s.code}\n\`\`\`` : ''}\n\nWrite draw.`
      : `Art style: ${plan.style.name}: ${plan.style.description}\n\n${kitApi(plan)}\n\nShot ${i + 1} of ${plan.shots.length}. Storyboard: ${s.idea}${shotStory(s, plan.shots[i - 1])}\nBackground: "${s.background}"\nShot length: ${sh.dur.toFixed(2)} s\nLines (sh.lines): ${JSON.stringify(sh.lines.map(({ who, text, start, end }) => ({ who, text, start, end })))}\n${NOASSETS
      ? `NO ASSETS IN THIS REEL: h.asset is not available. Draw every character and object yourself with canvas code in this shot, in the art style, following these design notes exactly so they look the same in every shot (same shapes, proportions, colours, outline and face). Where the directions mention an asset or its params, draw that thing yourself in that state, and act the characters with your own drawing (pose, expression, gestures). Speakers and the design that represents each: ${JSON.stringify(cast)}\nDesign notes: ${JSON.stringify(assetCatalog(plan).map(({ id, kind, description, box, params }) => ({ id, kind, description, size: box, states: params.map(p => `${p.name}: ${p.description}`) })))}`
      : `Speakers and the asset that represents each: ${JSON.stringify(cast)}\nAssets (every one is yours to use; the storyboard shows ${JSON.stringify(s.uses || [])} in this shot, and each of those must be visible): ${JSON.stringify(assetCatalog(plan))}`}${evidence}${notes ? `\n\nThe director reviewed this shot and asks:\n${notes}\n\nCurrent code:\n\`\`\`js\n${s.code}\n\`\`\`` : ''}\n\nWrite draw.`;
    const craft = LPMODE() ? 'These are three frames of your shot (20%, 55% and 92% of its length, side by side; each is a separate vertical frame). Judge like a viewer: is the subject big and clearly the real thing, does the slice open it where the line explains it and does the one label point at the right part, is the host beside it (never inside it) in a pose that fits the sentence, is the header readable?' : D3MODE() ? 'These are three frames of your shot (20%, 55% and 92% of its length, side by side; each is a separate vertical frame). Judge like a viewer: does everyone stand where a person could stand, face whom they deal with, does each camera setup show the right person clearly, do the expressions match the lines, do the insert panels read? Fix staging with positions, facing, poses and camera types.' : 'These are three frames of your shot (20%, 55% and 92% of its length, side by side; each is a separate vertical frame). Judge staging, hero size, depth, motion and payoff timing against the template directions and the storyboard.';
    const r = await make(`shot${i + 1}${notes ? '-rev' : ''}`, `${prompt(D3MODE() ? 'shot3d' : 'shot')}${PHOTOMODE() ? `\n\n${prompt('shotphotos')}` : ''}\n\n${guide('look', 'motion', 'shots')}`, user, validate, craft, s.code);
    if (r.code) s.code = r.code;
  } finally { await page.close(); }
}

// the moment the music should land on: the director's pick (plan.music.payoff_shot), else the payoff-like beat, else the last shot
const PAYOFF_BEATS = ['payoff', 'climax', 'reveal', 'answer', 'punchline', 'outcome', 'help', 'why'];
function payoffTime(plan, tl) {
  let i = (+plan.music?.payoff_shot || 0) - 1;
  if (!(i >= 0 && i < tl.shots.length)) for (const b of PAYOFF_BEATS) { i = plan.shots.findIndex(s => String(s.beat || '').toLowerCase() === b); if (i >= 0) break; }
  if (!(i >= 0 && i < tl.shots.length)) i = tl.shots.length - 1;
  return tl.shots[i].start + (tl.shots[i].lines[0]?.start || 0);
}
const photoCredits = plan => (plan.pics || []).length ? `- Photos (Wikimedia Commons; each credit line is also on screen under its photo; put them in the post description too):\n${plan.pics.map(p => `  - ${p.credit}. ${p.title.replace(/^File:/, '')}: ${p.page}`).join('\n')}\n${(plan.quotes || []).length ? `- Quoted text: ${[...new Set(plan.quotes.map(q => q.source))].join('; ')} (CC BY-SA 4.0)\n` : ''}` : '';
const creditsMd = (bed, plan = {}) => `# Credits and posting checklist\n\n${photoCredits(plan)}- Music: ${bed.credit ? `${bed.credit} (put this line in the post description; ISRC ${bed.isrc} answers a Content ID claim)` : bed.source === 'lyria' ? 'generated with Google Lyria 3 (no credit line needed)' : 'procedural, made by the engine (no credit needed)'}\n- Voice: synthetic (${voiceModel(VM).id}): tick the AI-label toggle on Reels and TikTok.\n`;
let musicUsd = 0, audioReport = null;
async function produce(plan, dir) {
  const tl = timeline(plan), n = Math.ceil(tl.total * SR), V = new Float32Array(n), sfx = [];
  tl.shots.forEach((sh, si) => { sh.lines.forEach((l, li) => { const c = plan.shots[si].lines[li]._clip, off = Math.round((sh.start + l.start) * SR); V.set(c.pcm.subarray(0, Math.max(0, Math.min(c.pcm.length, n - off))), off); }); (plan.shots[si].sfx || []).filter(f => sh.lines[f.line]).forEach(f => sfx.push({ t: sh.start + (f.at === 'end' ? sh.lines[f.line].end : sh.lines[f.line].start) + (+f.offset || 0), kind: f.kind })); if (si) sfx.push({ t: sh.start, kind: 'whoosh', gain: 0.5 }); });
  const Ls = new Float32Array(n), Rs = new Float32Array(n);
  sfx.forEach((f, j) => addSfx(Ls, Rs, f.t, f.kind, 5000 + j, f));
  fs.mkdirSync(dir, { recursive: true }); writeWavStereo(path.join(dir, 'voice.wav'), V, V); writeWavStereo(path.join(dir, 'sfx.wav'), Ls, Rs);
  // the bed (engine/audio.mjs, cutroom rules/audio.md): a CC BY library track fitted so it builds into the payoff, ducked under the voice, gated 10-14 dB
  const payoff = payoffTime(plan, tl), speech = tl.shots.flatMap(sh => sh.lines.map(l => [sh.start + l.start, sh.start + l.end]));
  const bed = await pickMusic({ key: KEY.openrouter, plan, dur: tl.total, payoff, workDir: WORK, source: MUSIC_SOURCE });
  musicUsd += bed.usd || 0;
  const mix = await mixReel({ voiceWav: path.join(dir, 'voice.wav'), sfxWav: path.join(dir, 'sfx.wav'), musicFile: bed.file, musicStart: bed.fit.start, dur: tl.total, speech, swells: bed.source === 'synth' ? [] : [Math.max(0, payoff - 0.4)], out: path.join(dir, 'mix.wav') });
  log(`music: ${bed.title} (${bed.source}) from ${bed.fit.start}s, payoff ${payoff.toFixed(1)}s, fit ${bed.fit.pass === null ? 'n/a' : bed.fit.pass ? 'PASS' : 'FAIL'}; mix: voice ${mix.voice_over_music_db} dB over music in speech (gate 10-14) ${mix.pass ? 'PASS' : 'FAIL'}, music +${mix.music_in_gaps_db} dB in gaps (want 4-10), ${mix.integrated_lufs} LUFS`);
  audioReport = { voice: voiceStats, music: { source: bed.source, title: bed.title, isrc: bed.isrc, credit: bed.credit, fit: bed.fit, candidates: bed.candidates }, mix };
  fs.writeFileSync(path.join(dir, 'audio.json'), JSON.stringify(audioReport, null, 2));
  fs.writeFileSync(path.join(dir, 'CREDITS.md'), creditsMd(bed, plan));
  const s = performance.now(), frames = await renderVideo(tl, dir, { workers: 5, stageUrl: STAGE });
  log(`render: ${frames} frames, ${tl.total.toFixed(1)}s of film, ${((performance.now() - s) / 1000).toFixed(1)}s`);
  await run('ffmpeg', ['-y', '-v', 'error', '-i', 'video.mp4', '-i', 'mix.wav', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', 'reel.mp4'], { cwd: dir });
  for (const f of fs.readdirSync(dir)) if (/^seg_\d+\.mp4$|^segments\.txt$|^video\.mp4$|^(mix|voice|sfx)\.wav$/.test(f)) fs.rmSync(path.join(dir, f));
  const save = { brief, seconds, ...plan, shots: plan.shots.map(({ lines, ...s }) => ({ ...s, lines: lines.map(({ _clip, ...l }) => l) })), assets: plan.assets.map(({ _preview, ...a }) => a) };
  fs.writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(save, null, 2));
  fs.writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify({ total: tl.total, shots: tl.shots.map(({ code, lines, ...s }) => ({ ...s, lines: lines.map(({ env, ...l }) => l) })) }, null, 2));
  return tl;
}

async function review(plan, tl, dir, round) {
  const rev = path.join(dir, 'review'); fs.mkdirSync(rev, { recursive: true });
  const content = [{ type: 'text', text: `Brief: ${brief}\nTarget length: ${seconds} s. This cut: ${tl.total.toFixed(1)} s, ${tl.shots.length} shots. Round ${round}.${plan.story ? ` The question the reel answers: "${plan.story.question}"; its answer: "${plan.story.answer}".` : ''}${NOASSETS ? ' There are no assets in this reel: every shot draws everything itself, so put every visual fix in "shots" and leave "assets" empty.' : ' First, the sheet of every asset (each tile is one asset):'}` }];
  if (!NOASSETS) {
    for (const f of fs.readdirSync(dir).filter(x => /^assets(_d+)?.jpg$/.test(x)).sort()) content.push(img(`data:image/jpeg;base64,${fs.readFileSync(path.join(dir, f)).toString('base64')}`));
    content.push({ type: 'text', text: `Each tile is labelled "asset: pose"; characters share one scale. Asset ids: ${plan.assets.map(a => a.id).join(', ')}` });
  }
  for (let i = 0; i < tl.shots.length; i++) {
    const s = tl.shots[i], fr = [];
    for (const [k, f] of [0.2, 0.55, 0.92].entries()) { const o = path.join(rev, `s${i + 1}_${k}.jpg`); fr.push(o); await run('ffmpeg', ['-y', '-v', 'error', '-ss', (s.start + s.dur * f).toFixed(2), '-i', path.join(dir, 'reel.mp4'), '-frames:v', '1', '-vf', 'scale=270:480', o]); }
    const strip = path.join(rev, `shot${i + 1}.jpg`); await run('ffmpeg', ['-y', '-v', 'error', ...fr.flatMap(f => ['-i', f]), '-filter_complex', 'hstack=inputs=3', strip]); fr.forEach(f => fs.rmSync(f));
    content.push({ type: 'text', text: `Shot ${i + 1} (${s.dur.toFixed(1)} s).${plan.shots[i].point ? ` Point: ${plan.shots[i].point}` : ''} Storyboard: ${plan.shots[i].idea}\nLines: ${s.lines.map(l => `${l.who}: "${l.text}" (${l.start.toFixed(1)}-${l.end.toFixed(1)} s)`).join(' | ')}\nThree separate vertical frames at 20%, 55% and 92%:` });
    content.push(img(`data:image/jpeg;base64,${fs.readFileSync(strip).toString('base64')}`));
  }
  content.push({ type: 'text', text: 'Return only the JSON object.' });
  const messages = [{ role: 'user', content }];
  for (let a = 1; a <= 2; a++) {
    const text = await m3(`director-r${round}`, `${prompt('director')}\n\nJudge the cut against the template it was made with:\n\n${guide(...SECTIONS)}${refBlock()}`, messages);
    try { const n = extractJson(text); if (typeof n.approve !== 'boolean') throw new Error('missing "approve"'); return n; }
    catch (e) { messages.push({ role: 'assistant', content: text || '(empty)' }, { role: 'user', content: `Not usable: ${e.message}. Return only the JSON object.` }); }
  }
  return { approve: false, summary: 'director returned no usable notes', shots: {}, assets: {}, lines: {} };
}

// the director round's body, shared by --rounds and --apply-notes: change the lines and voice them, redraw the noted assets and shots, save all to the checkpoints, render the next cut into dir
async function applyNotes(plan, stage, notes, dir) {
  log(`apply notes: ${Object.keys(notes.lines || {}).length} line, ${Object.keys(notes.assets || {}).length} asset, ${Object.keys(notes.shots || {}).length} shot notes -> ${path.basename(dir)}`);
  if (checks().script === 'yes' && Object.keys(notes.lines || {}).length) { log('director line changes ignored: the script is verbatim'); notes.lines = {}; }
  // the director sometimes names a speaker by its VOICE ("am_onyx") instead of its cast id ("narrator"): map it back; a list that
  // ends up empty never replaces a shot's lines (it once silenced 8 of 14 shots and cut a 89 s reel to 38 s)
  const byVoice = Object.fromEntries(Object.entries(plan.cast || {}).map(([id, c]) => [String(c?.voice || '').toLowerCase(), id]));
  const relined = new Set();
  for (const [k, ls] of Object.entries(notes.lines || {})) {
    const s = plan.shots[+k - 1]; if (!s || !Array.isArray(ls) || !ls.length) continue;
    const nl = ls.map(l => ({ ...l, who: plan.cast[l?.who] ? l.who : byVoice[String(l?.who || '').toLowerCase()] })).filter(l => l?.text && plan.cast[l.who]).map(l => ({ who: l.who, text: l.text, ...(l.tone ? { tone: l.tone } : {}) }));
    if (!nl.length) { log(`director lines for shot ${k} ignored: no speaker is in the cast (${ls.map(l => l?.who).join(', ')})`); continue; }
    // the writer's line checks (engine/writer.mjs lineNoteErrors): a hard problem keeps the old lines, a soft one is logged
    const errs = lineNoteErrors(plan.shots, +k - 1, nl, plan.story?.facts || null, Math.floor((seconds - padOf(plan.shots)) * wpsOf(plan)), brief), hard = errs.filter(e => !e.soft);
    if (hard.length) { log(`director lines for shot ${k} rejected: ${hard.join('; ')}; the old lines are kept`); continue; }
    if (errs.length) log(`director lines for shot ${k} taken with craft problems: ${errs.join('; ')}`);
    s.lines = nl; relined.add(+k);
  }
  await voiceAll(plan);
  const saved = JSON.parse(ckLoad('plan.json')); saved.shots.forEach((s, i) => { s.lines = plan.shots[i].lines.map(({ _clip, ...l }) => l); }); ckSave('plan.json', saved); // only the lines change in the plan checkpoint; code lives in kit.js, asset_*.js and shot_*.js
  notes.shots = notes.shots || {};
  // a shot whose lines changed keeps its code while that code still passes against them (makeShot recheck); when it fails (a cue
  // word no longer said, a label now late) it is redrawn with this note, and a redraw that fails too ships failing (make)
  const recheck = new Set();
  for (const k of relined) { const s = plan.shots[k - 1]; if (s.code && !notes.shots[k]) { notes.shots[k] = `The lines of this shot changed to: ${s.lines.map(l => `"${l.text}"`).join(' ')}. Keep the staging; time every h.cue(...) to a word the new lines say.`; recheck.add(k); } }
  if (!NOASSETS) await pool(Object.entries(notes.assets || {}).map(([id, n]) => () => { const a = plan.assets.find(x => x.id === id); if (a && D3MODE() && a.kind === 'character') { log(`director note on 3D character ${id} not applied (the engine builds it from look3d): ${String(n).slice(0, 120)}`); return null; } return a ? (D3MODE() ? makeProp3d(plan, stage, a, n, true) : makeAsset(plan, stage, a, n, true)) : null; }), 8);
  const tl = timeline(plan);
  await pool(Object.entries(notes.shots || {}).map(([k, n]) => () => (plan.shots[+k - 1] ? makeShot(plan, stage, tl, +k - 1, n, recheck.has(+k)).then(() => { if (plan.shots[+k - 1].code) ckSave(`shot_${k}.js`, plan.shots[+k - 1].code); }) : null)), 10);
  fs.mkdirSync(dir, { recursive: true }); if (!NOASSETS) await (D3MODE() ? renderSheets3d(plan, stage, dir) : renderSheets(plan, stage, dir));
  return produce(plan, dir);
}

async function main() {
  log(`asset_reel (MiniMax-M3, effort ${EFFORT}): "${brief.replace(/\s+/g, " ").slice(0, 140)}${brief.length > 140 ? "..." : ""}", ${seconds}s, ${rounds} director rounds`);
  const stage = await launchStage(STAGE + '?cpu'); // validation browser: CPU canvas (see stage_asset.html)
  let plan;
  try {
    // a voice switch (the harness reruns the cut with the next voice when one is refused) leaves a script written to another speaking
    // rate: write it again from the spine, and drop what was built on it
    const savedScript = !NOTES_FILE && ckLoad('script.json'), oldScript = savedScript && JSON.parse(savedScript);
    if (oldScript && rateMoved(oldScript, wpsOf(oldScript), voiceModel(VM).id)) {
      const keep = new Set(['reference.txt', 'facts.json', 'spine.json', 'calls.json']);
      for (const f of fs.readdirSync(WORK)) if (!keep.has(f)) fs.rmSync(path.join(WORK, f), { recursive: true, force: true });
      log(`voice: ${voiceModel(VM).id} speaks about ${wpsOf(oldScript)} words/s, the script was written for ${oldScript.voice_model} at ${oldScript.wps}; writing the script and the plan again from the spine`);
    }
    const savedPlan = ckLoad('plan.json');
    useTemplate((savedPlan && !flag('--template') && JSON.parse(savedPlan).template) || await pickTemplate());
    log(`template: ${TPL.name}, word budget about ${budgetGuess()}`);
    REF = checks().reference === 'off' ? '' : await getReference(); // a script brings its own content: no fact lookup
    let vp = null;
    if (savedPlan) { plan = JSON.parse(savedPlan); log('plan: restored from checkpoint'); }
    else {
      const story = await writer().writeStory();
      if (flag('--until') === 'script') {
        const costs = report({ brief, template: TPL.name, calls }); fs.writeFileSync(`${base}-cost.txt`, costs + '\n');
        console.log(`\n${fs.readFileSync(path.join(WORK, 'script.md'), 'utf8')}\n\n${costs}`); log(`stopped after the script (--until script): ${path.join(WORK, 'script.md')}`); return;
      }
      vp = voiceAll(story); vp.catch(() => { }); // the lines are final: voice them while the production plan is written (awaited before the shots)
      plan = { ...(await productionPlan(story)), template: TPL.ref };
      ckSave('plan.json', planJson(plan));
    }
    plan.kit = ckLoad('kit.js') || plan.kit;
    plan.assets.forEach(a => { a.code = ckLoad(`asset_${a.id}.js`) || a.code; a._preview = ckLoad(`asset_${a.id}.preview`) || a._preview; });
    log(`plan: "${plan.title}" style "${plan.style.name}", ${plan.assets.length} assets, ${plan.shots.length} shots, ${plan.shots.reduce((a, s) => a + s.lines.reduce((b, l) => b + words(l.text), 0), 0)} words`);
    if (!vp) { vp = voiceAll(plan); vp.catch(() => { }); }
    const photosP = PHOTOMODE() ? getPhotos(plan) : Promise.resolve(); // Commons search + M3's pick, while the kit and assets are made
    const posesP = !NOASSETS && !D3MODE() && plan.assets.some(a => a.kind === 'character') ? planPoses(plan) : Promise.resolve({}); // runs while the kit is made
    if (D3MODE()) { // 3D: the engine's kit; characters are built from their look3d, so they need no drawing
      if (!plan.kit) { plan.kit = KIT3D; ckSave('kit.js', KIT3D); }
      plan.assets.filter(a => a.kind === 'character').forEach(a => { a.code = NOOP_ASSET; });
      log(`3D reel: engine kit, ${plan.assets.filter(a => a.kind === 'character').length} characters from look3d, rooms from room specs`);
    }
    if (plan.kit) log('kit: restored from checkpoint');
    else { // kit
      const page = await stage.newPage();
      try {
        const r = await make('kit', `${prompt('kit')}\n\n${guide('look', 'motion')}`, `Style guide:\n${JSON.stringify(plan.style, null, 2)}\n\nWrite makeKit.`, c => page.evaluate((code, st, k) => window.validateKit(code, st, k), c, plan.style, { bgDetail: +checks()['background detail'] || 0 }), 'These are your backgrounds rendered at full frame with a sample panel and title. Judge depth, texture, contrast hierarchy (backgrounds calmer than subjects), motion and style against the guide.');
        if (!r.code) throw new Error('no valid style kit'); plan.kit = r.code; ckSave('kit.js', r.code);
      } finally { await page.close(); }
    }
    applyPoses(plan, await posesP);
    const todo = () => (NOASSETS ? [] : plan.assets.filter(a => !a.code));
    if (NOASSETS) { plan.assets.forEach(a => { a.code = null; }); log('assets: none (--no-assets: every shot draws everything itself)'); }
    else log(`assets: ${plan.assets.length - todo().length} restored, ${todo().length} to draw`);
    for (let pass = 1; pass <= 2 && todo().length; pass++) // a failing asset is retried once more instead of stopping the run
      await pool(todo().map(a => async () => { try { await (D3MODE() ? makeProp3d(plan, stage, a) : makeAsset(plan, stage, a)); } catch (e) { log(`asset ${a.id} failed (${e.message.slice(0, 80)}); will retry`); } }), 8); // all at once
    // a missing asset breaks every shot that uses it (they crash, retry and render black), so stop here instead of spending the rest of the run
    const missing = NOASSETS ? [] : plan.assets.filter(a => !a.code).map(a => a.id);
    if (missing.length) throw new Error(`no valid code for asset(s) ${missing.join(', ')} after 2 passes; see the "asset:" lines above. Finished steps are checkpointed: fix the cause and rerun the same command`);
    if (!NOASSETS && !D3MODE()) await sheetReview(plan, stage);
    if (D3MODE()) { fs.mkdirSync(WORK, { recursive: true }); await renderSheets3d(plan, stage, WORK, 'sheet'); }
    if (flag('--until') === 'assets') { log(`stopped after the assets (--until assets); sprite sheets in ${WORK}: sheet.jpg (first draw), sheet-r2.jpg (after round 1 fixes), sheet-final.jpg (after the last fixes)`); return; }
    await vp; await photosP;
    let dir = `${base}-v${CUT}`; if (!NOTES_FILE) fs.mkdirSync(dir, { recursive: true }); if (!NOTES_FILE && !NOASSETS) await (D3MODE() ? renderSheets3d(plan, stage, dir) : renderSheets(plan, stage, dir));
    let tl = timeline(plan);
    plan.shots.forEach((s, i) => { s.code = ckLoad(`shot_${i + 1}.js`) || s.code; });
    for (let pass = 1; pass <= 2 && plan.shots.some(s => !s.code); pass++)
      await pool(plan.shots.map((s, i) => [s, i]).filter(([s]) => !s.code).map(([, i]) => async () => { try { await makeShot(plan, stage, tl, i); if (plan.shots[i].code) ckSave(`shot_${i + 1}.js`, plan.shots[i].code); } catch (e) { log(`shot ${i + 1} failed (${e.message.slice(0, 80)}); will retry`); } }), 10); // all at once
    if (NOTES_FILE) { tl = await applyNotes(plan, stage, JSON.parse(fs.readFileSync(path.resolve(NOTES_FILE), 'utf8')), dir); }
    else tl = await produce(plan, dir);
    for (let r = 1; r <= (NOTES_FILE ? 0 : rounds); r++) {
      const notes = await review(plan, tl, dir, r);
      fs.writeFileSync(path.join(dir, 'director-notes.json'), JSON.stringify(notes, null, 2));
      log(`director r${r}: ${notes.approve ? 'APPROVED' : 'changes'} - ${notes.summary}`);
      if (notes.approve) break;
      dir = `${base}-v${CUT + r}`;
      tl = await applyNotes(plan, stage, notes, dir);
    }
    const summary = { brief, template: TPL.name, seconds, final: dir, film_s: tl.total, minimax_calls: calls.length, input_tokens: calls.reduce((a, c) => a + c.input_tokens, 0), cached_tokens: calls.reduce((a, c) => a + c.cached, 0), output_tokens: calls.reduce((a, c) => a + c.output_tokens, 0), thinking_tokens: calls.reduce((a, c) => a + c.thinking, 0), llm_usd: +cost().toFixed(4), speech_usd: +speechUsd.toFixed(5), voice_model: voiceModel(VM).id, music_usd: +musicUsd.toFixed(4), audio: audioReport, wall_s: +((performance.now() - T0) / 1000).toFixed(0), calls };
    fs.writeFileSync(`${base}-summary.json`, JSON.stringify(summary, null, 2));
    const costs = report(summary); fs.writeFileSync(`${base}-cost.txt`, costs + '\n'); console.log(costs); // tokens and cost per phase
    log(`final: ${path.join(dir, 'reel.mp4')}`);
    log(JSON.stringify({ ...summary, calls: undefined }));
  } finally { await stage.browser.close(); }
}

main().catch(e => { console.error(`FAILED: ${e.stack || e.message}`); process.exit(1); });
