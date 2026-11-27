// fastreel story writer. The facts, the story and the script are written in their own MiniMax-M3 steps, before any art
// direction, each with its own prompt (engine/prompts/<step>.txt) and engine checks that reject and ask for a redo:
//   facts      reference + brief -> a numbered fact sheet, the viewer's question, its answer, the payoff fact
//              (it may name up to 2 more Wikipedia articles when the answer needs a number the reference lacks)
//   spine      fact sheet -> one shot per point: beat, the point, its facts, how it follows from the shot before, the
//              explanation device, a silent hold
//   script     spine -> spoken lines (1 to 3 a shot) with tones and pauses, the cue word each shot's picture change lands on
//   viewer     a test viewer who knows nothing reads the script blind: what was asked, what was answered, where it lost them
//   factcheck  the script against the brief, the reference and the fact sheet with each derived fact's calc (runs at the
//              same time as the viewer); a conflict between the brief and the reference is reported, not fixed
//   revise     the script step again with both reports (one round); if the revision fails the engine checks, the
//              script from before the review stays
// A script brief (template check "script: yes") has only the script step: its lines stay verbatim.
// The production plan (asset_reel.mjs, prompts/plan.txt) gets the finished script and adds the art direction and storyboard.

export const words = s => String(s).split(/\s+/).filter(Boolean).length;

// ---------- numbers as words: "SN 1987A" -> 'write "1987" as "nineteen eighty-seven"' (M3 ignores a bare "no digits") ----------
const ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' '), TENS = ' ten twenty thirty forty fifty sixty seventy eighty ninety'.split(' ');
const under100 = n => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
const under1000 = n => n < 100 ? under100(n) : `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ' and ' + under100(n % 100) : ''}`;
export const numWords = n => n >= 1100 && n < 2100 && n % 100 >= 10 ? `${under100(Math.floor(n / 100))} ${under100(n % 100)}` // a year
  : n < 1000 ? under1000(n) : n < 1e6 ? `${under1000(Math.floor(n / 1000))} thousand${n % 1000 ? ' ' + under1000(n % 1000) : ''}` : null;
export const spellDigits = t => [...new Set(t.match(/\d[\d,.]*/g) || [])].map(d => { const n = +d.replace(/,/g, ''), w = Number.isInteger(n) ? numWords(n) : null; return w ? `write "${d}" as "${w}"` : `write "${d}" in words`; }).join('; ');

// ---------- explanation devices: how a shot makes its point visible with the sound off (the spine picks one per shot) ----------
export const DEVICES = {
  yardstick: 'the number made felt next to something everyone knows (a person, a bus, a football pitch, a city, a lifetime), at true relative size',
  compare: 'two or three things side by side in their own boxes, each with its real number',
  counter: 'a number counting up or down to its real value',
  graph: 'a value changing over time, drawn as a line that draws itself',
  route: 'a journey or a spread drawn across a map',
  zoom: 'push in from the whole to the part, or pull out from the part to the whole, so the viewer sees where it sits',
  process: 'flow along a path: arrows or dots moving step by step to show what goes where and what it causes',
  'before-after': 'the same thing in two states, one turning into the other',
  build: 'the picture from the shot before gains one new part',
  act: 'a character acts the moment out (a reaction, a choice, a mistake)',
  reveal: 'something hidden appears: the answer, the real size, the twist',
  statement: 'one plain idea drawn simply, for a claim or a turn in the argument',
};
const DEVICE_TEXT = Object.entries(DEVICES).map(([k, v]) => `- ${k}: ${v}`).join('\n');
const LINKS = ['hook', 'but', 'so', 'because', 'which means', 'then', 'and'];

// ---------- text checks ----------
const toks = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s-]+/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean);
const NUM_WORD = new Set([...ONES, ...TENS.filter(Boolean), 'hundred', 'thousand', 'million', 'billion', 'trillion']);
const STOP = new Set(('a an the and or but so of to in on at for by with from as is are was were be been being it its it\'s this that these those he she they his her their them ' +
  'you your we our i my me what which who whom how why when where then than there here into onto out up down over under about after before just only also very more most ' +
  'can could would will should not no do does did has have had one all any each every some such own same too').split(' '));
