// fastreel story writer. The facts, the story and the script are written in their own MiniMax-M3 steps, before any art
// direction, each with its own prompt (engine/prompts/<step>.txt) and engine checks that reject and ask for a redo:
//   facts      reference + brief -> a numbered fact sheet, the viewer's question, its answer, the payoff fact
//              (it may name up to 2 more Wikipedia articles when the answer needs a number the reference lacks)
//   spine      fact sheet -> what the story is for (its idea and the viewer's takeaway), then one shot per step toward it: beat,
//              the point, its facts, how it follows from the shot before, the explanation device, a silent hold
//   script     spine -> spoken lines (1 to 3 a shot) with tones and pauses, the cue word each shot's picture change lands on;
//              an overrun is cut to length by a small fit call (fitWords), never rejected
//   viewer     a test viewer who knows nothing reads the script blind: what was asked, what was answered, where it lost them
//   factcheck  the script against the brief, the reference and the fact sheet with each derived fact's calc (runs at the
//              same time as the viewer); a conflict between the brief and the reference is reported, not fixed
//   revise     the script step again with both reports (one round); if the revision fails the engine checks, the
//              script from before the review stays. When the viewer got lost, the spine is built again first (the order of
//              the story is wrong, not only its words) and the script written on it
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

// ---------- timing: the picture around each shot's speech (the budget and the timeline both use it) ----------
// lead: picture before a shot's first line; tail: after its last line, before the cut (the shot's silent hold comes on top); breath:
// before each further line of a shot unless it sets gap_before; end: the last shot's tail at least (no cut follows it). A template's
// checks may set lead and tail ("lead: 0.3"). The fixed 0.35 s lead and 0.6 s tail left 0.95 s of silence at every cut (17-37% of
// each reel silent, findings P.1)
export const PAD = { lead: 0.15, tail: 0.35, breath: 0.22, end: 1 };
export const padding = (checks = {}) => ({ ...PAD, ...Object.fromEntries(['lead', 'tail'].filter(k => +checks[k] >= 0).map(k => [k, Math.min(2, +checks[k])])) });
// one shot's line times (seconds into the shot) and length, from its lines' spoken seconds; no seconds give its silence alone
export function shotTimes(s, secs, pad, last) {
  let t = pad.lead;
  const lines = (s.lines || []).map((l, i) => { t += i ? (l.gap_before ?? pad.breath) : (+l.gap_before || 0); const start = t; t += secs[i] || 0; return { start, end: t }; });
  return { lines, dur: t + Math.max(pad.tail, last ? pad.end : 0) + Math.max(0, Math.min(2, +s.hold || 0)) };
}
// the seconds of a reel that are not speech; the word budget fills the rest
export const silenceOf = (shots, pad) => shots.reduce((a, s, i) => a + shotTimes(s, [], pad, i === shots.length - 1).dur, 0);
// a checkpointed script was written to its voice model's speaking rate (story.voice_model, story.wps). The harness reruns a cut with
// the next voice when one is refused (design 6.7); a rate more than 15% off makes the reel that much too long or short (an eleven-v4
// script spoken by heygen ran 33 s of 45), so the script is written again. The same model's rate drifts as it is measured
// (cache/voice/rates.json) and never rewrites a resumed cut
export const rateMoved = (story, wps, model) => !!story?.voice_model && story.voice_model !== model && +story.wps > 0 && Math.abs(wps / story.wps - 1) > 0.15;

// ---------- text checks ----------
const toks = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s-]+/g, ' ').replace(/-/g, ' ').split(/\s+/).filter(Boolean);
// the magnitude words, in digits ("4.6 billion") and in words; past trillion too, so a payoff of 1.25e20 can be said and traced
// ("one hundred and twenty-five quintillion": the atom script fell back on "an almost unimaginable number")
const MAG = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12, quadrillion: 1e15, quintillion: 1e18, sextillion: 1e21, septillion: 1e24, octillion: 1e27, nonillion: 1e30 }, MAGS = Object.keys(MAG).join('|');
const NUM_WORD = new Set([...ONES, ...TENS.filter(Boolean), 'hundred', ...Object.keys(MAG)]);
// a spine shot's "when" as a signed time: a year AD, below zero for BC and for "... years ago" ("753 BC" before "509 BC", "252
// million years ago" before "201 million years ago"), with its month and day when it gives them (an August plebiscite came
// before "7 June 1905" and passed, years being equal); NaN when it holds no date
const MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
const whenOf = when => {
  const t = String(when || ''); if (/\bago\b/i.test(t)) { const v = valuesIn(t)[0]; return v ? -v : NaN; }
  const bc = t.match(/\b(\d{1,4})\s*(?:BCE?|B\.C\.)/i); if (bc) return -bc[1];
  const y = t.match(/\b\d{3,4}\b/); if (!y) return NaN;
  const mon = t.match(new RegExp(`\\b(${MON})\\b`, 'i')), day = datesIn(t)[0]?.day || 0;
  return +y[0] + (mon ? MONTHS.indexOf(mon[1].slice(0, 3).toLowerCase()) / 12 : 0) + (mon && day ? day / 400 : 0);
};
// a number as the narrator says it: 1.25e20 -> "one hundred and twenty-five quintillion", 8.8 -> "eight point eight"; null when
// that form does not read back as the value (1e-10 prints as digits; past the largest magnitude word, "five thousand nine
// hundred and seventy sextillion" read as 9.7e23 for 5.97e24): the message then shows its digits
const sayNum = (v, digits = 3) => {
  const big = Object.entries(MAG).filter(([, m]) => m >= 1e6 && v >= m).at(-1), r = String(+(big ? v / big[1] : v).toPrecision(digits)), m = r.match(/^(\d+)(?:\.(\d+))?$/), w = m && numWords(+m[1]);
  const s = w && `${w}${m[2] ? ` point ${[...m[2]].map(d => ONES[+d]).join(' ')}` : ''}${big ? ` ${big[0]}` : ''}`;
  return s && numbersSaid(s).some(n => Math.abs(n.v - v) <= Math.abs(v) * 0.05) ? s : null;
};
export const STOP = new Set(('a an the and or but so of to in on at for by with from as is are was were be been being it its it\'s this that these those he she they his her their them ' +
  'you your we our i my me what which who whom how why when where then than there here into onto out up down over under about after before just only also very more most ' +
  'can could would will should not no do does did has have had one all any each every some such own same too').split(' '));
