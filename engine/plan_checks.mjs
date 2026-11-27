// fastreel plan checks (asset_reel.mjs productionPlan): the hero asset is the brief's subject, and every place a globe or map shot
// names is a real place with its real coordinates (Wikipedia). Plain functions, so test/ can call them on recorded responses.
import { log } from './lib.mjs';
import { STOP, numWords, requestOf } from './writer.mjs';

// ---------- subject: the hero asset draws the brief's subject (findings §A: an Earth globe stood in for Venus and every check passed) ----------
const toks = s => String(s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
const content = s => toks(s).filter(w => w.length > 2 && !STOP.has(w));
const near = (w, n) => { let k = 0; while (k < w.length && k < n.length && w[k] === n[k]) k++; return w === n || (k >= 4 && k >= 0.7 * Math.min(w.length, n.length)); };
const unsaid = (ws, text) => { const t = toks(text); return ws.filter(w => !t.some(n => near(w, n))); };
// p: the plan as M3 wrote it, with "subject": {"name", "asset"}; d3: a 3D reel (its host may come first, so the subject need not)
export function subjectErrors(p, brief, { d3 = false } = {}) {
  const sub = p?.subject, assets = Array.isArray(p?.assets) ? p.assets : [], ids = assets.map(a => a?.id);
  if (!sub || typeof sub !== 'object' || !String(sub.name || '').trim() || !sub.asset) return ['state the brief\'s subject: "subject": {"name": "<the thing, place, body, person or event the brief is about, in the brief\'s own words>", "asset": "<the id of the asset that draws it>"}'];
  const name = String(sub.name).trim(), ws = content(name), E = [];
  if (!ws.length) return [`"subject" "name" must name the brief's subject in its own words (one to four words, such as the thing or place itself), not "${name}"`];
  const notInBrief = unsaid(ws, requestOf(brief));
  if (notInBrief.length) E.push(`the subject "${name}" is not the brief's subject: the brief never says ${notInBrief.map(w => `"${w}"`).join(', ')}. Name the subject in the brief's own words`);
  const a = assets.find(x => x?.id === sub.asset);
  if (!a) return [...E, `"subject" "asset" "${sub.asset}" is not one of the assets (${ids.join(', ')}): name the asset that draws the subject`];
  // what the asset says it is: its id, description, params and states, and the cast ids it shows
  const cast = Object.entries(p.cast || {}).filter(([, c]) => c?.asset === a.id).map(([k]) => k);
  const missing = unsaid(ws, `${String(a.id).replace(/[_-]+/g, ' ')} ${a.description || ''} ${JSON.stringify(a.params || [])} ${JSON.stringify(a.states || [])} ${cast.join(' ')}`);
  if (missing.length) E.push(`the brief's subject is "${name}", but the asset "${a.id}" that should draw it never names ${missing.map(w => `"${w}"`).join(', ')} (its id and description describe something else): the hero draws the subject itself, never a stand-in (a reel about a planet draws that planet, not Earth). Make the hero asset that very thing, described as it really looks; a place is drawn by the scenery it lies in (a globe, a map), whose description names it`);
  if (!d3 && ids[0] !== a.id) E.push(`the subject's asset "${a.id}" must be the hero, FIRST in "assets" (the shots treat the first asset as the subject); it is listed after ${ids.slice(0, ids.indexOf(a.id)).map(x => `"${x}"`).join(', ')}`);
  return E;
}

// ---------- places (template check "places: wikipedia"): real coordinates and distances for globe and map reels ----------
// M3 misremembers coordinates (it put Dubai at 51.5 E, which is Doha) and distances. Every MARKER, LINE end and RING centre in the
// shot ideas ("MARKER at Name [lon, lat]") is looked up on Wikipedia, and a LINE's km counter is compared with the great-circle distance.
// A page's Earth coordinates, primary first: a page with no primary point can still list the place among its others ("Point Nemo"
// redirects to "Pole of inaccessibility", whose 71 points include the oceanic pole). null: the lookup failed (no network)
const PLACES = {};
async function wikiCoords(name) {
  if (name in PLACES) return PLACES[name];
  let c = null;
  try {
    const r = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=coordinates&coprimary=all&colimit=max&redirects=1&format=json&titles=${encodeURIComponent(name)}`, { headers: { 'User-Agent': 'fastreel-reference/1.0' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const page = Object.values((await r.json()).query?.pages || {})[0]; if (!page) throw new Error('no page in the answer');
    const pts = (page.coordinates || []).filter(k => (k.globe || 'earth') === 'earth').sort((a, b) => (b.primary !== undefined) - (a.primary !== undefined));
    c = { title: page.title, missing: page.missing !== undefined || page.invalid !== undefined, primary: pts[0]?.primary !== undefined, pts: pts.map(k => [k.lon, k.lat]) };
  } catch (e) { log(`places: "${name}" not looked up (${String(e.message).slice(0, 80)})`); }
  return (PLACES[name] = c);
}
const gcKm = (lo1, la1, lo2, la2) => { const d = Math.PI / 180, a = Math.sin((la2 - la1) * d / 2) ** 2 + Math.cos(la1 * d) * Math.cos(la2 * d) * Math.sin((lo2 - lo1) * d / 2) ** 2; return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a))); };
const placeName = s => { let n = String(s).replace(/^(the)\s+/i, '').replace(/[“”"']/g, '').trim(); if (n === n.toUpperCase()) n = n.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); return n; };
// p: the merged plan (its shots' ideas). A point the plan pins (MARKER, LINE end, RING centre) must be a place Wikipedia locates on
// Earth: a body in space (Venus at [0, 0] on Earth's globe) or a made-up name is a plan error. A camera move's "to Name" and a LABEL
// may name an area Wikipedia gives no point for (Africa, a sea, a current), so they are checked only when it does
export async function placeErrors(p) {
  const E = [], NUM = '(-?\\d+(?:\\.\\d+)?)', PT = `\\[\\s*${NUM}\\s*,\\s*${NUM}\\s*\\]`, NAME = '([^\\[\\];:"]{2,40}?)';
  // named points: "MARKER at Name [lon, lat]", "around Name [..]", "LINE from Name [..] to Name [..]", and LABEL "NAME" at [lon, lat]
  const AT = new RegExp(`(MARKER at|around|LINE from|to)\\s+${NAME}\\s*${PT}`, 'g'), LAB = new RegExp(`LABEL\\s+"([^"]{2,40})"\\s+at\\s+(?:[^\\[\\];:"]{0,40}?)${PT}`, 'g');
  const LINE = new RegExp(`LINE from\\s+(?:${NAME}\\s*)?${PT}\\s*to\\s+(?:${NAME}\\s*)?${PT}`, 'g');
  const fmt = n => (Math.round(n * 10) / 10).toFixed(1), key = (lon, lat) => `${+lon},${+lat}`, atPoint = {}, reported = new Set();
  const check = async (i, raw, lon, lat, tol, pinned) => {
    const name = placeName(raw); if (/^(lon|lat|longitude|latitude|\d)/i.test(name)) return;
    const w = await wikiCoords(name); if (!w) return;
    if (!w.pts.length) { if (pinned && !reported.has(`none:${name}`)) { reported.add(`none:${name}`); E.push(`shot ${i + 1}: "${name}" cannot be located: ${w.missing ? `Wikipedia has no article "${name}"` : `Wikipedia "${w.title}" gives no coordinates on Earth`}. A MARKER, LINE end or RING centre is a real place on Earth, named by its Wikipedia title (a city, an island, a mountain, a point at sea) with its real coordinates; a body in space or a thing that is not a place is never a point on the globe: draw it as its own thing, or leave it out`); } return; }
    const [lo, la] = w.primary ? w.pts[0] : w.pts.reduce((b, q) => (gcKm(lon, lat, q[0], q[1]) < gcKm(lon, lat, b[0], b[1]) ? q : b));
    atPoint[`${name}|${key(lon, lat)}`] = atPoint[key(lon, lat)] = { lon: lo, lat: la, title: w.title, name };
    const off = gcKm(lon, lat, lo, la);
    if (off > tol && !reported.has(name + key(lon, lat))) { reported.add(name + key(lon, lat)); E.push(`shot ${i + 1}: "${name}" is at [${fmt(lo)}, ${fmt(la)}] (longitude, latitude; Wikipedia "${w.title}"), not [${lon}, ${lat}] (${Math.round(off)} km off). Use the real coordinates everywhere: overlays, cameras, counters and lines`); }
  };
  for (const [i, s] of p.shots.entries()) {
    const idea = String(s.idea || '');
    for (const m of idea.matchAll(AT)) await check(i, m[2], +m[3], +m[4], 80, m[1] !== 'to');
    for (const m of idea.matchAll(LINE)) for (const [n, lon, lat] of [[m[1], m[2], m[3]], [m[4], m[5], m[6]]]) if (n) await check(i, n, +lon, +lat, 80, true);
    for (const m of idea.matchAll(LAB)) await check(i, m[1], +m[2], +m[3], 250, false); // a label may sit beside its place
  }
  for (const [i, s] of p.shots.entries()) { // a LINE's km counter against the great-circle distance between its (real) ends
    const idea = String(s.idea || '');
    for (const m of idea.matchAll(LINE)) {
      const end = (n, lon, lat) => (n && atPoint[`${placeName(n)}|${key(lon, lat)}`]) || atPoint[key(lon, lat)] || { lon: +lon, lat: +lat, name: n ? placeName(n) : `[${lon}, ${lat}]` };
      const a = end(m[1], m[2], m[3]), b = end(m[4], m[5], m[6]), km = gcKm(a.lon, a.lat, b.lon, b.lat), c = idea.match(/COUNTER\s+[a-z ]*?\s*([\d][\d,]*(?:\.\d+)?)\s*KM\b/i);
      if (c && km > 1) { const said = +c[1].replace(/,/g, ''); if (Math.abs(said - km) / km > 0.03) E.push(`shot ${i + 1}: the great-circle distance from ${a.name || a.title} to ${b.name || b.title} is ${Math.round(km).toLocaleString('en-US')} km, but its counter says ${c[1]} KM. Use ${Math.round(km).toLocaleString('en-US')} KM on the counter and "${numWords(Math.round(km)) || 'that number'}" kilometres in the line`); }
    }
  }
  return E;
}
