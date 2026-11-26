// Claude token usage and cost of one Claude Code session, optionally split into phases.
//   node studio/tools/claude_cost.cjs ~/.claude/projects/C--Users-XZNON-fastreel/<session-id>.jsonl [marker ...]
// Each marker is a regular expression; a phase starts at the first tool call whose input matches it, in order, e.g.
//   "rea-video survey" "templates/[a-z-]+\.md" "run_reel\.sh"   -> before survey | analysis | template | reels + fixes
// The session id of the current session is the jsonl named after it (newest file in that folder).
const fs = require('fs');
const [file, ...markers] = process.argv.slice(2);
if (!file) { console.log('usage: node claude_cost.cjs <session.jsonl> [marker regex ...]'); process.exit(1); }
const L = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const firstCall = re => { for (const j of L) { const c = j.message && j.message.content; if (Array.isArray(c)) for (const b of c) if (b.type === 'tool_use' && re.test(JSON.stringify(b.input))) return j.timestamp; } return null; };
const times = L.filter(j => j.timestamp).map(j => j.timestamp).sort(), start = times[0], end = times[times.length - 1] + 'z';
// Opus 5.5 list prices per million tokens: $4 input, $5 cache write, $0.20 cache read, $20 output
const win = (a, b) => {
  const t = { calls: 0, input: 0, cache_write: 0, cache_read: 0, output: 0 }, seen = new Set();
  for (const j of L) { const m = j.message; if (!m || !m.usage || !j.timestamp || j.timestamp < a || j.timestamp >= b || seen.has(m.id)) continue; seen.add(m.id);
    const u = m.usage; t.calls++; t.input += u.input_tokens || 0; t.cache_write += u.cache_creation_input_tokens || 0; t.cache_read += u.cache_read_input_tokens || 0; t.output += u.output_tokens || 0; }
  t.usd = +((t.input * 4 + t.cache_write * 5 + t.cache_read * 0.2 + t.output * 20) / 1e6).toFixed(2); return t;
};
const cuts = [['start', start], ...markers.map(m => [m, firstCall(new RegExp(m))]).filter(([m, t]) => t || (console.log(`marker not found: ${m}`), false)), ['end', end]];
for (let i = 0; i < cuts.length - 1; i++) console.log(`${cuts[i][0]} -> ${cuts[i + 1][0]}`.padEnd(48).slice(0, 48), JSON.stringify(win(cuts[i][1], cuts[i + 1][1])));
console.log('whole session'.padEnd(48), JSON.stringify(win(start, end)));