const HYPE = /\b(astonishing|incredible|incredibly|amazing|remarkable|unbelievable|mind[- ]?blowing|insane|fascinating|staggering|stunning|crazy|game[- ]changer|jaw[- ]dropping|shocking)\b/i;
const sameWord = (a, b) => a === b || (b.length >= 4 && (a.startsWith(b) || b.startsWith(a)) && Math.abs(a.length - b.length) <= 3);
const says = (text, phrase) => { const w = toks(text), p = toks(phrase); if (!p.length) return false; for (let i = 0; i + p.length <= w.length; i++) if (p.every((x, k) => sameWord(w[i + k], x))) return true; return false; };
// ---------- numbers and units ----------
// derived facts: the plain factors a calc may use without a fact stating them. A bare number is taken literally; units count
// only where the calc writes them, and the unit table converts them (M3 wrote 1 mm = 1,000,000 pm as "1 * 1000000")
const FREE = new Set([1, 2, 3, 4, 100]); // 100 at most once; "* 1" or "/ 1" changes nothing ("1 million / 1" passed a false fact)
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
const NUM = new RegExp(String.raw`(?<![\w.^])(\d+(?:\.\d+)?)(?!\d|(?:st|nd|rd|th)\b)(?:[eE]([+-]?\d+)|\s*[×x*]\s*10\^([+-]?\d+)|\^([+-]?\d+))?(?:\s+(${MAGS})\b)?`, 'gi');
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
// the quantities a text states in digits: {n: the number, raw: its digits ("4.4" of "4.4 billion"), v: in SI units, d: dimension
// (null for a plain number), u: the unit as written}
function quantitiesIn(text) {
  const s = normNum(text), out = [];
  for (const m of s.matchAll(NUM)) {
    const n = numVal(m), u = unitAfter(s.slice(m.index + m[0].length), /[$€£¥]\s*$/.test(s.slice(0, m.index)));
    out.push({ n, raw: +m[1], ...(u ? { v: n * u.k, k: u.k, d: u.d, u: u.u } : { v: n, k: 1, d: null, u: '' }) });
  }
  return out;
}
// numbers in words: "ten thousand", "a million", "four point six billion", "nineteen eighty-seven", "nineteen oh five"
const WN = Object.fromEntries([...ONES.map((w, i) => [w, i]), ...TENS.map((w, i) => [w, i * 10]).filter(([w]) => w)]);
const NOT_COUNT = new RegExp(`^(\\w*(fif|six|seven|eigh|nin|ten|eleven|twelf|teen|tie|hundred|${MAGS})ths?|fourths?|first|second|thirds?|halves|half|quarters?|(twent|thirt|fort|fift|sixt|sevent|eight|ninet)ies)$`);
function wordNumbers(text) {
  return String(text).split(new RegExp(String.raw`[;:.!?]|(?<!\b(?:${MAGS})),`, 'i')).flatMap(wordRuns);
}
function wordRuns(text) {
  const w = toks(text), out = [];
  for (let i = 0; i < w.length; i++) {
    const a = w[i] === 'a' && (w[i + 1] === 'hundred' || MAG[w[i + 1]]);
    if (!a && WN[w[i]] == null) continue;
    let j = a ? i + 1 : i, total = 0, cur = a ? (w[i - 1] === 'half' ? 0.5 : 1) : 0, frac = 0;
    for (; j < w.length; j++) {
      const x = w[j], v = WN[x];
      // "nineteen oh five" and "nineteen zero three" are years ("zero" was added: 19 + 0 + 3)
      if ((x === 'oh' || x === 'zero') && !frac && cur >= 10 && cur < 100 && WN[w[j + 1]] < 10) cur = cur * 100 + WN[w[++j]];
      else if (v != null && frac) { cur += v * frac; frac /= 10; }
      else if (v != null) cur = cur >= 10 && cur < 100 && v >= 10 ? cur * 100 + v : cur + v; // "nineteen eighty": a year
      else if (x === 'hundred') cur = (cur || 1) * 100;
      else if (MAG[x]) { total += (cur || 1) * MAG[x]; cur = 0; }
      else if (x === 'point' && WN[w[j + 1]] != null && !frac) frac = 0.1;
      else if (!(x === 'and' && WN[w[j + 1]] != null && (cur >= 100 || total))) break;
    }
    // a fraction, an ordinal or a decade is no count ("one ten-millionth", "twenty-first", "nineteen fifties"): not checked
    if (!NOT_COUNT.test(w[j] || ''))
      out.push({ s: w.slice(i, j).join(' '), v: total + cur, one: j === i + 1 && WN[w[i]] < 10 });
    i = j - 1;
  }
  return out;
}
// every number a text says, in digits or words, with its value; "one" marks a lone single digit ("one day", "2 things")
const numbersSaid = text => [...[...normNum(text).matchAll(NUM)].map(m => ({ s: m[0].trim(), v: numVal(m), one: /^\d$/.test(m[0].trim()) })), ...wordNumbers(text)];
const valuesIn = text => numbersSaid(text).map(n => n.v);
// the numbers a text says that no fact states (rounding allowed: within 5%), as written
// (a spoken number is held to 2%: at 5%, "two hundred and twenty" passed for 224.7 days and broke a stated 18.3-day difference)
const SPOKEN = 0.02;
const untraced = (text, facts, tol = 0.05) => { const have = facts.flatMap(x => valuesIn(x.text)); return numbersSaid(text || '').filter(n => !n.one && !have.some(v => Math.abs(n.v - v) <= Math.abs(v) * tol)).map(n => n.s); };
const quoted = xs => xs.map(x => `"${x}"`).join(', ');
// the user's request states numbers too (its Audience, Goal and Tone lines are the intake's reading, never facts)
const withRequest = (facts, brief) => [...facts, { id: 'request', text: requestOf(brief) }];
// spoken numbers: rounded the way people say them ("four point two four six five light-years" and the Sun's 1,391,400 km were
// read aloud; exact figures belong on screen), and one quantity said as one value (73,000 and 74,000 years for the same trip);
// a year is said in full
const sig = v => v.toExponential().split('e')[0].replace(/[-.]/g, '').replace(/0+$/, '').length;
export function spokenErrors(shots, facts) {
  const have = facts.flatMap(x => valuesIn(x.text)), E = [], by = new Map();
  shots.forEach((s, i) => (s.lines || []).forEach(l => {
    for (const n of numbersSaid(l.text)) {
      if (n.one || !n.v) continue;
      // the hint is the shortest rounding that stays within 2% (two digits made 224.7 "two hundred and twenty")
      const hint = [2, 3].map(d => sayNum(n.v, d)).find(s => s && numbersSaid(s).some(x => Math.abs(x.v - n.v) <= Math.abs(n.v) * SPOKEN));
      if (!(Number.isInteger(n.v) && n.v >= 1000 && n.v <= 2100) && sig(n.v) > 3) E.push(soft(`shot ${i + 1}: "${l.text}" says "${n.s}" to ${sig(n.v)} digits: say it rounded the way people say it ("about ${hint || fmtNum(n.v)}") and leave the exact figure to the screen`));
      const h = have.filter(v => Math.abs(n.v - v) <= Math.abs(v) * 0.05).sort((a, b) => Math.abs(a - n.v) - Math.abs(b - n.v))[0];
      if (h != null) by.set(h, [...(by.get(h) || []), { i, n }]);
    }
  }));
  for (const [h, g] of by) if (new Set(g.map(x => x.n.v)).size > 1) E.push(soft(`shots ${[...new Set(g.map(x => x.i + 1))].join(', ')} say ${quoted([...new Set(g.map(x => x.n.s))])} for one number (${fmtNum(h)} on the sheet): say it the same way each time`));
  return E;
}
// a calc with units ("1 mm / 100 pm", "120 km / (60 km/h)", "41 / 10000"): {v: in SI units, d: dimension, qs: its quantities, ops};
// a bare number is plain; throws a reason
function evalCalc(calc) {
  const src = normNum(calc), T = [], re = /\s*(?:(\d+(?:\.\d+)?(?:e[+-]?\d+)?)|([A-Za-zµμ](?:[\wµμ]|\^-?|-(?=[A-Za-z]))*(?:\/[A-Za-zµμ][\w^]*)*)|(\*\*|[-+*/()^×]))/iy;
  let pos = 0, m;
  for (;;) { re.lastIndex = pos; if (!(m = re.exec(src))) break; pos = re.lastIndex; T.push(m[1] ? { n: +m[1] } : m[2] ? { u: m[2] } : { op: m[3] === '×' ? '*' : m[3] === '**' ? '^' : m[3] }); }
  if (src.slice(pos).trim()) throw `"${src.slice(pos).trim()}" is not a number, a unit or + - * / ( )`;
  let p = 0; const qs = [], take = op => T[p]?.op === op && ++p;
  const add = (a, b, s) => { if (!sameDim(a.d, b.d)) throw `it adds or subtracts ${dimName(a.d)} and ${dimName(b.d)}`; return { v: a.v + s * b.v, d: a.d }; };
  const mul = (a, b, s) => ({ v: s > 0 ? a.v * b.v : a.v / b.v, d: a.d.map((x, j) => x + s * b.d[j]) });
  const expr = () => { let a = term(); for (;;) { if (take('+')) a = add(a, term(), 1); else if (take('-')) a = add(a, term(), -1); else return a; } };
  let pointless = 0; const right = b => { if (b.one) pointless++; return b; };
  const term = () => { let a = unary(); for (;;) { if (take('*')) a = mul(a, right(unary()), 1); else if (take('/')) a = mul(a, right(unary()), -1); else return a; } };
  const unary = () => take('-') ? mul({ v: -1, d: Z }, unary(), 1) : take('+') ? unary() : power();
  const power = () => {
    const n = qs.length, a = atom(); if (!take('^')) return a;
    const neg = take('-'), t = T[p++]; if (t?.n == null) throw 'a power needs a number after ^';
    const e = neg ? -t.n : t.n; if (qs.length === n + 1 && !qs[n].u) qs[n].n = qs[n].v = qs[n].n ** e; // 10^7 is one number
    return { v: a.v ** e, d: a.d.map(x => x * e) };
  };
  const atom = () => {
    const t = T[p++] || {};
    if (t.op === '(') { const a = expr(); if (!take(')')) throw 'a "(" is not closed'; return a; }
    if (t.n == null && !t.u) throw 'a number is missing';
    let k = 1, d = Z, u = '', n = t.n ?? 1;
    if (t.u) p--; // a unit alone is 1 of it: "24 h / d" is 24 h per 1 d
    while (T[p]?.u && MAG[T[p].u.toLowerCase()]) n *= MAG[T[p++].u.toLowerCase()];
    const unknown = w => `"${w}" is not a unit the engine knows (m, km, mm, µm, nm, pm, g, kg, t, s, min, h, d, wk, yr, km/h, m/s, mi, ft, lb, au, ly, km2, m3, L)`;
    if (!t.u && (T[p]?.op === '/' || /^per$/i.test(T[p]?.u || '')) && T[p + 1]?.u && !MAG[T[p + 1].u.toLowerCase()]) { // "41 /d" is 41 a day
      const x = unitOf(T[p + 1].u); if (!x) throw unknown(T[p + 1].u); u = `per ${T[p + 1].u}`; k = 1 / x[0]; d = x[1].map(e => -e); p += 2;
    } else if (T[p]?.u) { u = T[p++].u; const x = unitOf(u); if (!x) throw unknown(u); [k, d] = x; }
    const q = { n, u, v: n * k, d }; qs.push(q); return { v: q.v, d, one: !u && n === 1 };
  };
  const r = expr(); if (p < T.length) throw `"${T[p].op || T[p].u || T[p].n}" is out of place`;
  return { ...r, qs, pointless, ops: T.some(t => t.op && t.op !== '(' && t.op !== ')') };
}
const fmtNum = v => Math.abs(v) >= 1e12 || (v && Math.abs(v) < 1e-3) ? v.toPrecision(3) : Math.abs(v) >= 1e9 ? `${+(v / 1e9).toFixed(2)} billion` : Math.abs(v) >= 1e6 ? `${+(v / 1e6).toFixed(2)} million` : Math.abs(v) >= 1 ? `${+v.toFixed(2)}` : `${+v.toPrecision(3)}`;
// the time units a text names anywhere ("in a year", "annually", "daily"), as [SI factor, dimension, word]
const TIME_WORDS = { annually: 'year', yearly: 'year', monthly: 'month', weekly: 'week', daily: 'day', hourly: 'hour' };
const timeUnitsIn = text => toks(text).filter(w => w.length > 2).map(w => [unitOf(TIME_WORDS[w] || w), TIME_WORDS[w] || w]).filter(([u]) => u && sameDim(u[1], TIME)).map(([u, w]) => [...u, w.replace(/s$/, '')]);
const perTime = d => sameDim(d, [0, 0, -1]);
// everyday units a result of a kind is also given in (a time in hours and years)
const EVERYDAY = { '0,0,1': ['h', 'd', 'yr'], '1,0,0': ['m', 'km'], '0,1,0': ['kg', 't'], '1,0,-1': ['km/h'], '2,0,0': ['km2'] };
// a calc's result as the text would state it: in the text's own unit of that kind nearest the result, a rate per a time unit the
// text names, else in SI units
const shownIn = (r, text) => {
  if (!r.d.some(Boolean)) return fmtNum(r.v);
  const off = q => Math.abs(Math.log(Math.abs(q.v / r.v) || 1e-300)), tu = quantitiesIn(text).filter(q => q.d && sameDim(q.d, r.d)).sort((a, b) => off(a) - off(b))[0];
  const tw = perTime(r.d) && timeUnitsIn(text)[0];
  return tu ? `${fmtNum(r.v / (tu.v / tu.n))} ${tu.u}` : tw ? `${fmtNum(r.v * tw[0])} per ${tw[2]}` : `${fmtNum(r.v)} ${SI(r.d)}`;
};
// the quantities a derived fact may use: those of the non-derived facts and of every other derived fact whose own calc holds,
// found until stable, so a chain (hours, then years, then days at 8 hours a day) works in any order; a failing fact feeds none
const near = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(Math.abs(a), Math.abs(b));
const stated = xs => xs.flatMap(x => quantitiesIn(x.text).map(q => ({ ...q, id: x.id })));
function sheetsFor(facts) {
  const base = stated(facts.filter(x => x.source !== 'derived')), der = facts.filter(x => x.source === 'derived');
  let ok = new Set();
  const sheetFor = x => [...base, ...stated(der.filter(y => y !== x && ok.has(y.id)))];
  for (let i = 0; i <= der.length; i++) { const next = new Set(der.filter(x => !calcErrors(x, sheetFor(x)).length).map(x => x.id)); if (next.size === ok.size) break; ok = next; } // ok only grows
  return sheetFor;
}
// the problems of one derived fact; [] when it holds
function calcErrors(x, sheet) {
  let r; try { r = evalCalc(x.calc ?? ''); } catch (e) { return [`fact ${x.id} is derived: its "calc" ${JSON.stringify(String(x.calc ?? ''))} does not compute (${e}). Give the arithmetic on the sheet's numbers, each quantity with its unit, for example "1 mm / 100 pm" or "41 / 10000"`]; }
  const conversion = !r.ops && r.qs.length === 1 && !!r.qs[0].u; // "75600 h" for "8.6 years": every such quantity in the text must agree
  if (!r.ops && !conversion) return [`fact ${x.id}: "calc" ${x.calc} has no arithmetic; compute it from the sheet's quantities (a conversion is one quantity with its unit, "75600 h")`];
  if (!Number.isFinite(r.v)) return [`fact ${x.id}: "calc" ${x.calc} does not compute`];
  // a bare number is one the sheet states (its digits, or its value with the magnitude word) or a plain factor (100 once: a chain
  // of 100s passed 1 mm = 1,000,000 pm); a quantity with a unit is one the sheet states, or 1 of a unit (a conversion)
  // beside quantities with units, a bare number every fact states with a unit must carry it ("/ 12" for "12 hours a day")
  // a unit-ratio constant (8760 h/yr, 1000 m/km: its dimensions cancel) need not be stated: it must be the true conversion
  const odd = new Set(), units = r.qs.some(q => q.u && q.n !== 1); // "41 * 1 yr / 1 d": only conversions beside 41
  for (const q of r.qs) {
    const same = q.u ? [] : sheet.filter(s => near(s.n, q.n) || near(s.raw, q.n));
    if (q.u) { if (q.n !== 1 && !sheet.some(s => s.d && sameDim(s.d, q.d) && near(s.v, q.v))) odd.add(!q.d.some(Boolean) && q.v ? (Math.abs(q.v - 1) > 0.01 ? `${q.n} ${q.u}, which is not the true conversion (that is ${fmtNum(q.n / q.v)} ${q.u})` : '') : `${q.n} ${q.u}, which no other fact on the sheet states`); }
    else if (FREE.has(q.n)) continue;
    else if (!same.length) odd.add(`${q.n}, which no other fact on the sheet states`);
    else if (units && same.every(s => s.u)) odd.add(`${q.n} without its unit (the sheet states "${q.n} ${same[0].u}"; write it with its unit)`);
  }
  odd.delete(''); if (r.qs.filter(q => !q.u && q.n === 100).length > 1) odd.add('100 more than once');
  if (r.pointless) odd.add('"* 1" or "/ 1", which changes nothing');
  if (!odd.size && !r.qs.some(q => q.u || sheet.some(s => near(s.n, q.n) || near(s.raw, q.n)))) odd.add('no number the sheet states');
  if (odd.size) return [`fact ${x.id}: "calc" ${x.calc} uses ${[...odd].join('; ')}. Check the calc's factors and units: write each quantity with its unit, as a fact on the sheet states it (e.g. "75600 h", "378000 km / (5 km/h)"); the engine converts units itself and states the result in the text's unit: to state hours as years, write the hours quantity and put years in the text; no calendar factors needed`];
  const tq = quantitiesIn(x.text), close = (a, b) => Math.abs(a - b) <= Math.abs(b) * 0.05 + 1e-300; // relative only (an absolute margin let 0.00004 pass for 0.00017); 5% as for spoken numbers
  const ok = conversion ? tq.some(q => q.d && sameDim(q.d, r.d)) && tq.every(q => !q.d || !sameDim(q.d, r.d) || close(q.v, r.v))
    : r.d.some(Boolean) ? tq.some(q => q.d && sameDim(q.d, r.d) && close(q.v, r.v)) || (perTime(r.d) && timeUnitsIn(x.text).some(u => tq.some(q => !q.d && close(q.n, r.v * u[0]))))
    : valuesIn(x.text).some(v => close(v, r.v));
  // past the operand check the calc is exact arithmetic on the sheet's own quantities, so its value is the side to trust (a neutral
  // "one of them is wrong" let M3 keep a wrong "2.4 million years" against a right calc four times)
  const shown = shownIn(r, x.text), every = (EVERYDAY[r.d.join(',')] || []).map(u => `${fmtNum(r.v / unitOf(u)[0])} ${u}`).filter(e => parseFloat(e) !== parseFloat(shown));
  return ok ? [] : [`fact ${x.id}: the engine computed ${x.calc} = ${shown}${every.length ? ` (${every.join(', ')})` : ''}, but its text says "${x.text}". The arithmetic and the unit conversion are exact on the sheet's quantities: if the calc is the right formula for the claim, write that value (fairly rounded) in the text; if the formula is not what the text claims, fix the calc`];
}
// a derived fact for the fact checker and the fixer: its calc, and that it holds (a second rounding of the result, "= 8.62 years"
// beside a text of 8.63, set off a nitpick fix that split the narration from the tags)
const calcShown = (x, sheet) => `${x.calc}; ${calcErrors(x, sheet).length ? 'the engine found it does not match its text' : 'the engine computed it, units converted, and it matches its text'}`;
const calcList = f => { const facts = f?.facts || [], sheetFor = sheetsFor(facts); return facts.map(x => `${x.id}: ${x.text}${x.source === 'derived' ? ` [derived: ${calcShown(x, sheetFor(x))}]` : x.source === 'reference' && (x.quote || x.quote_check) ? ` [quote: "${x.quote || ''}"${x.quote_check ? `; the engine found: ${x.quote_check}` : ''}]` : ''}`).join('\n'); };
// a soft problem: asked to be fixed, but an answer left with only soft problems is kept after the last try
const soft = msg => Object.assign(new String(msg), { soft: true });

