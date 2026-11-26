// fastreel story writer. The facts, the story and the script are written in their own MiniMax-M3 steps, before any art
// direction, each with its own prompt (engine/prompts/<step>.txt) and engine checks that reject and ask for a redo:
//   facts      reference + brief -> a numbered fact sheet, the viewer's question, its answer, the payoff fact
//              (it may name up to 2 more Wikipedia articles when the answer needs a number the reference lacks)
//   spine      fact sheet -> one shot per point: beat, the point, its facts, how it follows from the shot before, the
//              explanation device, a silent hold
//   script     spine -> spoken lines (1 to 3 a shot) with tones and pauses, the cue word each shot's picture change lands on
//   viewer     a test viewer who knows nothing reads the script blind: what was asked, what was answered, where it lost them
//   factcheck  the script against the reference and the fact sheet (runs at the same time as the viewer)
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
// derived facts: unit factors any calculation may use, the value a fact's text states (with million / billion), its display
const UNIT_FACTORS = new Set([1, 2, 3, 4, 7, 10, 12, 24, 52, 60, 100, 365, 1000, 3600, 1e6, 1e9]);
const MAG = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };
// every number a text states, with its magnitude word applied ("$1 billion" -> 1e9)
const valuesIn = text => [...String(text).replace(/(\d),(?=\d{3}\b)/g, '$1').matchAll(/(\d+(?:\.\d+)?)\s*(thousand|million|billion|trillion)?/gi)].map(m => +m[1] * (MAG[(m[2] || '').toLowerCase()] || 1));
const textHasValue = (text, v) => [...String(text).replace(/(\d),(?=\d{3}\b)/g, '$1').matchAll(/(\d+(?:\.\d+)?)\s*(thousand|million|billion|trillion)?/gi)]
  .some(m => { const n = +m[1] * (MAG[(m[2] || '').toLowerCase()] || 1); return Math.abs(n - v) <= Math.abs(v) * 0.03 + 1e-12; }); // relative only: 0.005 absolute let 0.00004 pass for 0.00017
