#!/usr/bin/env node
// Token and cost report for one reel, total and per phase, from the per-call log the engine saves in <out>-summary.json.
//   node engine/cost_report.mjs reels/<name>-summary.json [more summaries...]
// Phases follow the run order: setup (reference, template pick), plan, poses, kit, assets, sprite sheet (its review and fixes), shots, then each director round
// (its review call plus every redraw it asked for). Inside a phase: draft = first try, fix = retry after the validator
// rejected it, craft = the self-review pass (and its repair). Prices are MiniMax-M3 list prices per million tokens;
// on the Token Plan the same tokens come out of the plan's quota instead.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const PRICE = { in: 0.30, cached: 0.06, out: 1.20 };
const usd = c => (c.input_tokens * PRICE.in + c.cached * PRICE.cached + c.output_tokens * PRICE.out) / 1e6;

export function phases(calls) {
  let round = 0, sheet = false;
  return calls.map(c => {
    const s = c.step;
    if (/^director-r(\d+)/.test(s)) round = +s.match(/^director-r(\d+)/)[1];
    if (/^sheet-review/.test(s)) sheet = true;
    const phase = /^(facts|spine|script|viewer|factcheck)/.test(s) ? 'story' // the writer (engine/writer.mjs), before the plan
      : /^poses/.test(s) ? 'poses'
      : /^sheet-review/.test(s) || (sheet && !round && /-rev/.test(s)) ? 'sprite sheet'
      : /^director-r|-rev/.test(s) ? `review round ${round}`
      : /^(reference|pick-template)/.test(s) ? 'setup'
      : /^plan/.test(s) ? 'plan' : /^kit/.test(s) ? 'kit' : /^asset:/.test(s) ? 'assets' : /^shot\d/.test(s) ? 'shots' : 'other';
    const kind = /-craft/.test(s) ? 'craft' : /#([2-9]|\d\d)$/.test(s) ? 'fix' : /^(director-r|viewer|factcheck|script-revise)/.test(s) ? 'review' : 'draft';
    return { ...c, phase, kind };
  });
}

export function report(summary) {
  const rows = phases(summary.calls || []), order = [], by = {};
  const add = (k, c) => { if (!by[k]) { by[k] = { calls: 0, input: 0, cached: 0, output: 0, usd: 0, seconds: 0 }; order.push(k); } const b = by[k]; b.calls++; b.input += c.input_tokens; b.cached += c.cached; b.output += c.output_tokens; b.usd += usd(c); b.seconds += c.seconds || 0; };
  for (const c of rows) { add(c.phase, c); add(`${c.phase}|${c.kind}`, c); add('TOTAL', c); }
  const n = x => x.toLocaleString('en-US'), pad = (s, w) => String(s).padStart(w);
  const line = (label, b) => `${label.padEnd(26)}${pad(b.calls, 6)}${pad(n(b.input), 11)}${pad(n(b.cached), 11)}${pad(n(b.output), 10)}${pad(n(b.input + b.cached + b.output), 11)}${pad('$' + b.usd.toFixed(4), 10)}${pad(Math.round(b.seconds) + 's', 8)}`;
  const out = [`${String(summary.brief).split('\n')[0].replace(/^#+\s*/, '').slice(0, 90)} |${summary.template || ''} | ${summary.film_s?.toFixed?.(1) ?? '?'} s film | ${summary.wall_s ?? '?'} s wall`,
    `${'phase'.padEnd(26)}${pad('calls', 6)}${pad('input', 11)}${pad('cached in', 11)}${pad('output', 10)}${pad('all tokens', 11)}${pad('cost', 10)}${pad('M3 time', 8)}`];
  for (const k of order.filter(k => !k.includes('|') && k !== 'TOTAL')) {
    out.push(line(k, by[k]));
    for (const kind of ['draft', 'fix', 'craft', 'review']) if (by[`${k}|${kind}`] && Object.keys(by).filter(x => x.startsWith(k + '|')).length > 1) out.push(line(`  ${kind}`, by[`${k}|${kind}`]));
  }
  const speech = summary.speech_usd || 0, music = summary.music_usd || 0, a = summary.audio;
  out.push(line('TOTAL MiniMax', by.TOTAL || { calls: 0, input: 0, cached: 0, output: 0, usd: 0, seconds: 0 }));
  out.push(`voice (${summary.voice_model || 'hexgrad/kokoro-82m'}): $${speech.toFixed(4)}    music (${a?.music?.source || 'synth'}): $${music.toFixed(4)}    reel total: $${((by.TOTAL?.usd || 0) + speech + music).toFixed(4)}    (M3 time is summed per call; calls run in parallel, so it is more than the wall time)`);
  if (a) out.push(`audio (measured): voice ${a.voice?.voice} ${a.voice?.words_per_s} w/s, pitch spread ${a.voice?.pitch_st_sd} st (gate >= 4) | music "${a.music?.title}" from ${a.music?.fit?.start}s, fit ${a.music?.fit?.pass ?? 'n/a'} | voice over music ${a.mix?.voice_over_music_db} dB (gate 10-14), gaps +${a.mix?.music_in_gaps_db} dB (4-10), ${a.mix?.integrated_lufs} LUFS`);
  return out.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const f of process.argv.slice(2)) console.log(report(JSON.parse(fs.readFileSync(f, 'utf8'))) + '\n');
}