// pointless repetition: a narrator line that restates one earlier shot (60% of its content words are that shot's) and adds almost
// nothing (all but one in five were said before): "So the walk would take about eight point eight years, while your whole life
// would last about seventy-three years" after a shot that said both numbers. A payoff that joins words of several shots into a new
// claim passes, as do a short punch line, a line that builds on an earlier number and the last shot (it may restate the answer).
// Measured on 17 real scripts: only that line is flagged (at 50%, a microwave payoff sharing half its words with one shot was too).
// The old rule flagged any shared number or 4-word phrase: it rejected one atom script 4 times for "one million atoms" in two
// different claims. Number words match exactly ("nine" is not "ninety")
export function repeatErrors(shots) {
  const seen = [], E = [], same = (y, x) => (NUM_WORD.has(x) || NUM_WORD.has(y) ? x === y : sameWord(y, x));
  shots.forEach((s, i) => {
    const mine = [];
    for (const l of s.lines || []) {
      if (l.who !== 'narrator') continue;
      const w = [...new Set(toks(l.text).filter(x => !STOP.has(x)))], old = w.filter(x => seen.some(ws => ws.some(y => same(y, x))));
      const echo = Math.max(0, ...seen.map(ws => w.filter(x => ws.some(y => same(y, x))).length));
      if (i && i < shots.length - 1 && w.length >= 5 && w.length - old.length <= Math.max(1, Math.floor(w.length / 5)) && echo * 5 >= w.length * 3)
        E.push(soft(`shot ${i + 1}: "${l.text}" says again what an earlier shot said: cut it or make it take the story further (building on an earlier number is fine; the last shot may restate the answer)`));
      mine.push(...w);
    }
    seen.push(mine);
  });
  return E;
}