const fmtNum = v => Math.abs(v) >= 1e9 ? `${+(v / 1e9).toFixed(2)} billion` : Math.abs(v) >= 1e6 ? `${+(v / 1e6).toFixed(2)} million` : Math.abs(v) >= 1 ? `${+v.toFixed(2)}` : `${+v.toPrecision(3)}`;
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
  function factErrors(f) {
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
    // derived facts: the engine does the arithmetic (M3 once said $41 for 10,000 coins was "about twenty cents each")
    const sheetNums = new Set(f.facts.filter(x => x.source !== 'derived').flatMap(x => digitNums(x.text)));
    for (const x of f.facts.filter(x => x.source === 'derived')) {
      const calc = String(x.calc || '').replace(/(\d),(?=\d{3}\b)/g, '$1');
      if (!/^[\d\s.+\-*/()]+$/.test(calc) || !/\d/.test(calc)) { bad(x, `fact ${x.id} is derived: give "calc", its arithmetic from the sheet's numbers with only digits and + - * / ( ), for example "41 / 10000"`); continue; }
      let v; try { v = Function(`"use strict"; return (${calc});`)(); } catch { v = NaN; }
      if (!Number.isFinite(v)) { bad(x, `fact ${x.id}: "calc" ${calc} does not compute`); continue; }
      const odd = (calc.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(n => !UNIT_FACTORS.has(n) && !sheetNums.has(n));
      if (odd.length) bad(x, `fact ${x.id}: "calc" uses ${odd.join(', ')}, which no other fact on the sheet states; derive only from the sheet's own numbers (and unit factors such as 100, 1000, 60, 365)`);
      if (!textHasValue(x.text, v)) bad(x, `fact ${x.id}: ${calc} = ${fmtNum(v)}, but its text says "${x.text}"; write the computed value (rounded) in the text`);
    }
    if (!f.question || !f.answer) Er.push('need "question" and "answer"');
    if (!ids.has(f.payoff)) Er.push(`"payoff" must be the id of the fact that answers the question, got "${f.payoff}"`);
    // a fact the sheet says comes from the brief must have its numbers in the brief (M3 marked an invented present-day value "brief")
    const briefVals = valuesIn(brief);
    for (const x of f.facts.filter(x => x.source === 'brief')) {
      const nums = valuesIn(x.text).filter(n => n >= 10 && !briefVals.some(b => Math.abs(b - n) <= n * 0.005)).map(fmtNum);
      if (nums.length) bad(x, `fact ${x.id} ("${x.text}") is marked "brief", but the brief never states ${nums.join(', ')}: take it from the REFERENCE (source "reference"), derive it from the sheet's numbers (source "derived" with "calc"), or drop it`);
    }
    // a fact the sheet says comes from the reference must have its numbers there (M3 marked invented dates "reference")
    if (E.hasRef()) for (const x of f.facts.filter(x => x.source === 'reference')) {
      const nums = E.numbersNotIn([x.text]);
      if (nums.length) bad(x, `fact ${x.id} ("${x.text}") says ${nums.map(b => `"${b}"`).join(', ')}, which the REFERENCE never states: use the reference's own number, or drop the fact`);
    }
    return Er;
  }
  async function writeFacts() {
    const saved = E.ckLoad('facts.json'); if (saved) { log('facts: restored from checkpoint'); return JSON.parse(saved); }
    const system = () => `${E.prompt('facts')}\n\n${E.guide('about', 'story')}${E.refBlock()}`;
    const clean = x => { if (!x) return x; const drop = new Set(factErrors(x).map(e => e.drop).filter(Boolean)); if (drop.size) { log(`facts: dropped ${[...drop].join(', ')} (failed their check)`); x.facts = x.facts.filter(y => !drop.has(y.id)); } return x; };
    let f = clean(await ask('facts', system(), [{ role: 'user', content: `Brief: ${brief}\nReturn only the JSON object.` }], factErrors));
    if (!f) throw new Error('no usable fact sheet');
    // "need": {article, look_for} (its passages holding those words) or an article title (its first 4000 chars)
    const need = (Array.isArray(f.need) ? f.need : []).filter(t => (typeof t === 'string' && t.trim()) || (typeof t?.article === 'string' && t.article.trim())).slice(0, 2);
    const names = need.map(n => (typeof n === 'string' ? n : `${n.article}${n.look_for?.length ? ` (${n.look_for.join(', ')})` : ''}`)).join('; ');
    if (need.length) { // the answer needs a fact the reference lacks: fetch it once and build the sheet again
      const added = await E.addArticles(need);
      log(`facts: fetched ${names} (${added} chars) for missing facts`);
      if (added) { const f2 = await ask('facts-more', system(), [{ role: 'user', content: `Brief: ${brief}\nThe REFERENCE now also holds what you asked for: ${names}. Return only the JSON object, with "need" empty.` }], factErrors); if (f2) f = clean(f2); }
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
    const user = `Brief: ${brief}\nTarget length: ${seconds} seconds: ${smin === smax ? smin : `${Math.max(smin, 6)} to ${Math.min(smax, Math.max(smin, 8))}`} shots, about ${E.budget} spoken words in all.\n\nFACT SHEET\nQuestion: ${f.question}\nAnswer: ${f.answer}\nPayoff fact: ${f.payoff}\nYardstick: ${f.yardstick || '(none)'}\n${factList(f)}\n\nReturn only the JSON object.`;
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
  // digits, keep the cast, still say the cue word and pass `accept(old shot, new lines)`
  async function editShots(step, promptName, req, cur, accept, context = '') {
    const text = await E.m3(step, `${E.prompt(promptName)}${context}`, [{ role: 'user', content: `${JSON.stringify({ shots: req }, null, 1)}\n\nReturn only the JSON object.` }], 8000);
    let r; try { r = E.extractJson(text); } catch { return cur; }
    const asked = new Set(req.map(q => q.shot - 1)), next = { ...cur, shots: cur.shots.map(s => ({ ...s })) };
    for (const x of r?.shots || []) {
      const i = +x.shot - 1, s = next.shots[i];
      if (!s || !asked.has(i) || !Array.isArray(x.lines) || !x.lines.length) continue;
      const lines = x.lines.filter(l => l?.text).map((l, k) => ({ ...(s.lines[k] || {}), who: l.who || s.lines[0].who, text: String(l.text).trim(), ...(l.tone ? { tone: l.tone } : {}) }));
      const ok = lines.length && lines.every(l => !/[0-9]/.test(l.text) && cur.cast?.[l.who]) && (!s.cue?.word || lines.some(l => says(l.text, s.cue.word)));
      if (ok && accept(s, lines)) s.lines = lines;
    }
    return next;
  }
  // fix the claims a fact check flagged, shot by shot (a whole-script revision kept the wrong claim), keeping the length
  async function fixClaims(o, sp, f, problems) {
    const byShot = {}; for (const p of problems || []) if (o.shots[+p.shot - 1]) (byShot[+p.shot - 1] ||= []).push({ claim: p.claim, problem: p.problem, fix: p.fix });
    const req = Object.entries(byShot).map(([i, ps]) => ({ shot: +i + 1, max_words: countWords(o.shots[i]) + 2, keep: [o.shots[i].cue?.word].filter(Boolean), problems: ps, lines: o.shots[i].lines.map(l => ({ who: l.who, text: l.text, tone: l.tone })) }));
    if (!req.length) return o;
    // the fixer sees the sheet and the reference: the fact checker once reversed who paid whom, and its "fix" must not be applied blindly
    const cur = await editShots('script-fix', 'fix', req, o, (s, lines) => lines.reduce((a, l) => a + words(l.text), 0) <= countWords(s) + 3, `\n\nFACT SHEET\n${factList(f)}${E.refBlock()}`);
    if (scriptErrors(cur, sp, f).some(e => !e.soft)) { log('script-fix: the fix broke a check; keeping the script'); return o; }
    log(`script-fix: rewrote shots ${req.map(q => q.shot).join(', ')} for the fact check`);
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
      cur = await editShots(`script-fit#${round}`, 'fit', req, cur, (s, lines) => lines.reduce((a, l) => a + words(l.text), 0) < countWords(s));
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
      user = `Brief: ${brief}\nTarget length: ${seconds} seconds. Word budget for ALL spoken lines together: at most ${allowed} words (the narrator speaks about ${wps(null)} words a second). Word target per shot: ${Math.floor(allowed / sp.shots.length)} (a short punch shot may take fewer and give them to an explaining shot; the total stays within ${allowed}). Most shots are one line; each extra line costs a breath.\n\nFACT SHEET (the only claims you may use)\nQuestion: ${f.question}\nAnswer: ${f.answer}\nYardstick: ${f.yardstick || '(none)'}\n${factList(f)}\n\nSPINE\n${JSON.stringify({ shots: sp.shots.map((s, i) => ({ shot: i + 1, beat: s.beat, point: s.point, facts: s.facts, link: s.link, device: s.device, hold: s.hold })), payoff_shot: sp.payoff_shot, callback: sp.callback }, null, 1)}\n\nReturn only the JSON object.`;
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
  const factcheck = (step, o, sp, f) => json(step, `${E.prompt('factcheck')}${E.refBlock()}`, `FACT SHEET\n${factList(f)}\n\nSCRIPT\n${readAloud(o, sp)}\n\nReturn only the JSON object.`);
  async function reviewScript(o, sp, f) {
    const [viewer, fc] = await Promise.all([json('viewer', E.prompt('viewer'), `${readAloud(o, sp)}\n\nReturn only the JSON object.`), factcheck('factcheck', o, sp, f)]);
    return { viewer, factcheck: fc };
  }
  const needsRevision = r => {
    const v = r.viewer, sc = v?.scores || {};
    return !!(r.factcheck?.problems?.length || v?.lost?.length || v?.flat?.length || ['hook', 'clarity', 'flow', 'payoff'].some(k => +sc[k] && +sc[k] < 4));
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
      log(`test viewer: ${v ? `scores ${JSON.stringify(v.scores || {})}, lost ${v.lost?.length || 0}, flat ${v.flat?.length || 0}; Q "${v.question}" A "${v.answer}"` : 'no answer'} | fact check: ${review.factcheck ? `${review.factcheck.problems?.length || 0} problems` : 'no answer'}`);
      let revised = false;
      if (needsRevision(review)) {
        messages.push({ role: 'user', content: `A test viewer who knows nothing about the topic watched your script (without the fact sheet):\n${JSON.stringify(v || {}, null, 1)}\n\nThe question the reel should open: "${sp.question || f.question}". The answer it should give: "${sp.answer || f.answer}".\n\nThe fact checker found: ${review.factcheck?.problems?.length ? JSON.stringify(review.factcheck.problems, null, 1) : 'nothing wrong'}.\n\nRewrite the script to fix: every fact problem (use its fix), every shot the viewer got lost in or found flat, and any gap between the viewer's question and answer and the intended ones. Keep the spine (shots, points, facts, links, holds) and the word budget. Return the complete JSON.` });
        const o2 = await ask('script-revise', scriptSystem(), messages, x => scriptErrors(x, sp, f), 3);
        if (o2) { o = await fitWords(o2, sp, f); revised = true; messages[messages.length - 1] = { role: 'assistant', content: JSON.stringify(o) }; }
        else log('script-revise: no revision passed the checks; keeping the script from before the review');
      }
      // a revision can bring new claims (one added "about twenty cents each" after the check): check the facts again, fix once
      if (revised) {
        const fc2 = await factcheck('factcheck-2', o, sp, f); review.factcheck2 = fc2;
        log(`fact check of the revision: ${fc2 ? `${fc2.problems?.length || 0} problems` : 'no answer'}`);
        if (fc2?.problems?.length) o = await fixClaims(o, sp, f, fc2.problems);
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
  if (r?.factcheck2) out.push('## Fact check of the revision', ...(r.factcheck2.problems?.length ? r.factcheck2.problems.map(p => `- shot ${p.shot}: "${p.claim}": ${p.problem} -> ${p.fix}`) : ['nothing wrong']), '');
  if (r?.factcheck) out.push('## Fact check (first draft)', ...(r.factcheck.problems?.length ? r.factcheck.problems.map(p => `- shot ${p.shot}: "${p.claim}": ${p.problem} -> ${p.fix}`) : ['nothing wrong']), '');
  if (r) out.push(`Revised after the review: ${r.revised ? 'yes' : 'no'}`);
  return out.filter(x => x !== null).join('\n');
}
