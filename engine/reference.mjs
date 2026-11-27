// fastreel reference: real facts from Wikipedia (the only source), so plan and director do not rely on M3's memory.
// asset_reel.mjs getReference / addArticles call these; `have` is the reference so far (an article or a sentence is added once).
import { log } from './lib.mjs';
import { STOP } from './writer.mjs';

const API = 'https://en.wikipedia.org/w/api.php?format=json&', UA = { 'User-Agent': 'fastreel-reference/1.0' };
const get = async q => { const r = await fetch(API + q, { headers: UA, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };
const SKIP_SECTIONS = /^(see also|references|external links|external resources|further reading|notes|bibliography|sources|citations|gallery|footnotes)$/i;
// each article is fetched once per run (a search hit or a facts-step need often names one the reference has): a client without
// contact details in its User-Agent got 429 on its 10th API request within a minute (2026-11-27; Wikimedia's limit is 10 a minute)
const PAGES = new Map();
const one = async t => { if (!PAGES.has(t)) PAGES.set(t, Object.values((await get(`action=query&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(t)}`)).query?.pages || {})[0]); return PAGES.get(t); };
// an article's plain text; M3 guesses titles ("Day on Venus", "Dissolution of Norway–Sweden union" have no page), so a title with
// no page falls back to Wikipedia's top search hit for it
async function wikiPage(title) {
  let page = await one(title);
  if (!page?.extract) {
    const hit = (await get(`action=query&list=search&srlimit=1&srprop=&srsearch=${encodeURIComponent(title)}`)).query?.search?.[0]?.title;
    if (hit) page = await one(hit);
    log(page?.extract ? `reference: no article "${title}"; search found "${page.title}"` : `reference: no article "${title}"`);
  }
  return page?.extract ? { title: page.title, text: page.extract } : null;
}
// the words of the request worth looking for in an article: not stop words, not words of the article's own title
const wordsOf = s => String(s).toLowerCase().match(/[a-z0-9]+/g) || [];
const lookFor = (request, title) => { const own = new Set(wordsOf(title)); return [...new Set(wordsOf(request))].filter(w => w.length > 2 && !STOP.has(w) && !own.has(w)); };
// an article's sentences, each with its section's heading path ("Orbit and rotation > Orbit in respect to Earth"; '' in the lead)
function sentences(text) {
  const S = []; let at = [];
  for (const ln of text.split('\n')) {
    const m = ln.match(/^(==+) (.+?) ==+\s*$/); if (m) { at = [...at.slice(0, m[1].length - 2), m[2].trim()]; continue; }
    if (!at.some(h => SKIP_SECTIONS.test(h))) for (const s of ln.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/)) if (s.trim().length > 25) S.push({ s: s.trim(), head: at.join(' > ') });
  }
  return S;
}
// the passages of a whole article that hold the words asked for (a reference keeps only an article's first 4000 to 7000 chars:
// "In December 2024, bitcoin price reached $100,000" sat 20,000 chars into "Bitcoin"; Venus's 243-day spin 25,000 into "Venus").
// Sentences ranked by how many of the words they hold, then by how many digits, each with the sentence before it in its section
// for context, in article order under their section headings (glued without them, 1814 and 1905 read as one event), up to `max`
// chars. Sentences the reference already has (`have`) are not added again.
function passages(page, words, max = 3000, have = '') {
  const S = sentences(page.text).map(x => ({ ...x, seen: have.includes(x.s) })), ws = words.map(w => w.toLowerCase());
  const hits = S.map((x, i) => ({ i, hit: x.seen ? 0 : ws.filter(w => x.s.toLowerCase().includes(w)).length, nums: (x.s.match(/\d/g) || []).length })).filter(x => x.hit).sort((a, b) => b.hit - a.hit || b.nums - a.nums);
  const keep = new Set(); let len = 0;
  for (const x of hits) { const add = [x.i - 1, x.i].filter(k => k >= 0 && !keep.has(k) && !S[k].seen && S[k].head === S[x.i].head); const n = add.reduce((a, k) => a + S[k].s.length + 1, 0); if (len + n > max) continue; add.forEach(k => keep.add(k)); len += n; }
  const groups = [];
  for (const k of [...keep].sort((a, b) => a - b)) { const g = groups.at(-1); if (g?.head === S[k].head) g.s.push(S[k].s); else groups.push({ head: S[k].head, s: [S[k].s] }); }
  return groups.length ? `\n\n### ${page.title} (passages about: ${words.join(', ')})\n${groups.map(g => `${g.head ? `== ${g.head} ==\n` : ''}${g.s.join(' ')}`).join('\n')}` : '';
}
// whole articles: the first found is the brief's own subject, so it gets `firstMax` chars and the passages of the rest of it that
// hold the request's words (with firstMax 0 every article gets `max`)
export async function fetchArticles(titles, { have = '', request = '', firstMax = 7000, max = 4000 } = {}) {
  let out = '';
  for (const t of titles) {
    try {
      const page = await wikiPage(t); if (!page) continue;
      if (`${have}${out}`.includes(`### ${page.title}\n`)) continue;
      const main = firstMax && !out, parts = page.text.split(/\n(?===+ [^=\n]+ ==+\n)/).filter(x => !SKIP_SECTIONS.test((x.match(/^==+ ([^=\n]+?) ==+/) || [])[1] || ''));
      out += `\n\n### ${page.title}\n${parts.join('\n').replace(/\n{3,}/g, '\n\n').slice(0, main ? firstMax : max)}`;
      if (main) out += passages(page, lookFor(request, page.title), 3000, `${have}${out}`);
    } catch (e) { log(`reference: "${t}" skipped (${e.message.slice(0, 80)})`); }
  }
  return out;
}
// an article's passages holding `words` (the writer's facts step asks for them when the reference lacks a number)
export async function fetchPassages(title, words, { have = '', max = 3000 } = {}) {
  try { const page = await wikiPage(title); return page ? passages(page, words, max, have) : ''; } catch (e) { log(`reference: "${title}" skipped (${e.message.slice(0, 80)})`); return ''; }
}