// a review's new lines for shot i (asset_reel.mjs applyNotes) through the script's line checks, so a note cannot bring back what the
// writer keeps out (findings §P: review-written lines skipped them), as scriptErrors runs them. Hard: digits, a number neither the
// sheet nor the request states (more than 5% off), the shot's cue word not said. Soft: a number rounded 2-5% off, a hype word, a
// spoken-number rule (spokenErrors) or a repeat of an earlier shot that the new lines bring in, a script pushed off its word budget
export function lineNoteErrors(shots, i, lines, facts, budget, brief = '') {
  const now = shots.map((s, j) => (j === i ? { ...s, lines } : s)), cue = shots[i]?.cue?.word, Er = [], src = facts && withRequest(facts, brief);
  const fresh = check => { const was = new Set(check(shots).map(String)); return check(now).filter(e => !was.has(String(e))); };
  for (const l of lines) {
    if (/[0-9]/.test(l.text)) Er.push(`"${l.text}" has digits; write numbers as words (${spellDigits(l.text)})`);
    const far = src ? untraced(l.text, src) : [], near = src ? untraced(l.text, src, SPOKEN).filter(x => !far.includes(x)) : [];
    if (far.length) Er.push(`"${l.text}" says ${quoted(far)}, which no fact on the sheet states: say the sheet's numbers (rounded no further than 2%) or leave the number out`);
    if (near.length) Er.push(soft(`"${l.text}" says ${quoted(near)}, which no fact on the sheet states within 2%: round no further than 2% (a stated comparison must stay true)`));
    if (l.who === 'narrator' && HYPE.test(l.text)) Er.push(soft(`"${l.text.match(HYPE)[0]}" is a hype word; say the concrete thing instead`));
  }
  if (cue && !lines.some(l => says(l.text, cue))) Er.push(`the lines never say the shot's cue word "${cue}", which its picture change lands on: keep that word`);
  Er.push(...fresh(repeatErrors), ...(src ? fresh(ss => spokenErrors(ss, src)) : []));
  const count = ss => ss.reduce((a, s) => a + (s.lines || []).reduce((b, l) => b + words(l.text), 0), 0), before = count(shots), after = count(now);
  if (budget > 0 && after > before && after > budget * 1.05) Er.push(soft(`the script grows to ${after} words, over its budget of about ${budget}: the reel runs long`));
  if (budget > 0 && after < before && after < budget * 0.8) Er.push(soft(`the script shrinks to ${after} words, under 80% of its budget of about ${budget}: the reel runs short`));
  return Er;
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
  const sheetFor = sheetsFor(f.facts);
  for (const x of f.facts.filter(x => x.source === 'derived')) for (const e of calcErrors(x, sheetFor(x))) bad(x, e);
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
    for (const e of quoteErrors(x, E.refBlock?.() || '')) if (x.id === f.payoff) Er.push(soft(e)); else bad(x, e); // a quote never fails the sheet
  }
  // the answer and the yardstick are free text the spine and script build on: their numbers must be facts that hold
  // (a yardstick said "10,000 km" beside a sheet whose ratio made it 10 km; an answer said "19 years" beside a 2,442-day payoff)
  const held = withRequest(f.facts.filter(x => !Er.some(e => e.drop === x.id)), E.brief), ans = untraced(String(f.answer || ''), held), yd = untraced(String(f.yardstick || ''), held);
  if (ans.length) Er.push(`the answer ("${f.answer}") says ${quoted(ans)}, which no fact on the sheet states: give the answer with the payoff fact's own number`);
  if (yd.length) Er.push(Object.assign(soft(`the yardstick ("${f.yardstick}") says ${quoted(yd)}, which no fact on the sheet states: build it only from the sheet's numbers (a scaled number is a derived fact first, with its calc), or leave it empty`), { drop: 'yardstick' }));
  return Er;
}