const HYPE = /\b(astonishing|incredible|incredibly|amazing|remarkable|unbelievable|mind[- ]?blowing|insane|fascinating|staggering|stunning|crazy|game[- ]changer|jaw[- ]dropping|shocking)\b/i;
const LINK_WORDS = /\b(but|so|because|which|that's why|that is why|therefore|until|instead|yet|if|unless|then|while|although|though|means|meaning|after|when|why|since|without)\b/i;
const sameWord = (a, b) => a === b || (b.length >= 4 && (a.startsWith(b) || b.startsWith(a)) && Math.abs(a.length - b.length) <= 3);
const says = (text, phrase) => { const w = toks(text), p = toks(phrase); if (!p.length) return false; for (let i = 0; i + p.length <= w.length; i++) if (p.every((x, k) => sameWord(w[i + k], x))) return true; return false; };
// ---------- numbers and units ----------
// derived facts: plain factors any calculation may use. Decimal conversions (10, 1000, 1e6, 1e9) are gone: the unit table does them
// (M3 wrote 1 mm = 1,000,000 pm as "1 * 1000000"). Beside units, a calendar factor no fact states is the conversion the
// units already make, so it counts as 1: a right conversion still matches the text, a wrong one (the Moon
// walk's "/24 ... *24" mixing hours and days) does not
const FREE = new Set([1, 2, 3, 4, 7, 12, 24, 52, 60, 100, 365, 3600]), CALENDAR = new Set([7, 12, 24, 52, 60, 365, 3600]);
const MAG = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };
// each unit's SI factor and dimension [length, mass, time]; SI prefixes and plurals are read too ("km", "picometres", "mg", "hours")
const UNITS = {}, LEN = [1, 0, 0], MASS = [0, 1, 0], TIME = [0, 0, 1], Z = [0, 0, 0];
const defUnit = (names, k, d) => names.split(' ').forEach(n => { UNITS[n] = [k, d]; });
for (const [sym, names, k, d] of [['m', 'metre meter', 1, LEN], ['g', 'gram', 1e-3, MASS], ['s', 'sec second', 1, TIME]]) {
  defUnit(`${sym} ${names}`, k, d);
  for (const [p, f] of Object.entries({ p: 1e-12, n: 1e-9, µ: 1e-6, μ: 1e-6, m: 1e-3, c: 1e-2, k: 1e3 })) defUnit(p + sym, f * k, d);
  for (const [p, f] of Object.entries({ pico: 1e-12, nano: 1e-9, micro: 1e-6, milli: 1e-3, centi: 1e-2, kilo: 1e3, mega: 1e6, giga: 1e9 })) defUnit(names.split(' ').map(n => p + n).join(' '), f * k, d);
}
defUnit('min mins minute', 60, TIME); defUnit('h hr hrs hour', 3600, TIME); defUnit('d day', 86400, TIME); defUnit('wk week', 604800, TIME); defUnit('month', 2629800, TIME); defUnit('yr yrs year', 31557600, TIME);
defUnit('t tonne', 1e3, MASS); defUnit('lb lbs pound', 0.45359237, MASS); defUnit('mi mile', 1609.344, LEN); defUnit('kms', 1e3, LEN); defUnit('ft foot feet', 0.3048, LEN); defUnit('inch', 0.0254, LEN);
defUnit('au AU', 1.495978707e11, LEN); defUnit('ly light-year lightyear', 9.4607304725808e15, LEN); defUnit('l L litre liter', 1e-3, [3, 0, 0]); defUnit('ha hectare', 1e4, [2, 0, 0]);
// "km", "km/h", "km2", "m^3", "picometres" -> [SI factor, dimension], or null
const unitOf = tok => {
  let k = 1, d = Z;
  for (const [i, part] of String(tok).split('/').entries()) {
    const m = part.match(/^([A-Za-zµμ][A-Za-zµμ-]*?)\^?(-?\d)?$/); if (!m) return null;
    const n = m[1], low = n.toLowerCase(), u = UNITS[n] || (n.length > 2 && UNITS[[low, low.replace(/s$/, ''), low.replace(/es$/, '')].find(b => b.length > 2 && UNITS[b])]); // "has" is no hectare
    if (!u) return null;
    const e = (m[2] ? +m[2] : 1) * (i ? -1 : 1); k *= u[0] ** e; d = d.map((x, j) => x + u[1][j] * e);
  }
  return [k, d];
};
const sameDim = (a, b) => a.every((x, j) => x === b[j]);
const DIM_NAMES = { '1,0,0': 'a length', '0,1,0': 'a mass', '0,0,1': 'a time', '2,0,0': 'an area', '3,0,0': 'a volume', '1,0,-1': 'a speed', '0,0,0': 'a plain number' };
const dimName = d => DIM_NAMES[d.join(',')] || SI(d);
const SI = d => { const part = sg => d.map((e, j) => sg * e > 0 ? ['m', 'kg', 's'][j] + (sg * e === 1 ? '' : `^${sg * e}`) : '').filter(Boolean).join(' '), num = part(1), den = part(-1); return den ? (num ? `${num}/${den}` : `per ${den}`) : num; };
const SUP = '⁻⁰¹²³⁴⁵⁶⁷⁸⁹';
const normNum = s => String(s).replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, m => '^' + [...m].map(c => SUP.indexOf(c) ? SUP.indexOf(c) - 1 : '-').join('')).replace(/(\d),(?=\d{3}\b)/g, '$1');
// a number in digits: "1000", "4.6 billion", "1e-10", "1.5 × 10^7", "10^7"
const NUM = /(?<![\w.^])(\d+(?:\.\d+)?)(?!\d|(?:st|nd|rd|th)\b)(?:[eE]([+-]?\d+)|\s*[×x*]\s*10\^([+-]?\d+)|\^([+-]?\d+))?(?:\s+(thousand|million|billion|trillion)\b)?/gi;
const numVal = m => (m[4] != null ? (+m[1]) ** +m[4] : +m[1] * 10 ** +(m[2] ?? m[3] ?? 0)) * (MAG[(m[5] || '').toLowerCase()] || 1);
// the unit right after a number, or after one other word ("243 Earth days"), with a rate ("km/h", "per kg", "people per km2",
// "a year"); after money only a rate ("$60,500 per kg"); a glued single letter is none ("1990s", "5m")
function unitAfter(rest, money) {
  const glued = /^[A-Za-zµμ]/.test(rest), raw = rest.replace(/^-/, ' ').trim().split(/\s+/).slice(0, 6), w = raw.map(x => x.replace(/[.,;:!?)"'”’]+$/, ''));
  const rate = j => { if (!/^(per|an?|each|every)$/i.test(w[j] || '')) return null; const sq = /^(square|sq|cubic)$/i.test(w[j + 1] || ''), pw = /^cubic$/i.test(w[j + 1] || '') ? 3 : sq ? 2 : 1, u = unitOf(w[j + (sq ? 2 : 1)] || ''); return u && [u[0] ** pw, u[1].map(x => x * pw), sq ? 3 : 2]; };
  for (let i = 0; i < 2 && i < w.length; i++) {
    if (i && (/^\d/.test(w[0]) || /[.;:!?]$/.test(raw[0]))) break;
    const per = rate(i);
    if (per) return { u: w.slice(i, i + per[2]).join(' '), k: 1 / per[0], d: per[1].map(x => -x) };
    if (money) continue;
    let j = i, pow = 1;
    if (/^(square|sq|cubic)$/i.test(w[j])) { pow = /^cubic$/i.test(w[j]) ? 3 : 2; j++; }
    let u = w[j] && (i ? w[j].length > 2 : !glued || w[j].length > 1) && unitOf(w[j]); // after a skipped word only a unit's name
    if (!u) continue;
    u = [u[0] ** pow, u[1].map(x => x * pow)];
    const by = rate(j + 1);
    return { u: w.slice(i, by ? j + 1 + by[2] : j + 1).join(' '), k: by ? u[0] / by[0] : u[0], d: by ? u[1].map((x, k) => x - by[1][k]) : u[1] };
  }
  return null;
}
// the quantities a text states in digits: {n: the number, v: in SI units, d: dimension (null for a plain number), u: the unit as
// written, raw and mag: the digits and the magnitude word of "4.4 billion"}
function quantitiesIn(text) {
  const s = normNum(text), out = [];
  for (const m of s.matchAll(NUM)) {
    const n = numVal(m), u = unitAfter(s.slice(m.index + m[0].length), /[$€£¥]\s*$/.test(s.slice(0, m.index))), mag = m[2] || m[3] || m[4] ? '' : (m[5] || '').toLowerCase();
    out.push({ n, raw: +m[1], mag, ...(u ? { v: n * u.k, k: u.k, d: u.d, u: u.u } : { v: n, k: 1, d: null, u: '' }) });
  }
  return out;
}
// numbers in words: "ten thousand", "a million", "four point six billion", "nineteen eighty-seven", "nineteen oh five"
const WN = Object.fromEntries([...ONES.map((w, i) => [w, i]), ...TENS.map((w, i) => [w, i * 10]).filter(([w]) => w)]);
function wordNumbers(text) {
  return String(text).split(/[,;:.!?]/).flatMap(wordRuns);
}
function wordRuns(text) {
  const w = toks(text), out = [];
  for (let i = 0; i < w.length; i++) {
    const a = w[i] === 'a' && (w[i + 1] === 'hundred' || MAG[w[i + 1]]);
    if (!a && WN[w[i]] == null) continue;
    let j = a ? i + 1 : i, total = 0, cur = a ? (w[i - 1] === 'half' ? 0.5 : 1) : 0, frac = 0;
    for (; j < w.length; j++) {
      const x = w[j], v = WN[x];
      if (v != null && frac) { cur += v * frac; frac /= 10; }
      else if (v != null) cur = cur >= 10 && cur < 100 && v >= 10 ? cur * 100 + v : cur + v; // "nineteen eighty": a year
      else if (x === 'hundred') cur = (cur || 1) * 100;
      else if (MAG[x]) { total += (cur || 1) * MAG[x]; cur = 0; }
      else if (x === 'point' && WN[w[j + 1]] != null && !frac) frac = 0.1;
      else if (x === 'oh' && cur >= 10 && cur < 100 && WN[w[j + 1]] < 10) cur = cur * 100 + WN[w[++j]];
      else if (!(x === 'and' && WN[w[j + 1]] != null && (cur >= 100 || total))) break;
    }
    // a fraction, an ordinal or a decade is no count ("one ten-millionth", "twenty-first", "nineteen fifties"): not checked
    if (!/^(\w*(fif|six|seven|eigh|nin|ten|eleven|twelf|teen|tie|hundred|thousand|million|billion|trillion)ths?|fourths?|first|second|thirds?|halves|half|quarters?|(twent|thirt|fort|fift|sixt|sevent|eight|ninet)ies)$/.test(w[j] || ''))
      out.push({ s: w.slice(i, j).join(' '), v: total + cur, one: j === i + 1 && WN[w[i]] < 10 });
    i = j - 1;
  }
  return out;
}
// every number a text says, in digits or words, with its value; "one" marks a lone single digit ("one day", "2 things")
const numbersSaid = text => [...[...normNum(text).matchAll(NUM)].map(m => ({ s: m[0].trim(), v: numVal(m), one: /^\d$/.test(m[0].trim()) })), ...wordNumbers(text)];
const valuesIn = text => numbersSaid(text).map(n => n.v);
// the numbers a text says that no fact states (rounding allowed: within 5%), as written
const untraced = (text, facts) => { const have = facts.flatMap(x => valuesIn(x.text)); return numbersSaid(text || '').filter(n => !n.one && !have.some(v => Math.abs(n.v - v) <= Math.abs(v) * 0.05)).map(n => n.s); };
const quoted = xs => xs.map(x => `"${x}"`).join(', ');
// a calc with units ("1 mm / 100 pm", "120 km / (60 km/h)", "41 / 10000"): {v: in SI units, d: dimension, qs: its quantities, ops};
// unitOfBare(n) gives a bare number the unit the sheet states it with ({k, d, u}) or null; a bare number dropBare(n) holds
// counts as 1; throws a reason
function evalCalc(calc, unitOfBare = () => null, dropBare = () => false) {
  const src = normNum(calc), T = [], re = /\s*(?:(\d+(?:\.\d+)?(?:e[+-]?\d+)?)|([A-Za-zµμ](?:[\wµμ^]|-(?=[A-Za-z]))*(?:\/[A-Za-zµμ][\w^]*)*)|(\*\*|[-+*/()^×]))/iy;
  let pos = 0, m;
  for (;;) { re.lastIndex = pos; if (!(m = re.exec(src))) break; pos = re.lastIndex; T.push(m[1] ? { n: +m[1] } : m[2] ? { u: m[2] } : { op: m[3] === '×' ? '*' : m[3] === '**' ? '^' : m[3] }); }
  if (src.slice(pos).trim()) throw `"${src.slice(pos).trim()}" is not a number, a unit or + - * / ( )`;
  let p = 0; const qs = [], take = op => T[p]?.op === op && ++p;
  const add = (a, b, s) => { if (!sameDim(a.d, b.d)) throw `it adds or subtracts ${dimName(a.d)} and ${dimName(b.d)}`; return { v: a.v + s * b.v, d: a.d }; };
  const mul = (a, b, s) => ({ v: s > 0 ? a.v * b.v : a.v / b.v, d: a.d.map((x, j) => x + s * b.d[j]) });
  const expr = () => { let a = term(); for (;;) { if (take('+')) a = add(a, term(), 1); else if (take('-')) a = add(a, term(), -1); else return a; } };
  const term = () => { let a = unary(); for (;;) { if (take('*')) a = mul(a, unary(), 1); else if (take('/')) a = mul(a, unary(), -1); else return a; } };
  const unary = () => take('-') ? mul({ v: -1, d: Z }, unary(), 1) : take('+') ? unary() : power();
  const power = () => {
    const n = qs.length, a = atom(); if (!take('^')) return a;
    const neg = take('-'), t = T[p++]; if (t?.n == null) throw 'a power needs a number after ^';
    const e = neg ? -t.n : t.n; if (qs.length === n + 1 && !qs[n].u && !qs[n].drop) qs[n].n = qs[n].v = qs[n].n ** e; // 10^7 is one number
    return { v: a.v ** e, d: a.d.map(x => x * e) };
  };
  const atom = () => {
    const t = T[p++] || {};
    if (t.op === '(') { const a = expr(); if (!take(')')) throw 'a "(" is not closed'; return a; }
    if (t.n == null) throw t.u ? `the unit "${t.u}" needs a number before it (write a rate as one unit: km/h)` : 'a number is missing';
    let k = 1, d = Z, u = '', read = false, n = t.n;
    while (T[p]?.u && MAG[T[p].u.toLowerCase()]) n *= MAG[T[p++].u.toLowerCase()];
    if (T[p]?.u) { u = T[p++].u; const x = unitOf(u); if (!x) throw `"${u}" is not a unit the engine knows (m, km, mm, µm, nm, pm, g, kg, t, s, min, h, d, wk, yr, km/h, m/s, mi, ft, lb, au, ly, km2, m3, L)`; [k, d] = x; }
    else { const s = unitOfBare(n); if (s) { ({ k, d, u } = s); read = true; } }
    const drop = !u && dropBare(n), q = { n, u, v: drop ? 1 : n * k, d, read, drop }; qs.push(q); return { v: q.v, d };
  };
  const r = expr(); if (p < T.length) throw `"${T[p].op || T[p].u || T[p].n}" is out of place`;
  return { ...r, qs, ops: T.some(t => t.op && t.op !== '(' && t.op !== ')') };
}
const fmtNum = v => Math.abs(v) >= 1e12 || (v && Math.abs(v) < 1e-3) ? v.toPrecision(3) : Math.abs(v) >= 1e9 ? `${+(v / 1e9).toFixed(2)} billion` : Math.abs(v) >= 1e6 ? `${+(v / 1e6).toFixed(2)} million` : Math.abs(v) >= 1 ? `${+v.toFixed(2)}` : `${+v.toPrecision(3)}`;
// the time units a text names anywhere ("in a year", "annually", "daily"), as [SI factor, dimension, word]
const TIME_WORDS = { annually: 'year', yearly: 'year', monthly: 'month', weekly: 'week', daily: 'day', hourly: 'hour' };
const timeUnitsIn = text => toks(text).filter(w => w.length > 2).map(w => [unitOf(TIME_WORDS[w] || w), TIME_WORDS[w] || w]).filter(([u]) => u && sameDim(u[1], TIME)).map(([u, w]) => [...u, w.replace(/s$/, '')]);
const perTime = d => sameDim(d, [0, 0, -1]);
// a calc's result as the text would state it: in the text's own unit of that kind nearest the result, a rate per a time unit the
// text names, else in SI units
const shownIn = (r, text) => {
  if (!r.d.some(Boolean)) return fmtNum(r.v);
  const off = q => Math.abs(Math.log(Math.abs(q.v / r.v) || 1e-300)), tu = quantitiesIn(text).filter(q => q.d && sameDim(q.d, r.d)).sort((a, b) => off(a) - off(b))[0];
  const tw = perTime(r.d) && timeUnitsIn(text)[0];
  return tu ? `${fmtNum(r.v / (tu.v / tu.n))} ${tu.u}` : tw ? `${fmtNum(r.v * tw[0])} per ${tw[2]}` : `${fmtNum(r.v)} ${SI(r.d)}`;
};
// the quantities the non-derived facts state (what a calc may use), and how a bare number reads there: in the unit every fact
// that states it gives it ("378000 / 5" is 378000 km / 5 km/h, "/ 12" is "12 hours a day"), or with its magnitude ("4.4 / 8"
// is 4.4 billion / 8 billion); a plain factor stays bare
const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(Math.abs(a), Math.abs(b));
const sheetOf = facts => facts.filter(x => x.source !== 'derived').flatMap(x => quantitiesIn(x.text).map(q => ({ ...q, id: x.id })));
const bareUnit = sheet => n => {
  if (FREE.has(n) && !CALENDAR.has(n)) return null;
  const same = sheet.filter(s => near(s.n, n));
  if (same.length) return same.every(s => s.d && near(s.k, same[0].k) && sameDim(s.d, same[0].d)) ? same[0] : null;
  const scaled = sheet.filter(s => s.mag && near(s.raw, n)), per = s => s.v / s.raw;
  return scaled.length && scaled.every(s => near(per(s), per(scaled[0])) && sameDim(s.d || Z, scaled[0].d || Z)) ? { k: per(scaled[0]), d: scaled[0].d || Z, u: `${scaled[0].mag} ${scaled[0].u}`.trim() } : null;
};
const onSheet = (calc, sheet) => {
  const r = evalCalc(calc, bareUnit(sheet));
  return r.qs.some(q => q.d.some(Boolean)) ? evalCalc(calc, bareUnit(sheet), n => CALENDAR.has(n) && !sheet.some(s => near(s.n, n))) : r;
};
// the problems of one derived fact; [] when it holds
function calcErrors(x, sheet) {
  let r; try { r = onSheet(x.calc ?? '', sheet); } catch (e) { return [`fact ${x.id} is derived: its "calc" ${JSON.stringify(String(x.calc ?? ''))} does not compute (${e}). Give the arithmetic on the sheet's numbers, each quantity with its unit, for example "1 mm / 100 pm" or "41 / 10000"`]; }
  if (!r.ops) return [`fact ${x.id}: "calc" ${x.calc} has no arithmetic; compute it from the sheet's quantities (a conversion is "1 mm / 1 pm")`];
  if (!Number.isFinite(r.v)) return [`fact ${x.id}: "calc" ${x.calc} does not compute`];
  const read = r.qs.filter(q => q.read), dropped = [...new Set(r.qs.filter(q => q.drop).map(q => q.n))], odd = new Set();
  const readNote = read.length || dropped.length ? ` (the engine reads ${[...read.map(q => `${q.n} as ${q.n} ${q.u}`), ...(read.length ? ['as the sheet states them'] : []), ...(dropped.length ? [`${dropped.join(', ')} as the unit conversion the units already make`] : [])].join(', ')})` : '';
  for (const q of r.qs) {
    if (q.read || q.drop) continue;
    if (q.u) { if (q.n !== 1 && !sheet.some(s => s.d && sameDim(s.d, q.d) && near(s.v, q.v))) odd.add(`${q.n} ${q.u}, which no other fact on the sheet states`); continue; }
    const same = sheet.filter(s => near(s.n, q.n));
    if (FREE.has(q.n)) continue;
    if (!same.length) odd.add(`${q.n}, which no other fact on the sheet states`);
    else if (same.every(s => s.d)) odd.add(`${q.n} without its unit (the sheet states ${quoted([...new Set(same.map(s => `${q.n} ${s.u}`))])}: write the one you mean)`);
  }
  // a calc rests on the sheet, and 100 is not chained into a decimal factor ("100 * 100 * 100" passed 1 mm = 1,000,000 pm)
  if (!odd.size && !r.qs.some(q => q.read || q.u || sheet.some(s => near(s.n, q.n)))) odd.add('no number the sheet states');
  if (r.qs.filter(q => !q.u && !q.read && q.n === 100).length > 1) odd.add('100 more than once (a chain of 100s is a hand-made decimal factor)');
  if (odd.size) return [`fact ${x.id}: "calc" ${x.calc} uses ${[...odd].join('; ')}${readNote}. Use only the sheet's own numbers, each with its unit as the sheet states it; the engine converts units itself and states the result in the text's unit, so never write a conversion factor such as 1000 or 1000000`];
  const tq = quantitiesIn(x.text), close = (a, b) => Math.abs(a - b) <= Math.abs(b) * 0.03 + 1e-300; // relative only: an absolute margin let 0.00004 pass for 0.00017
  const ok = r.d.some(Boolean) ? tq.some(q => q.d && sameDim(q.d, r.d) && close(q.v, r.v)) || (perTime(r.d) && timeUnitsIn(x.text).some(u => tq.some(q => !q.d && close(q.n, r.v * u[0]))))
    : valuesIn(x.text).some(v => close(v, r.v));
  return ok ? [] : [`fact ${x.id}: "calc" ${x.calc} gives ${shownIn(r, x.text)}${readNote}, but its text says "${x.text}". One of calc or text is wrong: check the calc's factors and units first (every quantity with its unit, as the sheet states it), then the claim; never change a true claim to fit the arithmetic`];
}
// a derived fact for the fact checker and the fixer: its calc, and that it holds (a second rounding of the result, "= 8.62 years"
// beside a text of 8.63, set off a nitpick fix that split the narration from the tags)
const calcShown = (x, sheet) => `${x.calc}; ${calcErrors(x, sheet).length ? 'the engine found it does not match its text' : 'the engine computed it, units converted, and it matches its text'}`;
const calcList = f => { const facts = f?.facts || [], sheet = sheetOf(facts); return facts.map(x => `${x.id}: ${x.text}${x.source === 'derived' ? ` [derived: ${calcShown(x, sheet)}]` : ''}`).join('\n'); };
// a soft problem: asked to be fixed, but an answer left with only soft problems is kept after the last try
const soft = msg => Object.assign(new String(msg), { soft: true });
const digitNums = s => (String(s).replace(/(\d),(\d)/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []).map(Number);

// runs of number words with the word after them ("ten thousand bitcoins" -> "ten thousand bitcoin"); single digits are skipped
function numberPhrases(text) {
  const w = toks(text), out = [];
  for (let i = 0; i < w.length;) {
    if (!NUM_WORD.has(w[i])) { i++; continue; }
    let j = i; while (j < w.length && (NUM_WORD.has(w[j]) || (w[j] === 'and' && NUM_WORD.has(w[j + 1] || '')) || (w[j] === 'point' && NUM_WORD.has(w[j + 1] || '')))) j++;
    const run = w.slice(i, j);
    if (!(run.length === 1 && ONES.indexOf(run[0]) < 10)) out.push(`${run.join(' ')} ${(w[j] || '').replace(/s$/, '')}`.trim());
    i = j;
  }
  return out;
}
// a number phrase, or 4 words in a row with 3 content words, said by the narrator in two shots (the last shot may call one back)
function repeatErrors(shots) {
  const seen = new Map(), E = new Map();
  shots.forEach((s, i) => {
    if (i === shots.length - 1) return;
    const keys = new Map();
    for (const l of s.lines || []) {
      if (l.who !== 'narrator') continue;
      const w = toks(l.text);
      for (let k = 0; k + 4 <= w.length; k++) { const g = w.slice(k, k + 4); if (g.filter(x => !STOP.has(x)).length >= 3) keys.set(g.join(' '), g.join(' ')); }
      for (const p of numberPhrases(l.text)) keys.set('#' + p, p);
    }
    for (const [k, shown] of keys) {
      if (seen.has(k) && seen.get(k) !== i) { const j = seen.get(k), id = `${j}-${i}`; if (!E.has(id)) E.set(id, soft(`shots ${j + 1} and ${i + 1} both say "${shown}": say it once (one shot, one new point; only the last shot may call it back)`)); }
      else seen.set(k, i);
    }
  });
  return [...E.values()];
}

// script lines from a script brief: **Name:** "text", **Name (inner monologue):** "text", or Name: "text" on its own line
const scriptLinesOf = brief => {
  const out = [], re1 = /\*\*([^*\n]+?):\*\*\s*["“]([^"”\n]+)["”]/g, re2 = /^([A-Z][\w .()'’-]{0,40}):\s*["“]([^"”\n]+)["”]\s*$/gm;
  for (const m of brief.matchAll(re1)) out.push({ who: m[1].trim(), text: m[2].trim(), at: m.index });
  if (!out.length) for (const m of brief.matchAll(re2)) out.push({ who: m[1].trim(), text: m[2].trim(), at: m.index });
  return out.sort((a, b) => a.at - b.at);
};
const normWords = s => String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9$.]+/g, ' ').split(' ').filter(w => w && !/^\.+$/.test(w)).map(w => w.replace(/\.+$/, ''));
// a line matches a script line when the words are the same; script words with digits or symbols ($49.99) may be spelled out
const sameLine = (script, line) => {
  const a = normWords(script), b = normWords(line);
  if (!a.some(w => /[0-9$]/.test(w))) return a.join(' ') === b.join(' ');
  const plain = a.filter(w => !/[0-9$]/.test(w)); let k = 0; for (const w of b) if (w === plain[k]) k++;
  return k === plain.length && b.length >= plain.length;
};

// ---------- the brief ----------
// brief.txt from the harness is the user's request, then the intake's Audience, Goal and Tone lines (src/intake.ts briefText):
// its reading of the request, never facts (a Goal line's "a lifetime or more" was defended against the sheet's own 9 years)
const NOTE = /^(Audience|Goal|Tone):/;
export const requestOf = brief => String(brief).split(/\r?\n/).filter(l => !NOTE.test(l.trim())).join('\n').trim();
const briefFor = brief => {
  const notes = String(brief).split(/\r?\n/).filter(l => NOTE.test(l.trim())).join('\n');
  return `${requestOf(brief)}${notes ? `\n(The lines below are the intake's reading of the request, never facts: the facts come from the fact sheet and the reference.)\n${notes}` : ''}`;
};

// ---------- the fact sheet's checks ----------
// E: brief, hasRef(), numbersNotIn(texts)
export function factErrors(f, E) {
  const Er = [];
  if (!Array.isArray(f?.facts) || f.facts.length < 6 || f.facts.length > 24) return [`need 10 to 20 facts in "facts", got ${f?.facts?.length}`];
  const ids = new Set();
  f.facts.forEach((x, i) => {
    if (!x?.id || !x.text) Er.push(`fact ${i + 1} needs "id" and "text"`);
    if (ids.has(x.id)) Er.push(`fact id "${x.id}" is used twice`); ids.add(x.id);
    if (!['reference', 'brief', 'general', 'derived'].includes(x.source)) Er.push(`fact ${x.id}: "source" must be reference, brief, general or derived`);
  });
  // a problem with one fact: dropped from the sheet after the last try, unless it is the payoff fact (then the sheet is retried)
  const bad = (x, msg) => Er.push(x.id === f.payoff ? msg : Object.assign(soft(msg), { drop: x.id }));
  // derived facts: the engine does the arithmetic, with units (M3 once said $41 for 10,000 coins was "about twenty cents each")
  const sheet = sheetOf(f.facts);
  for (const x of f.facts.filter(x => x.source === 'derived')) for (const e of calcErrors(x, sheet)) bad(x, e);
  if (!f.question || !f.answer) Er.push('need "question" and "answer"');
  if (!ids.has(f.payoff)) Er.push(`"payoff" must be the id of the fact that answers the question, got "${f.payoff}"`);
  // a fact the sheet says comes from the brief must have its numbers in the brief (M3 marked an invented present-day value "brief")
  const briefVals = valuesIn(requestOf(E.brief));
  for (const x of f.facts.filter(x => x.source === 'brief')) {
    const nums = valuesIn(x.text).filter(n => n >= 10 && !briefVals.some(b => Math.abs(b - n) <= n * 0.005)).map(fmtNum);
    if (nums.length) bad(x, `fact ${x.id} ("${x.text}") is marked "brief", but the brief never states ${nums.join(', ')}: take it from the REFERENCE (source "reference"), derive it from the sheet's numbers (source "derived" with "calc"), or drop it`);
  }
  // a fact the sheet says comes from the reference must have its numbers there (M3 marked invented dates "reference")
  if (E.hasRef()) for (const x of f.facts.filter(x => x.source === 'reference')) {
    const nums = E.numbersNotIn([x.text]);
    if (nums.length) bad(x, `fact ${x.id} ("${x.text}") says ${quoted(nums)}, which the REFERENCE never states: use the reference's own number, or drop the fact`);
  }
  // the answer and the yardstick are free text the spine and script build on: their numbers must be facts that hold
  // (a yardstick said "10,000 km" beside a sheet whose ratio made it 10 km; an answer said "19 years" beside a 2,442-day payoff)
  const held = f.facts.filter(x => !Er.some(e => e.drop === x.id)), ans = untraced(String(f.answer || ''), held), yd = untraced(String(f.yardstick || ''), held);
  if (ans.length) Er.push(`the answer ("${f.answer}") says ${quoted(ans)}, which no fact on the sheet states: give the answer with the payoff fact's own number`);
  if (yd.length) Er.push(Object.assign(soft(`the yardstick ("${f.yardstick}") says ${quoted(yd)}, which no fact on the sheet states: build it only from the sheet's numbers (a scaled number is a derived fact first, with its calc), or leave it empty`), { drop: 'yardstick' }));
  return Er;
}

// numbers in `texts` that `src` (the reference and the brief) never states: digits compared without separators, a magnitude by
// value ("1 million" = "a million" = "1,000,000"), a full date as one unit ("6 June 1905"); one-digit numbers alone pass
const MON = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const DATE = new RegExp(`\\b(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MON})|(${MON})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?)\\b(?:,?\\s+(\\d{3,4})\\b)?`, 'gi');
const datesIn = text => [...String(text).matchAll(DATE)].map(m => ({ s: m[0], day: +(m[1] || m[4]), name: m[2] || m[3], mon: (m[2] || m[3]).slice(0, 3).toLowerCase(), year: m[5] || '' })).filter(d => d.day >= 1 && d.day <= 31 && !/^may$/.test(d.name)); // "30 may have died"
export function numbersNotInSource(src, texts) {
  const plain = src.replace(/(\d),(\d)/g, '$1$2'), have = new Set((plain.match(/\d+(?:\.\d+)?/g) || []).map(n => n.replace(/^0+(?=\d)/, ''))), vals = valuesIn(src);
  const stated = v => vals.some(x => Math.abs(x - v) <= Math.abs(v) * 1e-9), out = new Set();
  for (const t of texts) for (const m of String(t).replace(/(\d),(\d)/g, '$1$2').matchAll(/\d+(?:\.\d+)?/g)) { const n = m[0].replace(/^0+(?=\d)/, ''); if (n.length >= 2 && !have.has(n) && !stated(+n)) out.add(m[0]); }
  for (const t of texts) for (const m of String(t).replace(/(\d),(\d)/g, '$1$2').matchAll(/(\d+(?:\.\d+)?)\s*(thousand|million|billion|trillion)/gi)) if (!stated(+m[1] * MAG[m[2].toLowerCase()])) out.add(m[0]); // "1 TRILLION": the magnitude too
  const srcDates = datesIn(src);
  for (const t of texts) for (const d of datesIn(t)) if (!srcDates.some(s => s.day === d.day && s.mon === d.mon && (!d.year || s.year === d.year))) out.add(d.s);
  return [...out];
}

// ---------- the writer ----------
// E (from asset_reel.mjs): brief, seconds, m3(step, system, messages, maxTokens), prompt(name), guide(...sections), checks(), range, list,
// ckSave, ckLoad, log, extractJson, refBlock(), hasRef(), addArticles(titles), numbersNotIn(texts), voiceGuide, feels, wpsOf(cast), padOf(shots)
export function createWriter(E) {
  const { brief, seconds, log } = E;
  const ck = () => E.checks();
  const SCRIPT = () => ck().script === 'yes';
  const shotRange = () => E.range(ck().shots) || [5, 9];
  const beatsOf = () => E.list(ck().beats), needBeats = () => E.list(ck()['required beats']);
  const wps = cast => E.wpsOf(cast ? { cast } : null);
  const budgetFor = (shots, cast) => Math.floor((seconds - E.padOf(shots)) * wps(cast));
  const factList = f => (f?.facts || []).map(x => `${x.id}: ${x.text}`).join('\n');
  const storyGuide = () => E.guide('about', 'story', 'plan', 'sound');

  // one step: ask, check, and on a rejection send the problems back in the same conversation (up to `tries` answers).
  // Soft problems (craft: a reused fact, too many "and" links, a repeat, unvoiced links) are fixed while tries remain; an answer
  // whose only problems are soft is kept after the last try (logged), so a hard-to-please check never stops the run.
  async function ask(step, system, messages, check, tries = 4) {
    let keep = null;
    for (let a = 1; a <= tries; a++) {
      const text = await E.m3(`${step}#${a}`, system, messages, 32000);
      let o, errs; try { o = E.extractJson(text); errs = await check(o); } catch (e) { errs = [e.message]; }
      messages.push({ role: 'assistant', content: text || '(empty)' });
      if (!errs.length) return o;
      if (errs.every(e => e.soft) && (!keep || errs.length <= keep.n)) keep = { o, n: errs.length, errs };
      log(`${step} rejected: ${errs.slice(0, 4).join('; ')}`);
      if (a < tries) messages.push({ role: 'user', content: `Fix these problems and return the complete JSON:\n- ${errs.join('\n- ')}` });
    }
    if (keep) log(`${step}: kept the answer with only craft problems left: ${keep.errs.join('; ')}`);
    return keep ? keep.o : null;
  }

  // ---------- facts ----------
  async function writeFacts() {
    const saved = E.ckLoad('facts.json'); if (saved) { log('facts: restored from checkpoint'); return JSON.parse(saved); }
    const system = () => `${E.prompt('facts')}\n\n${E.guide('about', 'story')}${E.refBlock()}`;
    const check = x => factErrors(x, E);
    const clean = x => { if (!x) return x; const drop = new Set(check(x).map(e => e.drop).filter(Boolean)); if (drop.has('yardstick')) { log(`facts: dropped the yardstick "${x.yardstick}" (a number not on the sheet)`); x.yardstick = ''; drop.delete('yardstick'); } if (drop.size) { log(`facts: dropped ${[...drop].join(', ')} (failed their check)`); x.facts = x.facts.filter(y => !drop.has(y.id)); } return x; };
    let f = clean(await ask('facts', system(), [{ role: 'user', content: `Brief: ${briefFor(brief)}\nReturn only the JSON object.` }], check));
    if (!f) throw new Error('no usable fact sheet');
    // "need": {article, look_for} (its passages holding those words) or an article title (its first 4000 chars)
    const need = (Array.isArray(f.need) ? f.need : []).filter(t => (typeof t === 'string' && t.trim()) || (typeof t?.article === 'string' && t.article.trim())).slice(0, 2);
    const names = need.map(n => (typeof n === 'string' ? n : `${n.article}${n.look_for?.length ? ` (${n.look_for.join(', ')})` : ''}`)).join('; ');
    if (need.length) { // the answer needs a fact the reference lacks: fetch it once and build the sheet again
      const added = await E.addArticles(need);
      log(`facts: fetched ${names} (${added} chars) for missing facts`);
      if (added) { const f2 = await ask('facts-more', system(), [{ role: 'user', content: `Brief: ${briefFor(brief)}\nThe REFERENCE now also holds what you asked for: ${names}. Return only the JSON object, with "need" empty.` }], check); if (f2) f = clean(f2); }
    }
    E.ckSave('facts.json', f);
    log(`facts: ${f.facts.length} (${['reference', 'brief', 'general', 'derived'].map(s => `${f.facts.filter(x => x.source === s).length} ${s}`).join(', ')}); Q: ${f.question} | payoff ${f.payoff}`);
    return f;
  }

  // ---------- spine ----------
  function spineErrors(sp, f) {
    const Er = [], [smin, smax] = shotRange(), n = sp?.shots?.length;
    if (!Array.isArray(sp?.shots) || n < smin || n > smax) return [`need ${smin} to ${smax} shots, got ${n}`];
    const ids = new Set(f.facts.map(x => x.id)), used = new Map(), beats = beatsOf();
    sp.shots.forEach((s, i) => {
      if (!s.point) Er.push(`shot ${i + 1} needs "point"`);
      if (beats.length && !beats.includes(String(s.beat || '').toLowerCase())) Er.push(`shot ${i + 1} needs "beat": one of ${beats.join(', ')}`);
      if (!DEVICES[s.device]) Er.push(`shot ${i + 1}: "device" must be one of ${Object.keys(DEVICES).join(', ')}`);
      if (i && !LINKS.slice(1).includes(String(s.link || '').toLowerCase())) Er.push(`shot ${i + 1}: "link" must be one of ${LINKS.slice(1).join(', ')}`);
      if (!(+s.hold >= 0 && +s.hold <= 2)) s.hold = Math.max(0, Math.min(2, +s.hold || 0));
      for (const id of s.facts || []) { if (!ids.has(id)) Er.push(`shot ${i + 1} uses fact "${id}", which is not in the sheet`); else used.set(id, [...(used.get(id) || []), i]); }
    });
    // one fact, one shot; a fact the hook teases may be explained once later, and the last shot may call back the hook or the payoff
    const hookFacts = new Set(sp.shots[0].facts || []);
    for (const [id, at] of used) {
      if (at.length < 2) continue;
      const ok = at.length === 2 && (at[0] === 0 || (at[1] === n - 1 && (id === f.payoff || hookFacts.has(id))));
      if (!ok) Er.push(soft(`fact ${id} is used in shots ${at.map(x => x + 1).join(', ')}: one fact, one shot (the hook may tease a fact one later shot explains; the last shot may call back the hook or the payoff)`));
    }
    const have = new Set(sp.shots.map(s => String(s.beat || '').toLowerCase()));
    if (beats.length) needBeats().filter(b => !have.has(b)).forEach(b => Er.push(`no shot covers the "${b}" beat; the template requires it`));
    const p = +sp.payoff_shot;
    if (!(p >= 2 && p <= n)) Er.push(`"payoff_shot" must be a shot from 2 to ${n} (the one that answers the question), got ${sp.payoff_shot}`);
    else if (!(sp.shots[p - 1].facts || []).includes(f.payoff)) Er.push(`the payoff shot (${p}) must use the payoff fact ${f.payoff}`);
    if ((sp.shots[0].facts || []).includes(f.payoff)) Er.push(`the hook (shot 1) uses the payoff fact ${f.payoff}: the hook opens the question and holds the answer back for the payoff shot`);
    const ands = sp.shots.slice(1).filter(s => String(s.link).toLowerCase() === 'and').length;
    if (ands > 2) Er.push(soft(`${ands} shots only follow with "and": that is a list of facts, not a story. Make each shot follow from the one before (but, so, because, which means), or merge or cut it`));
    const holds = sp.shots.reduce((a, s) => a + (+s.hold || 0), 0);
    if (holds > 3.5) Er.push(soft(`the holds add up to ${holds.toFixed(1)} s; keep them on the reveal and the answer, at most 3 s in all`));
    return Er;
  }
  async function writeSpine(f) {
    const saved = E.ckLoad('spine.json'); if (saved) { log('spine: restored from checkpoint'); return JSON.parse(saved); }
    const [smin, smax] = shotRange(), beats = beatsOf();
    const system = `${E.prompt('spine').replace('{{DEVICES}}', DEVICE_TEXT).replace('{{DEVICE_NAMES}}', Object.keys(DEVICES).join(', '))}\n\n${storyGuide()}${beats.length ? `\n\nBEATS: give every shot a "beat" from: ${beats.join(', ')}. Required: ${needBeats().join(', ') || 'none'}.` : ''}`;
    const user = `Brief: ${briefFor(brief)}\nTarget length: ${seconds} seconds: ${smin === smax ? smin : `${Math.max(smin, 6)} to ${Math.min(smax, Math.max(smin, 8))}`} shots, about ${E.budget} spoken words in all.\n\nFACT SHEET\nQuestion: ${f.question}\nAnswer: ${f.answer}\nPayoff fact: ${f.payoff}\nYardstick: ${f.yardstick || '(none)'}\n${factList(f)}\n\nReturn only the JSON object.`;
    const sp = await ask('spine', system, [{ role: 'user', content: user }], o => spineErrors(o, f));
    if (!sp) throw new Error('no usable story spine');
    E.ckSave('spine.json', sp);
    log(`spine: ${sp.shots.length} shots, payoff shot ${sp.payoff_shot}: ${sp.shots.map((s, i) => `${i + 1} ${s.beat || ''}/${s.device}${i ? `(${s.link})` : ''}`).join(' ')}`);
    return sp;
  }

  // ---------- script ----------
  // the engine checks of a script; sp = spine (null for a script brief), f = fact sheet (null for a script brief)
  function scriptErrors(o, sp, f) {
    const Er = [];
    if (!o?.cast?.narrator) Er.push('"cast" needs "narrator" with a voice');
    if (!Array.isArray(o?.shots) || !o.shots.length) return [...Er, 'need "shots"'];
    if (sp && o.shots.length !== sp.shots.length) return [...Er, `need exactly ${sp.shots.length} shots, one per spine shot, got ${o.shots.length}`];
    const shots = o.shots.map((s, i) => ({ ...(sp ? sp.shots[i] : {}), ...s, ...(sp ? { beat: sp.shots[i].beat, hold: sp.shots[i].hold } : {}) }));
    if (!sp) { // a script brief: the script step also does the spine's job
      const [smin, smax] = shotRange(), beats = beatsOf();
      if (shots.length < smin || shots.length > smax) Er.push(`need ${smin} to ${smax} shots, got ${shots.length}`);
      if (beats.length) { shots.forEach((s, i) => { if (!beats.includes(String(s.beat || '').toLowerCase())) Er.push(`shot ${i + 1} needs "beat": one of ${beats.join(', ')}`); }); const have = new Set(shots.map(s => String(s.beat || '').toLowerCase())); needBeats().filter(b => !have.has(b)).forEach(b => Er.push(`no shot covers the "${b}" beat; it is required by the template`)); }
      shots.forEach(s => { s.hold = Math.max(0, Math.min(2, +s.hold || 0)); });
    }
    const cast = new Set(Object.keys(o.cast || {}));
    let total = 0;
    shots.forEach((s, i) => {
      if (!Array.isArray(s.lines) || !s.lines.length) { Er.push(`shot ${i + 1} has no lines`); return; }
      if (!SCRIPT() && s.lines.length > 3) Er.push(`shot ${i + 1} has ${s.lines.length} lines; at most 3 per shot`);
      s.lines.forEach(l => {
        total += words(l.text);
        if (/[0-9]/.test(l.text)) Er.push(`shot ${i + 1}: line "${l.text}" has digits; write numbers as words, including inside names (${spellDigits(l.text)})`);
        if (!cast.has(l.who)) Er.push(`shot ${i + 1}: speaker "${l.who}" is not in cast`);
        if (l.gap_before != null && !(+l.gap_before >= 0 && +l.gap_before <= 1.5)) l.gap_before = Math.max(0, Math.min(1.5, +l.gap_before || 0));
        if (!SCRIPT() && l.who === 'narrator' && HYPE.test(l.text)) Er.push(soft(`shot ${i + 1}: "${l.text.match(HYPE)[0]}" is a hype word; say the concrete thing instead (the real number, the real size, what actually happened)`));
      });
      if (!s.cue?.word) Er.push(`shot ${i + 1} needs "cue": {"word", "show"}`);
      else if (!s.lines.some(l => says(l.text, s.cue.word))) Er.push(`shot ${i + 1}: the cue word "${s.cue.word}" is not said in its lines; cue a word the lines say`);
    });
    if (shots.some(s => !Array.isArray(s.lines) || !s.lines.length)) return Er; // every problem else goes back in one round
    if (SCRIPT()) { Er.push(...verbatimErrors(shots)); }
    else {
      Er.push(...repeatErrors(shots));
      const first = shots[0].lines[0].text;
      if (/^((an?|the)\s+)?[\w-]+(\s+[\w-]+)?\s+(is|are|was|were|means|refers to|removes|describes|is defined as)\b/i.test(first)) Er.push(`shot 1 opens with a definition ("${first}"). Open with a hook instead (a surprising fact, a striking image or a question the viewer wants answered) and give the definition in the next line`);
      // template check "hook: number or question": M3 kept opening with a general claim despite the template's prose
      if (ck().hook === 'number or question' && !/\?\s*$/.test(first) && !toks(first).some(w => NUM_WORD.has(w) || ['half', 'dozen'].includes(w)))
        Er.push(`shot 1's line "${first}" is not a hook: it has no number and is not a question. Open with a surprising real number (written as words) or a question that ends with "?"`);
      if (f && sp) {
        // the payoff's OWN numbers: those no other fact on the sheet holds (the payoff fact often restates the setup's number)
        const pay = f.facts.find(x => x.id === f.payoff), other = new Set(f.facts.filter(x => x.id !== f.payoff).flatMap(x => digitNums(x.text)));
        // a decimal (44.2) is checked by its whole part ("forty-four ... point two"): numWords(44.2) gave "forty-undefined"
        const own = digitNums(pay?.text).filter(n => n >= 10 && !other.has(n)).map(n => numWords(Math.trunc(n))).filter(Boolean);
        const hook = shots[0].lines.map(l => l.text).join(' '), ps = shots[+sp.payoff_shot - 1];
        for (const w of own) if (says(hook, w)) Er.push(soft(`the hook says "${w}", the answer's number: hold it back for the payoff shot (${sp.payoff_shot}) and open the question instead`));
        if (own.length && ps && !own.some(w => ps.lines.some(l => says(l.text, w)))) Er.push(soft(`the payoff shot (${sp.payoff_shot}) must say the answer's own number in words (${own.map(w => `"${w}"`).join(' or ')}, from ${pay.id}: ${pay.text})`));
        const linked = shots.slice(1).filter(s => s.lines.some(l => LINK_WORDS.test(l.text))).length, want = Math.ceil((shots.length - 1) / 3);
        if (linked < want) Er.push(soft(`only ${linked} of shots 2 to ${shots.length} say how they follow from the shot before; voice the spine's links ("but", "so", "because", "which means", "that's why", "until"): at least ${want} shots`));
        // every number said must be one the sheet states (nothing else checks a spoken number against the facts)
        shots.forEach((s, i) => s.lines.forEach(l => { const n = untraced(l.text, f.facts); if (n.length) Er.push(`shot ${i + 1}: "${l.text}" says ${quoted(n)}, which no fact on the sheet states: say the sheet's numbers (rounding is fine) or leave the number out`); }));
      }
    }
    const allowed = budgetFor(shots, o.cast), rate = wps(o.cast);
    if (total > allowed * 1.05) {
      const per = Math.floor(allowed / shots.length), long = shots.map((s, i) => [i + 1, s.lines.reduce((a, l) => a + words(l.text), 0)]).filter(([, n]) => n > per + 2);
      // up to 30% over is soft: with thinking off M3 cannot count while rewriting the whole script (it returned the same 116
      // words for a 102 budget twice), so fitWords cuts the long shots to exact targets in a small call of its own
      const msg = `the lines total ${total} words; with ${shots.length} shots and their pauses the budget is ${allowed} words (the narrator speaks about ${rate} words a second), about ${per} per shot. Cut ${total - allowed} words: ${long.length ? long.map(([k, n]) => `shot ${k} has ${n}, cut it to ${per}`).join('; ') : 'a few from the longest shots'}. Count each shot's words before returning.`;
      Er.push(total > allowed * 1.3 ? msg : soft(msg)); // a soft overrun is cut to length by fitWords

    } else if (!SCRIPT() && total < allowed * 0.8) { const msg = `the lines total only ${total} words, so the reel would run about ${Math.round(E.padOf(shots) + total / rate)} s instead of ${seconds} s. Use ${Math.ceil(allowed * 0.85)} to ${allowed} words.`; Er.push(total < allowed * 0.7 ? msg : soft(msg)); }
    return Er;
  }
  // a script brief: every scripted line appears once, word for word, in order (numbers and symbols may become words)
  function verbatimErrors(shots) {
    const S = scriptLinesOf(brief); if (!S.length) return [];
    const L = shots.flatMap((s, i) => (s.lines || []).map(l => ({ shot: i + 1, text: l.text })));
    const Er = []; let k = 0;
    for (const [n, s] of S.entries()) {
      const hits = L.filter(l => sameLine(s.text, l.text));
      if (hits.length > 1) Er.push(`script line ${n + 1} ("${s.text}") appears ${hits.length} times (shots ${hits.map(h => h.shot).join(', ')}); use it once`);
      const j = L.findIndex((l, i) => i >= k && sameLine(s.text, l.text));
      if (j < 0) Er.push(`script line ${n + 1} is missing or changed: it must be exactly "${s.text}" (${s.who})${hits.length ? ', in its script order' : ''}`);
      else k = j + 1;
    }
    L.filter(l => !S.some(s => sameLine(s.text, l.text))).forEach(l => Er.push(`shot ${l.shot} has a line that is not in the script: "${l.text}"; every line must be a script line, word for word`));
    return Er;
  }
  const scriptSystem = () => `${E.prompt('script').replace('{{VOICES}}', E.voiceGuide).replace('{{FEELS}}', E.feels)}\n\n${storyGuide()}`;

  // cut an over-budget script to length: a small call (fit.txt) rewrites only the longest shots to exact word targets, up to 2
  // rounds; a shot's cut is taken only if it is shorter, has no digits, keeps its speakers and still says its cue word, and the
  // whole cut script is kept only if it passes every hard check
  const countWords = s => s.lines.reduce((a, l) => a + words(l.text), 0);
  // a small call that rewrites only some shots' lines ({shots: [{shot, lines}]}); a shot's new lines are taken only if they have no
  // digits, keep the cast, still say the cue word and pass `accept(old shot, new lines, shot index)`
  async function editShots(step, promptName, req, cur, accept, context = '') {
    const text = await E.m3(step, `${E.prompt(promptName)}${context}`, [{ role: 'user', content: `${JSON.stringify({ shots: req }, null, 1)}\n\nReturn only the JSON object.` }], 8000);
    let r; try { r = E.extractJson(text); } catch { return cur; }
    const asked = new Set(req.map(q => q.shot - 1)), next = { ...cur, shots: cur.shots.map(s => ({ ...s })) };
    for (const x of r?.shots || []) {
      const i = +x.shot - 1, s = next.shots[i];
      if (!s || !asked.has(i) || !Array.isArray(x.lines) || !x.lines.length) continue;
      const lines = x.lines.filter(l => l?.text).map((l, k) => ({ ...(s.lines[k] || {}), who: l.who || s.lines[0].who, text: String(l.text).trim(), ...(l.tone ? { tone: l.tone } : {}) }));
      const ok = lines.length && lines.every(l => !/[0-9]/.test(l.text) && cur.cast?.[l.who]) && (!s.cue?.word || lines.some(l => says(l.text, s.cue.word)));
      if (ok && accept(s, lines, i)) s.lines = lines;
    }
    return next;
  }
  // a rewrite brings no number the sheet does not state (a fix once "corrected" a line to a number no fact held)
  const newNumbers = (lines, f) => lines.flatMap(l => untraced(l.text, f.facts));
  const sameLines = (a, b) => a.lines.map(l => l.text).join('\n') === b.lines.map(l => l.text).join('\n');
  // fix the claims a fact check flagged, shot by shot (a whole-script revision kept the wrong claim), keeping the length
  async function fixClaims(o, sp, f, problems) {
    const byShot = {}; for (const p of problems || []) if (o.shots[+p.shot - 1]) (byShot[+p.shot - 1] ||= []).push({ claim: p.claim, problem: p.problem, fix: p.fix });
    const req = Object.entries(byShot).map(([i, ps]) => ({ shot: +i + 1, max_words: countWords(o.shots[i]) + 2, keep: [o.shots[i].cue?.word].filter(Boolean), problems: ps, lines: o.shots[i].lines.map(l => ({ who: l.who, text: l.text, tone: l.tone })) }));
    if (!req.length) return o;
    // the fixer sees the sheet (with each derived fact's calc) and the reference: the fact checker once reversed who paid whom, and its "fix" must not be applied blindly
    const cur = await editShots('script-fix', 'fix', req, o, (s, lines, i) => {
      const n = newNumbers(lines, f); if (n.length) { log(`script-fix: shot ${i + 1}'s fix says ${quoted(n)}, which no fact on the sheet states; not taken`); return false; }
      return lines.reduce((a, l) => a + words(l.text), 0) <= countWords(s) + 3;
    }, `\n\nFACT SHEET\n${calcList(f)}${E.refBlock()}`);
    const changed = req.map(q => q.shot).filter(n => !sameLines(cur.shots[n - 1], o.shots[n - 1]));
    if (!changed.length) { log(`script-fix: no fix was taken for shots ${req.map(q => q.shot).join(', ')}; keeping the script`); return o; }
    if (scriptErrors(cur, sp, f).some(e => !e.soft)) { log('script-fix: the fix broke a check; keeping the script'); return o; }
    log(`script-fix: rewrote shots ${changed.join(', ')} for the fact check`);
    return cur;
  }
  async function fitWords(o, sp, f) {
    if (SCRIPT()) return o;
    const withHolds = x => x.shots.map((s, i) => ({ ...s, hold: sp ? sp.shots[i].hold : s.hold }));
    const total0 = o.shots.reduce((a, s) => a + countWords(s), 0);
    let cur = o;
    for (let round = 1; round <= 3; round++) {
      const shots = withHolds(cur), allowed = budgetFor(shots, cur.cast), total = shots.reduce((a, s) => a + countWords(s), 0);
      if (total <= allowed * 1.05) break;
      // the longest shots give words first, down to the per-shot target; then every long shot shrinks in proportion
      const per = Math.floor(allowed / shots.length), want = {}; let need = total - allowed;
      for (const i of shots.map((_, k) => k).sort((a, b) => countWords(shots[b]) - countWords(shots[a]))) { if (need <= 0) break; const n = countWords(shots[i]), cut = Math.min(need, n - per); if (cut > 0) { want[i] = n - cut; need -= cut; } }
      if (need > 0) shots.forEach((s, i) => { const n = countWords(s); if (n > 5) want[i] = Math.min(want[i] ?? n, Math.max(4, Math.floor(n * allowed / total))); });
      const req = Object.entries(want).map(([i, t]) => ({ shot: +i + 1, target_words: t, now_words: countWords(shots[i]), keep: [shots[i].cue?.word].filter(Boolean), lines: shots[i].lines.map(l => ({ who: l.who, text: l.text, tone: l.tone })) }));
      cur = await editShots(`script-fit#${round}`, 'fit', req, cur, (s, lines) => lines.reduce((a, l) => a + words(l.text), 0) < countWords(s) && !newNumbers(lines, f).length);
    }
    const total1 = cur.shots.reduce((a, s) => a + countWords(s), 0);
    if (total1 === total0) return o;
    if (scriptErrors(cur, sp, f).some(e => !e.soft)) { log(`script-fit: the cut broke a check; keeping the ${total0}-word script`); return o; }
    log(`script-fit: ${total0} -> ${total1} words (budget ${budgetFor(withHolds(cur), cur.cast)})`);
    return cur;
  }
  async function writeScript(f, sp) {
    let user;
    if (sp) {
      const est = sp.shots.map(s => ({ hold: s.hold, lines: [{}] })), allowed = budgetFor(est, null);
      user = `Brief: ${briefFor(brief)}\nTarget length: ${seconds} seconds. Word budget for ALL spoken lines together: at most ${allowed} words (the narrator speaks about ${wps(null)} words a second). Word target per shot: ${Math.floor(allowed / sp.shots.length)} (a short punch shot may take fewer and give them to an explaining shot; the total stays within ${allowed}). Most shots are one line; each extra line costs a breath.\n\nFACT SHEET (the only claims you may use; every number you say is one of its numbers, rounding is fine)\nQuestion: ${f.question}\nAnswer: ${f.answer}\nYardstick: ${f.yardstick || '(none)'}\n${factList(f)}\n\nSPINE\n${JSON.stringify({ shots: sp.shots.map((s, i) => ({ shot: i + 1, beat: s.beat, point: s.point, facts: s.facts, link: s.link, device: s.device, hold: s.hold })), payoff_shot: sp.payoff_shot, callback: sp.callback }, null, 1)}\n\nReturn only the JSON object.`;
    } else {
      const beats = beatsOf();
      user = `Brief (a SCRIPT): ${brief}\n\nThe brief is a SCRIPT: keep every spoken line verbatim and in order (numbers and symbols written as words for the voice). Use ${ck().shots || '8 to 12'} shots, one per beat of the script (usually 1 to 3 lines each). There is no spine, so also give each shot "beat"${beats.length ? ` (from: ${beats.join(', ')}; required: ${needBeats().join(', ') || 'none'})` : ''}, "point" (what the viewer gets from it), "device" (from: ${Object.keys(DEVICES).join(', ')}) and "hold" (seconds of silent screen time after its lines, 0 normally). Also give "payoff_shot" at the top level. Word budget for ALL lines together: at most ${E.budget} words.\nReturn only the JSON object.`;
    }
    const messages = [{ role: 'user', content: user }];
    const o = await ask('script', scriptSystem(), messages, x => scriptErrors(x, sp, f));
    if (!o) throw new Error('no usable script');
    return { o, messages };
  }

  // ---------- review: a blind test viewer and a fact check, then one revision ----------
  const readAloud = (o, sp) => o.shots.map((s, i) => `SHOT ${i + 1}${s.see ? `\nOn screen: ${s.see}` : ''}\n${s.lines.map(l => `${l.who === 'narrator' ? 'Narrator' : l.who}: ${l.gap_before >= 0.4 ? '(pause) ' : ''}${l.text}`).join('\n')}`).join('\n\n'); // holds are not shown: the test viewer judged a silent hold "flat" and set off a revision
  const json = async (step, system, user) => { for (let a = 1; a <= 2; a++) { const t = await E.m3(`${step}${a > 1 ? `#${a}` : ''}`, system, [{ role: 'user', content: user }], 16000); try { return E.extractJson(t); } catch { } } return null; };
  // the fact checker sees the brief (it flipped a brief's true premise it could not find in the reference) and each derived fact's
  // calc (it took a sheet ratio with a wrong unit factor as true and "corrected" a right line to match it)
  const factcheck = (step, o, sp, f) => json(step, `${E.prompt('factcheck')}${E.refBlock()}`, `BRIEF\n${briefFor(brief)}\n\nFACT SHEET (a derived fact shows the engine's arithmetic: its calc and result)\n${calcList(f)}\n\nSCRIPT\n${readAloud(o, sp)}\n\nReturn only the JSON object.`);
  // a conflict (the brief against the reference) is reported, never fixed: a fix would flip the brief's premise. One the checker
  // says a sheet fact settles ("settled_by") is no conflict: the line is wrong and is fixed toward the sheet
  const settle = (step, fc, f) => { for (const p of fc?.problems || []) { const ids = [].concat(p?.settled_by || []).filter(id => f.facts.some(x => x.id === id)); if (p?.kind === 'conflict' && ids.length) { p.kind = 'wrong'; p.fix ||= `say it the way the fact sheet does (${ids.join(', ')})`; log(`${step}: shot ${p.shot}'s conflict is settled by ${ids.join(', ')}; fixed toward the sheet`); } } };
  const toFix = fc => (fc?.problems || []).filter(p => p?.kind !== 'conflict');
  const conflicts = (step, fc) => { const c = (fc?.problems || []).filter(p => p?.kind === 'conflict'); for (const p of c) if (!/^a conflict/.test(p.problem || '')) p.problem = `a conflict between the brief and the reference, reported, not fixed: ${p.problem || ''}`; if (c.length) log(`${step}: ${c.length} conflict(s) reported, not fixed: ${c.map(p => `shot ${p.shot}: ${p.problem}`).join('; ')}`); return c; };
  async function reviewScript(o, sp, f) {
    const [viewer, fc] = await Promise.all([json('viewer', E.prompt('viewer'), `${readAloud(o, sp)}\n\nReturn only the JSON object.`), factcheck('factcheck', o, sp, f)]);
    return { viewer, factcheck: fc };
  }
  const needsRevision = r => {
    const v = r.viewer, sc = v?.scores || {};
    return !!(toFix(r.factcheck).length || v?.lost?.length || v?.flat?.length || ['hook', 'clarity', 'flow', 'payoff'].some(k => +sc[k] && +sc[k] < 4));
  };

  // ---------- the whole writer ----------
  async function writeStory() {
    const saved = E.ckLoad('script.json'); if (saved) { log('script: restored from checkpoint'); return JSON.parse(saved); }
    let story;
    if (SCRIPT()) {
      const { o } = await writeScript(null, null);
      story = { title: o.title, music: { ...(o.music || {}), payoff_shot: +o.payoff_shot || o.shots.length }, cast: o.cast, shots: o.shots.map(s => ({ beat: s.beat, point: s.point, device: DEVICES[s.device] ? s.device : 'act', hold: Math.max(0, Math.min(2, +s.hold || 0)), lines: s.lines, cue: s.cue, see: s.see })) };
    } else {
      const f = await writeFacts(), sp = await writeSpine(f);
      let { o, messages } = await writeScript(f, sp);
      o = await fitWords(o, sp, f); messages[messages.length - 1] = { role: 'assistant', content: JSON.stringify(o) }; // the revision starts from the cut script
      const review = await reviewScript(o, sp, f), v = review.viewer;
      settle('fact check', review.factcheck, f);
      log(`test viewer: ${v ? `scores ${JSON.stringify(v.scores || {})}, lost ${v.lost?.length || 0}, flat ${v.flat?.length || 0}; Q "${v.question}" A "${v.answer}"` : 'no answer'} | fact check: ${review.factcheck ? `${review.factcheck.problems?.length || 0} problems` : 'no answer'}`);
      conflicts('fact check', review.factcheck);
      let revised = false;
      if (needsRevision(review)) {
        const fix = toFix(review.factcheck);
        messages.push({ role: 'user', content: `A test viewer who knows nothing about the topic watched your script (without the fact sheet):\n${JSON.stringify(v || {}, null, 1)}\n\nThe question the reel should open: "${sp.question || f.question}". The answer it should give: "${sp.answer || f.answer}".\n\nThe fact checker found: ${fix.length ? JSON.stringify(fix, null, 1) : 'nothing wrong'}.\n\nRewrite the script to fix: every fact problem (use its fix), every shot the viewer got lost in or found flat, and any gap between the viewer's question and answer and the intended ones. Keep the spine (shots, points, facts, links, holds) and the word budget. Return the complete JSON.` });
        const o2 = await ask('script-revise', scriptSystem(), messages, x => scriptErrors(x, sp, f), 3);
        if (o2) { o = await fitWords(o2, sp, f); revised = true; messages[messages.length - 1] = { role: 'assistant', content: JSON.stringify(o) }; }
        else log('script-revise: no revision passed the checks; keeping the script from before the review');
      }
      // a revision can bring new claims (one added "about twenty cents each" after the check): check the facts again, fix once
      if (revised) {
        const fc2 = await factcheck('factcheck-2', o, sp, f); review.factcheck2 = fc2; settle('fact check of the revision', fc2, f);
        log(`fact check of the revision: ${fc2 ? `${fc2.problems?.length || 0} problems` : 'no answer'}`);
        // the harness reads the last fact check (script.json review.factcheck2): the first one's conflicts stay in it
        const seen = new Set(conflicts('fact check of the revision', fc2).map(p => `${p.shot}|${p.claim}`)), carry = (review.factcheck?.problems || []).filter(p => p?.kind === 'conflict' && !seen.has(`${p.shot}|${p.claim}`));
        if (carry.length) review.factcheck2 = { ...(fc2 || {}), problems: [...(fc2?.problems || []), ...carry] };
        if (toFix(fc2).length) o = await fixClaims(o, sp, f, toFix(fc2));
      }
      story = { title: o.title, question: sp.question || f.question, answer: sp.answer || f.answer, callback: sp.callback, music: { ...(o.music || {}), payoff_shot: +sp.payoff_shot },
        cast: o.cast, facts: f.facts, payoff: f.payoff, review: { ...review, revised },
        shots: sp.shots.map((s, i) => ({ beat: s.beat, point: s.point, facts: s.facts, link: i ? s.link : 'hook', device: s.device, hold: Math.max(0, Math.min(2, +s.hold || 0)), lines: o.shots[i].lines, cue: o.shots[i].cue, see: o.shots[i].see })) };
    }
    story.shots.forEach(s => s.lines.forEach(l => { if (l.gap_before != null) l.gap_before = Math.max(0, Math.min(1.5, +l.gap_before || 0)); }));
    E.ckSave('script.json', story); E.ckSave('script.md', scriptMd(story));
    log(`script: "${story.title}", ${story.shots.length} shots, ${story.shots.reduce((a, s) => a + s.lines.reduce((b, l) => b + words(l.text), 0), 0)} words, holds ${story.shots.reduce((a, s) => a + s.hold, 0).toFixed(1)} s${story.review ? `, ${story.review.revised ? 'revised after review' : 'unchanged by review'}` : ''}`);
    return story;
  }
  return { writeStory };
}

// the script as a readable page (<out>-work/script.md)
const problemLine = p => `- shot ${p.shot}: "${p.claim}": ${p.problem} -> ${p.kind === 'conflict' ? '(a conflict: reported, not fixed)' : p.fix}`;
export function scriptMd(st) {
  const fx = Object.fromEntries((st.facts || []).map(f => [f.id, f]));
  const factLine = f => `${f.text}${f.source === 'derived' ? ` [= ${f.calc}]` : f.source === 'general' ? ' [general]' : ''}`;
  const out = [`# ${st.title || 'untitled'}`, ''];
  if (st.question) out.push(`**Question:** ${st.question}`, `**Answer:** ${st.answer}`, `**Payoff:** shot ${st.music?.payoff_shot}${st.payoff && fx[st.payoff] ? ` (${st.payoff}: ${fx[st.payoff].text})` : ''}`, st.callback ? `**Callback:** ${st.callback}` : '', '');
  st.shots.forEach((s, i) => {
    out.push(`## Shot ${i + 1}: ${[s.beat, s.device, i ? s.link : ''].filter(Boolean).join(' / ')}`, `Point: ${s.point || ''}`);
    if (s.facts?.length) out.push(`Facts: ${s.facts.map(id => `${id} ${fx[id] ? `(${factLine(fx[id])})` : ''}`).join('; ')}`);
    for (const l of s.lines) out.push(`- ${l.gap_before >= 0.3 ? `(pause ${l.gap_before} s) ` : ''}**${l.who}**${l.tone ? ` [${l.tone}]` : ''}: ${l.text}`);
    if (s.cue?.word) out.push(`Cue: "${s.cue.word}": ${s.cue.show || ''}`);
    if (s.see) out.push(`See: ${s.see}`);
    if (s.hold) out.push(`Hold: ${s.hold} s`);
    out.push('');
  });
  const r = st.review;
  if (r?.viewer) { const v = r.viewer; out.push('## Test viewer (on the first draft)', `Scores: ${JSON.stringify(v.scores || {})}`, `Question: ${v.question || ''}`, `Answer: ${v.answer || ''}`, `Remember: ${v.remember || ''}`, ...(v.lost || []).map(x => `- lost in shot ${x.shot}: ${x.why}`), ...(v.flat || []).map(x => `- flat shot ${x.shot}: ${x.why}`), v.want ? `Still wants: ${v.want}` : '', ''); }
  if (r?.factcheck2) out.push('## Fact check of the revision', ...(r.factcheck2.problems?.length ? r.factcheck2.problems.map(problemLine) : ['nothing wrong']), '');
  if (r?.factcheck) out.push('## Fact check (first draft)', ...(r.factcheck.problems?.length ? r.factcheck.problems.map(problemLine) : ['nothing wrong']), '');
  if (r) out.push(`Revised after the review: ${r.revised ? 'yes' : 'no'}`);
  return out.filter(x => x !== null).join('\n');
}