// a reference fact's "quote": one sentence of the reference, verbatim, holding the fact's numbers; whether it says the same thing
// is the fact checker's to judge (a sheet said "a grain of sand is about 1 million carbon atoms wide" from a sentence about a hair)
const plainText = t => ` ${String(t).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
function quoteErrors(x, ref) {
  const q = String(x.quote || '');
  if (!q.trim()) return [`fact ${x.id} is from the reference: give "quote", the one sentence of the REFERENCE that states it, word for word`];
  if (!plainText(ref).includes(plainText(q))) return [`fact ${x.id}: its quote "${q}" is not in the REFERENCE word for word; copy the sentence exactly`];
  const qv = valuesIn(q), nums = numbersSaid(x.text).filter(n => !n.one && !qv.some(v => near(v, n.v))).map(n => n.s);
  return nums.length ? [`fact ${x.id} says ${quoted(nums)}, which its quote "${q}" does not state`] : [];
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
  for (const t of texts) for (const m of String(t).replace(/(\d),(\d)/g, '$1$2').matchAll(new RegExp(String.raw`(\d+(?:\.\d+)?)\s*(${MAGS})`, 'gi'))) if (!stated(+m[1] * MAG[m[2].toLowerCase()])) out.add(m[0]); // "1 TRILLION": the magnitude too
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
  // Soft problems (craft: a pointless repeat, a jump back in time, a hype word) are fixed while tries remain; an answer
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
      // nothing came back, or the sheet still lacks it: asked once as a well-known standard value before it is reported missing
      // (QC3 atom: "Grain" fetched 0 chars, and the reel never said how big the grain of sand it was compared with is)
      const lacks = String(f.missing || '').trim();
      if (!added || lacks) {
        const f3 = await ask('facts-general', system(), [{ role: 'user', content: `Brief: ${briefFor(brief)}\nReturn only the JSON object.` }, { role: 'assistant', content: JSON.stringify(f) }, { role: 'user', content: `The REFERENCE does not give what you asked for (${names})${added ? '' : ': the fetch found nothing'}${lacks ? `, and the sheet says it is missing: ${lacks}` : ''}. If it is a well-known standard value (a size, a distance, a date every textbook gives), add it as a "general" fact with its usual value, use it where the answer and the yardstick need it, and empty "missing"; if it is not one you are certain of, keep the sheet and say what is still missing in "missing". Return the complete JSON object, with "need" empty.` }], check);
        if (f3) { const had = new Set(f.facts.map(x => x.text)); f = clean(f3); log(`facts: asked for ${names} as a general value: ${f.facts.filter(x => x.source === 'general' && !had.has(x.text)).map(x => `${x.id} "${x.text}"`).join(', ') || 'no general fact added'}`); }
      }
    }
    if (E.hasRef()) for (const x of f.facts.filter(x => x.source === 'reference')) { const q = quoteErrors(x, E.refBlock()); if (q.length) x.quote_check = q.join('; '); } // for the fact checker
    E.ckSave('facts.json', f);
    log(`facts: ${f.facts.length} (${['reference', 'brief', 'general', 'derived'].map(s => `${f.facts.filter(x => x.source === s).length} ${s}`).join(', ')}); Q: ${f.question} | payoff ${f.payoff}`);
    if (String(f.missing || '').trim()) log(`facts: the sheet cannot fully answer the request: ${f.missing}`);
    return f;
  }

  // ---------- spine ----------
  function spineErrors(sp, f) {
    const Er = [], [smin, smax] = shotRange(), n = sp?.shots?.length;
    if (!Array.isArray(sp?.shots) || n < smin || n > smax) return [`need ${smin} to ${smax} shots, got ${n}`];
    // the story says what it is for before its beats, so each beat can serve it (scripts were fact lists with filler)
    if (!String(sp.idea || '').trim() || !String(sp.takeaway || '').trim()) Er.push('first say what the story is for: "idea" (its one central idea: the question it answers) and "takeaway" (what the viewer should come away with); every shot serves them');
    // they are free text the script is written to, like the sheet's answer: their numbers must be facts on the sheet
    const loose = untraced(`${sp.idea || ''}; ${sp.takeaway || ''}`, withRequest(f.facts, brief));
    if (loose.length) Er.push(`the idea and takeaway say ${quoted(loose)}, which no fact on the sheet states: use the sheet's own numbers, or none`);
    const ids = new Set(f.facts.map(x => x.id)), beats = beatsOf();
    sp.shots.forEach((s, i) => {
      if (!s.point) Er.push(`shot ${i + 1} needs "point"`);
      if (beats.length && !beats.includes(String(s.beat || '').toLowerCase())) Er.push(`shot ${i + 1} needs "beat": one of ${beats.join(', ')}`);
      if (!DEVICES[s.device]) Er.push(`shot ${i + 1}: "device" must be one of ${Object.keys(DEVICES).join(', ')}`);
      if (!(+s.hold >= 0 && +s.hold <= 2)) s.hold = Math.max(0, Math.min(2, +s.hold || 0));
      for (const id of s.facts || []) if (!ids.has(id)) Er.push(`shot ${i + 1} uses fact "${id}", which is not in the sheet`);
    });
    // time runs forward (a history reel went 1905, 1814, 1905 and lost its viewer): a shot dated before an earlier one is background
    // or a flashback the spine marks; the hook may tease the end and the last shot may look back
    let top = null;
    sp.shots.forEach((s, i) => {
      const y = whenOf(s.when); if (!Number.isFinite(y) || !i || i === n - 1) return;
      if (top && y < top.y && !/flashback|background/i.test(`${s.when} ${s.beat || ''}`)) Er.push(soft(`shot ${i + 1} ("when": "${s.when}") goes back in time after shot ${top.i + 1} ("${top.when}"): tell the events in the order they happened, or mark it as context its line announces ("when": "background: ${s.when}" or "flashback: ${s.when}")`));
      else if (!top || y > top.y) top = { y, i, when: s.when };
    });
    const have = new Set(sp.shots.map(s => String(s.beat || '').toLowerCase()));
    if (beats.length) needBeats().filter(b => !have.has(b)).forEach(b => Er.push(`no shot covers the "${b}" beat; the template requires it`));
    const p = +sp.payoff_shot;
    if (!(p >= 2 && p <= n)) Er.push(`"payoff_shot" must be a shot from 2 to ${n} (the one that answers the question), got ${sp.payoff_shot}`);
    else if (!(sp.shots[p - 1].facts || []).includes(f.payoff)) Er.push(`the payoff shot (${p}) must use the payoff fact ${f.payoff}`);
    if ((sp.shots[0].facts || []).includes(f.payoff)) Er.push(`the hook (shot 1) uses the payoff fact ${f.payoff}: the hook opens the question and holds the answer back for the payoff shot`);
    const holds = sp.shots.reduce((a, s) => a + (+s.hold || 0), 0);
    if (holds > 3.5) Er.push(soft(`the holds add up to ${holds.toFixed(1)} s; keep them on the reveal and the answer, at most 3 s in all`));
    return Er;
  }
  // redo: {sp, viewer, script, fix}: the spine built again after the test viewer got lost in the script written on it (not saved:
  // the caller saves it once a script on it passes)
  async function writeSpine(f, redo) {
    const saved = !redo && E.ckLoad('spine.json'); if (saved) { log('spine: restored from checkpoint'); return JSON.parse(saved); }
    const [smin, smax] = shotRange(), beats = beatsOf();
    const system = `${E.prompt('spine').replace('{{DEVICES}}', DEVICE_TEXT).replace('{{DEVICE_NAMES}}', Object.keys(DEVICES).join(', '))}\n\n${storyGuide()}${beats.length ? `\n\nBEATS: give every shot a "beat" from: ${beats.join(', ')}. Required: ${needBeats().join(', ') || 'none'}.` : ''}`;
    // as many shots as the word budget carries at about 10 words a shot, within the template's range (14 fixed shots left 7 words
    // a shot for a 96-word budget, and no fit could cut the draft that far)
    const carry = Math.max(smin, Math.min(smax, Math.floor(E.budget / 10))), lo = Math.min(Math.max(smin, 6), carry), hi = Math.min(smax, Math.max(smin, 8), carry);
    const user = `Brief: ${briefFor(brief)}\nTarget length: ${seconds} seconds: ${lo === hi ? lo : `${lo} to ${hi}`} shots, about ${E.budget} spoken words in all (at least about 10 words a shot: plan no more shots than the words can carry).\n\nFACT SHEET\nQuestion: ${f.question}\nAnswer: ${f.answer}\nPayoff fact: ${f.payoff}\nYardstick: ${f.yardstick || '(none)'}\n${factList(f)}\n\nReturn only the JSON object.`;
    const messages = [{ role: 'user', content: user }];
    if (redo) messages.push({ role: 'assistant', content: JSON.stringify(redo.sp) }, { role: 'user', content: `The scriptwriter wrote this script on your spine:\n\n${redo.script}\n\nA test viewer who knows nothing about the topic and asked for this reel watched it ("answers_request": whether it answers the request as asked; "lost": where it lost the thread):\n${JSON.stringify(redo.viewer, null, 1)}\n\nThe fact checker found: ${redo.fix.length ? JSON.stringify(redo.fix, null, 1) : 'nothing wrong'}.\n\nBuild the spine again so the story answers the request as asked (a "why" needs its cause, a "how far" its distance) and the viewer can follow it from the question to the answer: reorder, merge, split, add or cut shots, and change their points, facts and links, as the story needs. Return the complete JSON.` });
    const step = redo ? 'spine-revise' : 'spine', sp = await ask(step, system, messages, o => spineErrors(o, f), redo ? 3 : 4);
    if (!sp) { if (redo) { log('spine-revise: no new spine passed the checks; revising the script on the first one'); return null; } throw new Error('no usable story spine'); }
    if (!redo) E.ckSave('spine.json', sp);
    log(`${step}: ${sp.shots.length} shots, payoff shot ${sp.payoff_shot}: ${sp.shots.map((s, i) => `${i + 1} ${s.beat || ''}/${s.device}${i ? `(${s.link})` : ''}`).join(' ')} | idea: ${sp.idea}`);
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
      // a question is no definition ("Why is a day on Venus longer than its year?" and "How big is the Sun?" were sent back as one)
      if (!/\?\s*$/.test(first) && /^((an?|the)\s+)?[\w-]+(\s+[\w-]+)?\s+(is|are|was|were|means|refers to|removes|describes|is defined as)\b/i.test(first)) Er.push(`shot 1 opens with a definition ("${first}"). Open with a hook instead (a surprising fact, a striking image or a question the viewer wants answered) and give the definition in the next line`);
      if (f && sp) {
        // the payoff's OWN numbers: those no other fact on the sheet holds (the payoff fact often restates the setup's number), by
        // value: by digits "1.25e20" asked for "twenty" and every number under 10 (8.8 years) went unchecked. A date's day and a
        // year are not asked for: a day is said as an ordinal the reader skips, so "26 October 1905" could never pass
        const pay = f.facts.find(x => x.id === f.payoff), other = f.facts.filter(x => x.id !== f.payoff).flatMap(x => valuesIn(x.text)), near5 = (a, b) => Math.abs(a - b) <= Math.abs(b) * 0.05;
        const dated = new Set([...datesIn(pay?.text || '').flatMap(d => [d.day, +d.year]), ...quantitiesIn(pay?.text || '').filter(q => !q.d && Number.isInteger(q.n) && q.n >= 1000 && q.n <= 2100).map(q => q.n)]);
        const own = [...new Set(valuesIn(pay?.text || ''))].filter(v => v && !dated.has(v) && !other.some(o => near5(v, o))), said = t => numbersSaid(t).map(n => n.v);
        const hook = shots[0].lines.map(l => l.text).join(' '), ps = shots[+sp.payoff_shot - 1];
        for (const v of own.filter(v => v >= 10 || !Number.isInteger(v))) if (said(hook).some(x => near5(x, v))) Er.push(soft(`the hook says ${sayNum(v) || fmtNum(v)}, the answer's number: hold it back for the payoff shot (${sp.payoff_shot}) and open the question instead`));
        // asked for while tries remain, never the reason a run ends (a hard check ended the Norway run); the hint is a spoken form
        // the trace reads back
        const spoken = own.map(v => sayNum(v)).filter(Boolean);
        if (own.length && ps && !ps.lines.some(l => said(l.text).some(x => own.some(v => near5(x, v))))) Er.push(soft(`the payoff shot (${sp.payoff_shot}) must say the answer's own number in words (${(spoken.length ? spoken : own.map(fmtNum)).map(w => `"${w}"`).join(' or ')}, from ${pay.id}: ${pay.text}), plainly, never "an unimaginable number"`));
        // the answer once: the payoff shot says it and the close may echo it (QC1 scripts said it 3 to 5 times); the hook is above
        const tells = shots.map((s, i) => (i && i !== +sp.payoff_shot - 1 && i !== shots.length - 1 && s.lines.some(l => said(l.text).some(x => own.some(v => near5(x, v)))) ? i + 1 : 0)).filter(Boolean);
        if (tells.length) Er.push(soft(`shot${tells.length > 1 ? 's' : ''} ${tells.join(', ')} already say${tells.length > 1 ? '' : 's'} the answer's number: say it in the payoff shot (${sp.payoff_shot}) only; the close may echo it once`));
        // every number said must be one the sheet or the request states (nothing else checks a spoken number against the facts)
        const src = withRequest(f.facts, brief);
        // more than 5% off is no fact on the sheet (hard); 2 to 5% off is rounded too far (asked for, so length or rounding never ends a run)
        shots.forEach((s, i) => s.lines.forEach(l => {
          const far = untraced(l.text, src), near = untraced(l.text, src, SPOKEN).filter(x => !far.includes(x));
          if (far.length) Er.push(`shot ${i + 1}: "${l.text}" says ${quoted(far)}, which no fact on the sheet states: say the sheet's numbers (rounded no further than 2%) or leave the number out`);
          if (near.length) Er.push(soft(`shot ${i + 1}: "${l.text}" says ${quoted(near)}, which no fact on the sheet states within 2%: round no further than 2% (a stated comparison must stay true)`));
        }));
        Er.push(...spokenErrors(shots, src));
      }
    }
    // an overrun is not sent back: with thinking off M3 cannot count while rewriting the whole script (it returned the same 116 words
    // for a 102 budget twice, and a hard cap at 1.3x failed the atom run with "no usable script"), so fitWords cuts any draft to length
    const allowed = budgetFor(shots, o.cast), rate = wps(o.cast);
    if (!SCRIPT() && total < allowed * 0.8) { const msg = `the lines total only ${total} words, so the reel would run about ${Math.round(E.padOf(shots) + total / rate)} s instead of ${seconds} s. Use ${Math.ceil(allowed * 0.85)} to ${allowed} words.`; Er.push(total < allowed * 0.7 ? msg : soft(msg)); }
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

  // cut an over-budget script to length: a small call (fit.txt) rewrites the shots to exact word targets, up to 3 rounds; a shot's
  // cut is taken only if it is shorter, has no digits, keeps its speakers and still says its cue word, and the whole cut script is
  // kept only if it passes every hard check
  const countWords = s => s.lines.reduce((a, l) => a + words(l.text), 0);
  // a word for a shot's cue to land on when its own word is cut: the first longer word its lines say that is not a stop word
  const cueIn = lines => { const ws = lines.flatMap(l => String(l.text).match(/[A-Za-z][A-Za-z'’-]*/g) || []); return ws.find(w => w.length >= 5 && !STOP.has(w.toLowerCase())) || ws.find(w => !STOP.has(w.toLowerCase())) || ws[0]; };
  // a small call that rewrites only some shots' lines ({shots: [{shot, lines}]}), and their "see" where the request sends one; a
  // shot's new lines are taken only if they have no digits, keep the cast, still say the cue word and pass `accept(old shot, new
  // lines, shot index, new see)`. moveCue: lines that no longer say the cue word move it to the word the answer's "cue" names
  // (or one they say), so a claim that holds the cue word can still be cut
  async function editShots(step, promptName, req, cur, accept, context = '', moveCue = false) {
    const text = await E.m3(step, `${E.prompt(promptName)}${context}`, [{ role: 'user', content: `${JSON.stringify({ shots: req }, null, 1)}\n\nReturn only the JSON object.` }], 8000);
    let r; try { r = E.extractJson(text); } catch { return cur; }
    const asked = new Set(req.map(q => q.shot - 1)), seeAsked = new Set(req.filter(q => q.see != null).map(q => q.shot - 1)), next = { ...cur, shots: cur.shots.map(s => ({ ...s })) };
    for (const x of r?.shots || []) {
      const i = +x.shot - 1, s = next.shots[i];
      if (!s || !asked.has(i)) continue;
      const lines = Array.isArray(x.lines) && x.lines.length ? x.lines.filter(l => l?.text).map((l, k) => ({ ...(s.lines[k] || {}), who: l.who || s.lines[0].who, text: String(l.text).trim(), ...(l.tone ? { tone: l.tone } : {}) })) : s.lines;
      const see = seeAsked.has(i) && typeof x.see === 'string' && x.see.trim() ? x.see.trim() : s.see;
      const said = w => typeof w === 'string' && !!w.trim() && lines.some(l => says(l.text, w));
      const cue = !s.cue?.word || said(s.cue.word) ? s.cue?.word : moveCue ? [x.cue, cueIn(lines)].find(said) : null;
      const ok = lines.length && lines.every(l => !/[0-9]/.test(l.text) && cur.cast?.[l.who]) && (!s.cue?.word || cue);
      if (ok && (lines !== s.lines || see !== s.see) && accept(s, lines, i, see)) {
        if (cue !== s.cue?.word) { log(`${step}: shot ${i + 1}'s cue moved from "${s.cue.word}" to "${cue}"`); s.cue = { ...s.cue, word: cue }; }
        s.lines = lines; s.see = see;
      }
    }
    return next;
  }
  // a rewrite brings no number the sheet does not state (a fix once "corrected" a line to a number no fact held)
  // held to 2%; `old` (the fit's draft shot) may keep a 2-5% number it already said, so a draft kept with one can still be cut
  const newNumbers = (lines, f, old) => {
    const src = withRequest(f.facts, brief), had = (old?.lines || []).flatMap(l => numbersSaid(l.text).map(n => n.v));
    return lines.flatMap(l => { const far = untraced(l.text, src); return untraced(l.text, src, SPOKEN).filter(s => far.includes(s) || !numbersSaid(s).some(n => had.includes(n.v))); });
  };
  const sameLines = (a, b) => a.lines.map(l => l.text).join('\n') === b.lines.map(l => l.text).join('\n') && (a.see || '') === (b.see || '');
  // the shots a problem is about: its own shot, or for a wrong sheet fact ("f15: ...") every shot whose spine uses that fact (a
  // meaningless payoff fact stayed in the Mariana script: a sheet problem named no shot)
  const shotsOf = (p, o, sp) => { if (o.shots[+p.shot - 1]) return [+p.shot - 1]; const id = String(p.claim || '').match(/^(\w+):/)?.[1]; return id && sp ? sp.shots.map((s, i) => ((s.facts || []).includes(id) && o.shots[i] ? i : -1)).filter(i => i >= 0) : []; };
  // the problems still flagged in o1, judged against o0: fixed only where every shot a problem touches was rewritten (a wrong fact
  // in shots 2 and 3, fixed in 2 only, was dropped while 3 still said it); a change to the screen alone counts for a shot with one
  // problem only. Judged against the script before every fix pass (a fact fixed in shot 2 by one pass and shot 3 by the next stayed)
  function stillFlagged(o0, o1, ps, sp) {
    const count = {}; for (const p of ps) for (const i of shotsOf(p, o0, sp)) count[i] = (count[i] || 0) + 1;
    const fixedIn = i => o1.shots[i].lines.map(l => l.text).join('\n') !== o0.shots[i].lines.map(l => l.text).join('\n') || (!sameLines(o1.shots[i], o0.shots[i]) && count[i] === 1);
    return ps.filter(p => { const at = shotsOf(p, o0, sp); return !at.length || !at.every(fixedIn); });
  }
  // fix the claims a fact check flagged, shot by shot (a whole-script revision kept the wrong claim), keeping the length; returns
  // the script and the problems no taken fix touched (the harness reports those)
  // moveCue: the claim may take the cue word with it (the fixer names the new one in "cue")
  async function fixClaims(o, sp, f, problems, step = 'script-fix', note = '', moveCue = false) {
    const byShot = {}; for (const p of problems || []) for (const i of shotsOf(p, o, sp)) (byShot[i] ||= []).push({ claim: p.claim, problem: `${o.shots[+p.shot - 1] ? p.problem : `the sheet fact this shot uses is wrong: ${p.problem}`}${note}`, fix: p.fix });
    const req = Object.entries(byShot).map(([i, ps]) => ({ shot: +i + 1, max_words: countWords(o.shots[i]) + 2, keep: moveCue ? [] : [o.shots[i].cue?.word].filter(Boolean), ...(moveCue && o.shots[i].cue?.word ? { cue_word: o.shots[i].cue.word } : {}), problems: ps, lines: o.shots[i].lines.map(l => ({ who: l.who, text: l.text, tone: l.tone })), see: o.shots[i].see || '' }));
    const left = (x, ps) => stillFlagged(o, x, ps, sp);
    if (!req.length) return { o, left: problems || [] };
    // the fixer sees the sheet (with each derived fact's calc) and the reference: the fact checker once reversed who paid whom, and
    // its "fix" must not be applied blindly; a new on-screen number must be on the sheet too (a counter showed Earth's 365.25 days)
    const cur = await editShots(step, 'fix', req, o, (s, lines, i, see) => {
      const n = [...newNumbers(lines, f), ...untraced(see || '', [...f.facts, { text: s.see || '' }])]; if (n.length) { log(`${step}: shot ${i + 1}'s fix says ${quoted(n)}, which no fact on the sheet states; not taken`); return false; }
      return lines.reduce((a, l) => a + words(l.text), 0) <= countWords(s) + 3;
    }, `\n\nFACT SHEET\n${calcList(f)}${E.refBlock()}`, moveCue);
    const changed = req.map(q => q.shot).filter(n => !sameLines(cur.shots[n - 1], o.shots[n - 1]));
    if (!changed.length) { log(`${step}: no fix was taken for shots ${req.map(q => q.shot).join(', ')}; keeping the script`); return { o, left: problems || [] }; }
    if (scriptErrors(cur, sp, f).some(e => !e.soft)) { log(`${step}: the fix broke a check; keeping the script`); return { o, left: problems || [] }; }
    log(`${step}: rewrote shots ${changed.join(', ')} for the fact check`);
    return { o: cur, left: left(cur, problems || []) };
  }
  // the last resort for a line still flagged after two fix passes: the claim is dropped, its own sentence or else its whole line, when
  // the shot keeps another sentence and every hard check (the quit hook's "almost none do" for 12% stayed in the final script); a cue
  // word that goes with it moves to a word the shot still says (QC3 Norway: "That night, Oscar renounced his Norwegian throne rather
  // than fight." stayed because it held the cue word). Only a shot's one sentence stays, reported
  const sentences = t => String(t).split(/(?<=[.!?])\s+/).filter(Boolean);
  function dropFlagged(o, problems, sp, f) {
    let cur = o; const dropped = [];
    for (const p of problems) {
      const i = +p.shot - 1, s = cur.shots[i]; if (!s) continue;
      const want = toks(p.claim).filter(w => !STOP.has(w)), score = t => (says(t, p.claim) ? 1 : want.length ? want.filter(w => toks(t).some(x => sameWord(x, w))).length / want.length : 0);
      const parts = s.lines.flatMap((l, j) => { const ss = sentences(l.text); return [...(ss.length > 1 ? ss.map((t, k) => ({ j, k, t })) : []), { j, k: -1, t: l.text }]; });
      const best = parts.map(x => ({ ...x, v: score(x.t) })).filter(x => x.v >= 0.6).sort((a, b) => b.v - a.v || a.t.length - b.t.length)[0];
      const lines = !best ? [] : s.lines.map((l, j) => (j !== best.j ? l : best.k < 0 ? null : { ...l, text: sentences(l.text).filter((_, k) => k !== best.k).join(' ') })).filter(Boolean);
      const cue = !lines.length || !s.cue?.word || lines.some(l => says(l.text, s.cue.word)) ? s.cue : { ...s.cue, word: cueIn(lines) };
      const next = lines.length ? { ...cur, shots: cur.shots.map((x, m) => (m === i ? { ...x, lines, cue } : x)) } : null;
      if (!next || scriptErrors(next, sp, f).some(e => !e.soft)) { log(`script-fix: WARNING: shot ${i + 1}'s line stays flagged (${!best ? 'no line or sentence says the claim' : !next ? 'it is the shot\'s only sentence' : 'dropping it breaks a check'}): "${p.claim}"`); continue; }
      log(`script-fix: dropped shot ${i + 1}'s ${best.k < 0 ? 'line' : 'sentence'} "${best.t}", still flagged: ${p.problem}${cue !== s.cue ? `; its cue moved from "${s.cue.word}" to "${cue.word}"` : ''}`); cur = next; dropped.push(p);
    }
    return { o: cur, dropped };
  }
  // pass 2: the fit again on the cut script, when the first left it more than 20% over
  async function fitWords(o, sp, f, pass = 1) {
    if (SCRIPT()) return o;
    const withHolds = x => x.shots.map((s, i) => ({ ...s, hold: sp ? sp.shots[i].hold : s.hold }));
    const total0 = o.shots.reduce((a, s) => a + countWords(s), 0), step = pass > 1 ? 'script-fit-2' : 'script-fit', allowed0 = budgetFor(withHolds(o), o.cast);
    if (total0 <= allowed0 * 1.05) return o;
    const harder = pass > 1 ? `\n\nAN EARLIER CUT LEFT THIS SCRIPT ${Math.round((total0 / allowed0 - 1) * 100)}% OVER ITS LENGTH: meet each shot's target exactly; cut a whole detail or sentence, or merge two lines, rather than single words.` : '';
    let cur = o;
    for (let round = 1; round <= 3; round++) {
      const shots = withHolds(cur), allowed = budgetFor(shots, cur.cast), total = shots.reduce((a, s) => a + countWords(s), 0);
      if (total <= allowed * 1.05) break;
      // every shot over 6 words gives words in proportion, so the story keeps its shape (cutting the longest shots to the average
      // first flattened an explaining shot into a list item); a short punch line stays
      const long = shots.map((s, i) => [i, countWords(s)]).filter(([, n]) => n > 6), pool = long.reduce((a, [, n]) => a + n, 0), share = Math.max(0, pool - (total - allowed)) / pool;
      const req = long.map(([i, n]) => [i, n, Math.max(4, Math.floor(n * share))]).filter(([, n, t]) => t < n).map(([i, n, t]) => ({ shot: i + 1, target_words: t, now_words: n, keep: [shots[i].cue?.word].filter(Boolean), lines: shots[i].lines.map(l => ({ who: l.who, text: l.text, tone: l.tone })) }));
      if (!req.length) break;
      cur = await editShots(`${step}#${round}`, 'fit', req, cur, (s, lines) => lines.reduce((a, l) => a + words(l.text), 0) < countWords(s) && !newNumbers(lines, f, s).length, `${sp?.idea ? `\n\nWHAT THE STORY IS FOR: ${sp.idea}\nThe viewer should come away with: ${sp.takeaway}` : ''}${harder}`);
    }
    // a shot whose cut breaks a hard check (a hook that lost its question) gets its draft back; the other shots keep their cuts
    const hard = x => scriptErrors(x, sp, f).filter(e => !e.soft).length;
    for (let i = 0; i < cur.shots.length && hard(cur); i++) if (!sameLines(cur.shots[i], o.shots[i])) { const back = { ...cur, shots: cur.shots.map((s, k) => (k === i ? o.shots[i] : s)) }; if (hard(back) < hard(cur)) cur = back; }
    if (hard(cur)) { log(`${step}: the cut broke a check; keeping the ${total0}-word script`); cur = o; }
    const total1 = cur.shots.reduce((a, s) => a + countWords(s), 0), allowed = budgetFor(withHolds(cur), cur.cast);
    log(total1 === total0 ? `${step}: no cut was taken; ${total0} words (budget ${allowed})` : `${step}: ${total0} -> ${total1} words (budget ${allowed})`);
    // more than about 20% over: fit once more from the cut script, whose cuts stay where the next pass breaks a check (QC3 Norway:
    // 285 -> 162 words for a budget of 106, and the reel ran 73.6 s for 45 s)
    if (pass === 1 && total1 > allowed * 1.2) { log(`script-fit: ${Math.round((total1 / allowed - 1) * 100)}% over the budget of ${allowed}; fitting once more`); return fitWords(cur, sp, f, 2); }
    // length never ends a run (a template's fixed 14 shots left 208 words for 96, and stopping lost the whole cut): the shortest
    // fitted script is kept, and the overrun is logged; the harness reports the length against the target
    if (total1 > allowed * 1.3) log(`script-fit: WARNING: ${total1} words after the fit, ${Math.round((total1 / allowed - 1) * 100)}% over the budget of ${allowed}; the reel will run long`);
    return cur;
  }
  // note: what the script on a rebuilt spine must not repeat (the first draft's problems)
  async function writeScript(f, sp, note = '') {
    let user;
    if (sp) {
      const est = sp.shots.map(s => ({ hold: s.hold, lines: [{}] })), allowed = budgetFor(est, null);
      user = `Brief: ${briefFor(brief)}\nTarget length: ${seconds} seconds. Word budget for ALL spoken lines together: about ${allowed} words (the narrator speaks about ${wps(null)} words a second), about ${Math.floor(allowed / sp.shots.length)} a shot on average: a shot takes the words its point needs, an explaining shot more and a punch shot fewer, in one to three sentences.\n\nWHAT THE STORY IS FOR: ${sp.idea || f.question}\nThe viewer should come away with: ${sp.takeaway || f.answer}\n\nFACT SHEET (the only claims you may use; every number you say is one of its numbers, rounding is fine; it holds more than the story needs, so use only what the spine's shots need)\nQuestion: ${f.question}\nAnswer: ${f.answer}\nYardstick: ${f.yardstick || '(none)'}\n${factList(f)}\n\nSPINE\n${JSON.stringify({ shots: sp.shots.map((s, i) => ({ shot: i + 1, beat: s.beat, point: s.point, facts: s.facts, link: s.link, device: s.device, hold: s.hold, ...(s.when ? { when: s.when } : {}) })), payoff_shot: sp.payoff_shot, callback: sp.callback }, null, 1)}${note}\n\nReturn only the JSON object.`;
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
  const json = async (step, system, user, efforts) => { for (let a = 1; a <= 2; a++) { const t = await E.m3(`${step}${a > 1 ? `#${a}` : ''}`, system, [{ role: 'user', content: user }], efforts ? 32000 : 16000, ...(efforts ? [efforts] : [])); try { return E.extractJson(t); } catch { } } return null; };
  // the fact checker sees the brief (it flipped a brief's true premise it could not find in the reference) and each derived fact's
  // calc (it took a sheet ratio with a wrong unit factor as true and "corrected" a right line to match it)
  // it gives a verdict on every fact and shot (a 6-token "no problems" passed a false sheet); a fact it finds wrong joins the
  // problems the harness reads. No thinking: the verdicts already make it read every fact, and low-effort thinking took 47-551 s
  // and up to 29,273 thinking tokens per check in QC1 (the same calls without thinking take 4-20 s)
  async function factcheck(step, o, sp, f) {
    const system = `${E.prompt('factcheck')}${E.refBlock()}`, user = `BRIEF\n${briefFor(brief)}\n\nFACT SHEET (a derived fact shows the engine's arithmetic, a reference fact its quote)\n${calcList(f)}${sp?.idea ? `\n\nIDEA: ${sp.idea}\nTAKEAWAY: ${sp.takeaway}` : ''}\n\nSCRIPT\n${readAloud(o, sp)}\n\nReturn only the JSON object.`;
    const missing = r => { const ids = new Set((r?.facts || []).map(v => v?.id)), shots = new Set((r?.lines || []).map(v => +v?.shot)); return [...f.facts.filter(x => !ids.has(x.id)).map(x => x.id), ...o.shots.map((_, i) => i + 1).filter(n => !shots.has(n)).map(n => `shot ${n}`)]; };
    let r = await json(step, system, user, ['off']), gap = r ? missing(r) : [];
    if (gap.length) { log(`${step}: no verdict for ${gap.join(', ')}; asked once more`); r = (await json(`${step}-again`, system, `${user}\n\nGive a verdict for every fact id and every shot; the last answer left out ${gap.join(', ')}.`, ['off'])) || r; }
    if (r) for (const v of r.facts || []) { const x = f.facts.find(y => y.id === v?.id); if (x && v.verdict && !/^ok\b/i.test(String(v.verdict))) (r.problems ||= []).push({ shot: 'sheet', kind: 'wrong', claim: `${x.id}: ${x.text}`, problem: String(v.verdict), fix: '' }); }
    if (r) { const g = groundingErrors(r, o, f); if (g.length) { log(`${step}: the claim check found ${g.length}: ${g.map(p => `shot ${p.shot} "${p.claim}"`).join('; ')}`); (r.problems ||= []).push(...g); } }
    return r;
  }
  // claim grounding: the checker lists each claim of a shot with the sheet facts it rests on; a cited id must exist, a claim with a
  // number must cite a fact, and each of its numbers must be one its cited facts (or the request) state within 2% (QC1b: without
  // thinking, "two hundred and twenty" for 224.7 days and a false cited fact passed as fine)
  function groundingErrors(r, o, f) {
    const out = [], req = valuesIn(requestOf(brief));
    for (const ln of r?.lines || []) {
      const shot = +ln?.shot; if (!o.shots[shot - 1]) continue;
      for (const c of Array.isArray(ln.claims) ? ln.claims : []) {
        const claim = String(c?.claim || '').trim(), ids = [].concat(c?.facts || []).map(String).filter(Boolean); if (!claim) continue;
        const gone = ids.filter(id => id !== 'request' && !f.facts.some(x => x.id === id)), nums = numbersSaid(claim).filter(n => !n.one);
        const have = [...f.facts.filter(x => ids.includes(x.id)).flatMap(x => valuesIn(x.text)), ...(ids.includes('request') ? req : [])], off = nums.filter(n => !have.some(v => Math.abs(n.v - v) <= Math.abs(v) * SPOKEN));
        const why = gone.length ? `it cites ${gone.join(', ')}, which the sheet does not have` : !nums.length ? '' : !ids.length ? 'it says a number but cites no fact on the sheet' : off.length ? `it says ${quoted(off.map(n => n.s))}, which ${ids.join(', ')} ${ids.length > 1 ? 'do' : 'does'} not state (within 2%)` : '';
        if (why) out.push({ shot, kind: 'unsupported', claim, problem: `the engine's claim check: ${why}`, fix: "say the number the cited fact states (within 2%), or cut the claim" });
      }
    }
    return out;
  }
  // a conflict (the brief against the reference) is reported, never fixed: a fix would flip the brief's premise. One the checker
  // says a sheet fact settles ("settled_by") is no conflict: the line is wrong and is fixed toward the sheet
  const settle = (step, fc, f) => { for (const p of fc?.problems || []) { const ids = [].concat(p?.settled_by || []).filter(id => f.facts.some(x => x.id === id)); if (p?.kind === 'conflict' && ids.length) { p.kind = 'wrong'; p.fix ||= `say it the way the fact sheet does (${ids.join(', ')})`; log(`${step}: shot ${p.shot}'s conflict is settled by ${ids.join(', ')}; fixed toward the sheet`); } } };
  const toFix = fc => (fc?.problems || []).filter(p => p?.kind !== 'conflict');
  // the idea and takeaway steer the script and the revision: one the checker finds wrong takes its fix (a Moon takeaway said "your
  // whole life is barely a tenth of the walk", the walk being about a tenth of a life)
  const fixPurpose = (step, fc, sp) => toFix(fc).filter(p => { const k = String(p?.shot || '').toLowerCase(), fix = String(p?.fix || '').trim(); if (!((k === 'idea' || k === 'takeaway') && fix && !/^cut\b/i.test(fix))) return false; log(`${step}: the ${k} "${sp[k]}" was wrong (${p.problem}); now "${fix}"`); sp[k] = fix; return true; });
  const conflicts = (step, fc) => { const c = (fc?.problems || []).filter(p => p?.kind === 'conflict'); for (const p of c) if (!/^a conflict/.test(p.problem || '')) p.problem = `a conflict between the brief and the reference, reported, not fixed: ${p.problem || ''}`; if (c.length) log(`${step}: ${c.length} conflict(s) reported, not fixed: ${c.map(p => `shot ${p.shot}: ${p.problem}`).join('; ')}`); return c; };
  async function reviewScript(o, sp, f) {
    // the viewer is the person who asked: it judges whether the reel answers the request as asked (Nemo's "how far from any land"
    // was never answered, a "why" got a restatement); the request only, never the intake's Goal line
    const [viewer, fc] = await Promise.all([json('viewer', E.prompt('viewer'), `YOUR REQUEST\n${requestOf(brief)}\n\nTHE REEL\n${readAloud(o, sp)}\n\nReturn only the JSON object.`), factcheck('factcheck', o, sp, f)]);
    return { viewer, factcheck: fc };
  }
  const unanswered = v => /^no\b/i.test(String(v?.answers_request || '').trim());
  const needsRevision = r => {
    const v = r.viewer, sc = v?.scores || {};
    return !!(toFix(r.factcheck).length || v?.lost?.length || v?.flat?.length || unanswered(v) || ['hook', 'clarity', 'flow', 'payoff'].some(k => +sc[k] && +sc[k] < 4));
  };

  // ---------- the whole writer ----------
  async function writeStory() {
    const saved = E.ckLoad('script.json'); if (saved) { log('script: restored from checkpoint'); return JSON.parse(saved); }
    let story;
    if (SCRIPT()) {
      const { o } = await writeScript(null, null);
      story = { title: o.title, music: { ...(o.music || {}), payoff_shot: +o.payoff_shot || o.shots.length }, cast: o.cast, shots: o.shots.map(s => ({ beat: s.beat, point: s.point, device: DEVICES[s.device] ? s.device : 'act', hold: Math.max(0, Math.min(2, +s.hold || 0)), lines: s.lines, cue: s.cue, see: s.see })) };
    } else {
      const f = await writeFacts();
      let sp = await writeSpine(f), { o, messages } = await writeScript(f, sp);
      o = await fitWords(o, sp, f); messages[messages.length - 1] = { role: 'assistant', content: JSON.stringify(o) }; // the revision starts from the cut script
      const review = await reviewScript(o, sp, f), v = review.viewer;
      settle('fact check', review.factcheck, f); fixPurpose('fact check', review.factcheck, sp);
      log(`test viewer: ${v ? `scores ${JSON.stringify(v.scores || {})}, lost ${v.lost?.length || 0}, flat ${v.flat?.length || 0}; Q "${v.question}" A "${v.answer}"; remembers "${v.remember || ''}"; answers the request: ${v.answers_request || '?'}` : 'no answer'} | fact check: ${review.factcheck ? `${review.factcheck.problems?.length || 0} problems` : 'no answer'}`);
      conflicts('fact check', review.factcheck);
      let revised = false, rebuilt = false;
      if (needsRevision(review)) {
        const fix = toFix(review.factcheck);
        // a viewer lost in the story, or a request the reel does not answer: the story is wrong, not only its words, so the spine is
        // built again once (a revision held to the spine kept the chronology jump the viewer had named); the new script is checked below
        let sp2 = v?.lost?.length || unanswered(v) ? await writeSpine(f, { sp, viewer: v, script: readAloud(o, sp), fix }) : null;
        if (sp2) {
          try {
            const r = await writeScript(f, sp2, fix.length ? `\n\nAn earlier draft had these fact problems; do not repeat them:\n${JSON.stringify(fix, null, 1)}` : '');
            o = await fitWords(r.o, sp2, f); sp = sp2; revised = rebuilt = true; E.ckSave('spine.json', sp);
            log('spine-revise: the script was written again on the new spine');
          } catch (e) { log(`spine-revise: ${e.message} on the new spine; revising the script on the first one`); sp2 = null; }
        }
        if (!sp2) {
          messages.push({ role: 'user', content: `A test viewer who knows nothing about the topic watched your script (without the fact sheet):\n${JSON.stringify(v || {}, null, 1)}\n\nThe question the reel should open: "${sp.question || f.question}". The answer it should give: "${sp.answer || f.answer}". The viewer should come away with: "${sp.takeaway || f.answer}"; if what they would remember is a detail that does not serve it, cut that detail or make it serve the answer.\n\nThe fact checker found: ${fix.length ? JSON.stringify(fix, null, 1) : 'nothing wrong'}.\n\nRewrite the script to fix: every fact problem (use its fix), every shot the viewer got lost in or found flat, and any gap between the viewer's question and answer and the intended ones. Keep the spine's shots and holds and about the word budget. Return the complete JSON.` });
          const o2 = await ask('script-revise', scriptSystem(), messages, x => scriptErrors(x, sp, f), 3);
          if (o2) { o = await fitWords(o2, sp, f); revised = true; }
          else log('script-revise: no revision passed the checks; keeping the script from before the review');
        }
      }
      // a revision can bring new claims (one added "about twenty cents each" after the check): check the facts again, fix once
      if (revised) {
        const fc2 = await factcheck('factcheck-2', o, sp, f); review.factcheck2 = fc2; settle('fact check of the revision', fc2, f);
        log(`fact check of the revision: ${fc2 ? `${fc2.problems?.length || 0} problems` : 'no answer'}`);
        // the harness reads the last fact check (script.json review.factcheck2): the first one's conflicts stay in it
        const seen = new Set(conflicts('fact check of the revision', fc2).map(p => `${p.shot}|${p.claim}`)), carry = (review.factcheck?.problems || []).filter(p => p?.kind === 'conflict' && !seen.has(`${p.shot}|${p.claim}`));
        if (carry.length) review.factcheck2 = { ...(fc2 || {}), problems: [...(fc2?.problems || []), ...carry] };
        // one fix pass on what it found; only what no taken fix touched stays reported (fixed problems stayed listed as flags in the
        // final script.json); a wrong sheet fact no shot uses is marked as not said
        const purpose = fixPurpose('fact check of the revision', fc2, sp), todo = toFix(fc2).filter(p => !purpose.includes(p));
        for (const p of todo) if (!shotsOf(p, o, sp).length && p.shot === 'sheet') p.unused = true;
        const active = todo.filter(p => !p.unused), o0 = o;
        let fx = active.length ? await fixClaims(o, sp, f, active) : { o, left: active };
        // a flagged line must not survive: what stays goes to the fixer once more, now free to cut the claim with its cue word (the cue
        // moves), then a claim still flagged is dropped where its shot can lose it; only what is left after that stays reported
        if (fx.left.some(p => shotsOf(p, fx.o, sp).length)) { const again = await fixClaims(fx.o, sp, f, fx.left, 'script-fix-2', ' (an earlier fix was not taken: its numbers were not the sheet\'s within 2%, or it ran too long; say the sheet\'s own number or cut the claim, even when it holds the cue word)', true); fx = { o: again.o, left: stillFlagged(o0, again.o, active, sp) }; }
        const drop = dropFlagged(fx.o, fx.left, sp, f);
        o = drop.o; fx = { o, left: fx.left.filter(p => !drop.dropped.includes(p)) };
        for (const p of drop.dropped) p.dropped = true;
        const fixed = [...purpose, ...todo.filter(p => !p.unused && !fx.left.includes(p))];
        if (fixed.length) { review.factcheck2 = { ...review.factcheck2, problems: (review.factcheck2?.problems || []).filter(p => !fixed.includes(p)) }; review.fixed2 = fixed; }
        log(`fact check of the revision: ${fixed.length} fixed, ${(review.factcheck2?.problems || []).length} left`);
      }
      story = { title: o.title, idea: sp.idea, takeaway: sp.takeaway, question: sp.question || f.question, answer: sp.answer || f.answer, ...(String(f.missing || '').trim() ? { missing: f.missing } : {}), callback: sp.callback, music: { ...(o.music || {}), payoff_shot: +sp.payoff_shot },
        cast: o.cast, voice_model: E.voiceModel, wps: wps(o.cast), facts: f.facts, payoff: f.payoff, review: { ...review, revised, ...(rebuilt ? { spine_rebuilt: true } : {}) },
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
const problemLine = p => `- shot ${p.shot}: "${p.claim}": ${p.problem} -> ${p.kind === 'conflict' ? '(a conflict: reported, not fixed)' : p.fix}${p.unused ? ' (no shot uses this fact)' : ''}${p.dropped ? ' (its line was dropped)' : ''}`;
export function scriptMd(st) {
  const fx = Object.fromEntries((st.facts || []).map(f => [f.id, f]));
  const factLine = f => `${f.text}${f.source === 'derived' ? ` [= ${f.calc}]` : f.source === 'general' ? ' [general]' : ''}`;
  const out = [`# ${st.title || 'untitled'}`, ''];
  if (st.idea) out.push(`**Idea:** ${st.idea}`, `**Takeaway:** ${st.takeaway || ''}`);
  if (st.missing) out.push(`**Missing from the sheet:** ${st.missing}`);
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
  if (r?.viewer) { const v = r.viewer; out.push('## Test viewer (on the first draft)', `Scores: ${JSON.stringify(v.scores || {})}`, `Question: ${v.question || ''}`, `Answer: ${v.answer || ''}`, `Remember: ${v.remember || ''}`, `Answers the request: ${v.answers_request || ''}`,...(v.lost || []).map(x => `- lost in shot ${x.shot}: ${x.why}`), ...(v.flat || []).map(x => `- flat shot ${x.shot}: ${x.why}`), v.want ? `Still wants: ${v.want}` : '', ''); }
  if (r?.factcheck2) out.push('## Fact check of the revision (left in the script)', ...(r.factcheck2.problems?.length ? r.factcheck2.problems.map(problemLine) : ['nothing wrong']), '');
  if (r?.fixed2?.length) out.push('## Fixed after the second fact check', ...r.fixed2.map(problemLine), '');
  if (r?.factcheck) out.push('## Fact check (first draft)', ...(r.factcheck.problems?.length ? r.factcheck.problems.map(problemLine) : ['nothing wrong']), '');
  if (r) out.push(`Revised after the review: ${r.revised ? `yes${r.spine_rebuilt ? ' (the spine was built again)' : ''}` : 'no'}`);
  return out.filter(x => x !== null).join('\n');
}
