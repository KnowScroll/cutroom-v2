// Fake fastreel engine for tests: same flags, a realistic (tiny) output set, no network.
// Like the engine it keeps checkpoints in <out>-work (made when missing, restored otherwise) and applies --apply-notes
// to them: line notes change the work plan.json, asset and shot notes rewrite asset_<id>.js and shot_<k>.js.
// Env switches (<cuts> is a comma list of --cut numbers, e.g. 1 or 1,4):
//   FAKE_ENGINE_CRASH=once|always   exit 1 mid-run (once: only the first invocation for this --out)
//   FAKE_ENGINE_CRASH_CUT=<n>       FAKE_ENGINE_CRASH applies to cut n only
//   FAKE_ENGINE_CRASH_EARLY=1       the crash comes before the first model call (no calls.json written)
//   FAKE_ENGINE_FAILING_SHOT=<cuts> ship shot2 although no attempt passed (real log lines)
//   FAKE_ENGINE_REFUSE=<keys,...>   refuse these --voice-model keys with the engine's own error format
//   FAKE_ENGINE_REFUSE_STATUS=402   HTTP status of that refusal (default 402)
//   FAKE_ENGINE_SLEEP_MS=n          wait before writing outputs
//   FAKE_ENGINE_CHROME=<file>       start a detached grandchild (like puppeteer's Chrome) and write its pid to <file>;
//                                   then idle; on SIGTERM kill the grandchild and exit (like the real engine's handlers)
//   FAKE_ENGINE_SYNTH=<cuts>        audio.json with the synth fallback (music.fit.pass null)
//   FAKE_ENGINE_NULL_PITCH=<cuts>   audio.json voice without measured pitch (engine/audio.mjs: too little voiced audio)
//   FAKE_ENGINE_LOW_PITCH=<keys>    these --voice-model keys measure 3.1 st (below the voice_pitch gate)
//   FAKE_ENGINE_KEEP_CODE=<ids>     noted shots (numbers) and assets (ids) whose redraw fails its checks: old code stays
//   FAKE_ENGINE_WORK_ASSETS=<ids>   the asset ids of the work plan.json (default sun)
//   FAKE_ENGINE_LINES_KEPT=<shots>  line-noted shots whose kept code passes against the new lines (the real engine's line)
//   FAKE_ENGINE_FLAT_FRAMES=<cuts>  a reel of one flat colour (fails frame gates); otherwise a moving picture that passes
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const out = path.resolve(flag('--out'));
const cut = Number(flag('--cut') ?? 1);
const voice = flag('--voice-model') ?? 'eleven-v4';
const seconds = Number(flag('--seconds') ?? 45);
const brief = fs.readFileSync(flag('--brief-file'), 'utf8').trim();
const notesFile = flag('--apply-notes');
const work = `${out}-work`;
const dir = `${out}-v${cut}`;
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s] ${m}`);
const list = (name) => (process.env[name] ?? '').split(',').filter((x) => x !== '');
const inCut = (name) => list(name).map(Number).includes(cut);

fs.mkdirSync(work, { recursive: true });
const present = fs
  .readdirSync(work)
  .filter((f) => f !== 'invocations.log')
  .sort();
fs.appendFileSync(
  path.join(work, 'invocations.log'),
  JSON.stringify({
    argv,
    pid: process.pid,
    env: process.env['CUTROOM_TEMPLATE_DIR'],
    present,
    notes: notesFile ? fs.readFileSync(notesFile, 'utf8') : null,
  }) + '\n',
);
log(`asset_reel (fake): "${brief}", ${seconds}s, 0 director rounds`);
log(`template: ${flag('--template')}`);

const crash = process.env['FAKE_ENGINE_CRASH'];
const marker = path.join(work, 'crashed');
const crashCut = process.env['FAKE_ENGINE_CRASH_CUT'];
const crashes =
  (crashCut === undefined || Number(crashCut) === cut) &&
  (crash === 'always' || (crash === 'once' && !fs.existsSync(marker)));
const crashNow = () => {
  fs.writeFileSync(marker, '1');
  log('script: restored from checkpoint');
  console.error('FAILED: Error: fake crash\n    at main (file:///engine/asset_reel.mjs:1:1)');
  process.exit(1);
};
if (crashes && process.env['FAKE_ENGINE_CRASH_EARLY'] === '1') crashNow();

// Like the engine's live cost log (ckSave('calls.json')): the model calls paid so far, rewritten by every invocation.
fs.writeFileSync(
  path.join(work, 'calls.json'),
  JSON.stringify({
    brief,
    calls: [
      {
        step: 'story',
        input_tokens: 1000000,
        cached: 0,
        output_tokens: 100000,
        thinking: 0,
        seconds: 1,
      },
    ],
  }),
);

if (list('FAKE_ENGINE_REFUSE').includes(voice)) {
  const status = process.env['FAKE_ENGINE_REFUSE_STATUS'] ?? '402';
  const body = '{"error":{"message":"Insufficient credits","code":' + status + '}}';
  console.error(
    `FAILED: Error: OpenRouter speech fake/${voice} HTTP ${status}: ${body}\n    at speak (file:///engine/audio.mjs:142:40)`,
  );
  process.exit(1);
}

if (crashes) crashNow();

const chromeFile = process.env['FAKE_ENGINE_CHROME'];
if (chromeFile) {
  const chrome = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    detached: process.platform !== 'win32',
    stdio: 'ignore',
    windowsHide: true,
  });
  fs.writeFileSync(chromeFile, String(chrome.pid));
  process.on('SIGTERM', () => {
    chrome.kill('SIGKILL');
    process.exit(0);
  });
  setInterval(() => {}, 1000);
  await new Promise(() => {});
}

const sleep = Number(process.env['FAKE_ENGINE_SLEEP_MS'] ?? 0);
if (sleep > 0) await new Promise((r) => setTimeout(r, sleep));

// checkpoints: each one made when missing (named in the log), restored otherwise
const write = (f, v) => fs.writeFileSync(f, typeof v === 'string' ? v : JSON.stringify(v, null, 2));
const ensure = (name, v) => {
  const f = path.join(work, name);
  if (fs.existsSync(f)) return;
  write(f, v);
  log(`made ${name}`);
};
const workAssets =
  process.env['FAKE_ENGINE_WORK_ASSETS'] === undefined ? ['sun'] : list('FAKE_ENGINE_WORK_ASSETS');
ensure('reference.txt', 'The Sun is a star.');
ensure('facts.json', [{ id: 'f1', text: 'It is very big.' }]);
ensure('spine.json', { question: 'How big is it?' });
ensure('script.json', { shots: 2 });
ensure('script.md', 'How big is it?\n');
ensure('music.json', { title: 'Fake Waltz' });
ensure('plan.json', {
  title: 'Big',
  cast: { narrator: { voice: 'meredith', asset: null } },
  assets: workAssets.map((id) => ({ id, kind: 'prop' })),
  shots: [
    { point: 'It is big.', lines: [{ who: 'narrator', text: 'How big is it?' }] },
    { point: 'Very big.', lines: [] },
  ],
  template: flag('--template'),
});
ensure('kit.js', `// kit (cut ${cut})`);
for (const id of workAssets) {
  ensure(`asset_${id}.js`, `// asset ${id} (cut ${cut})`);
  ensure(`asset_${id}.preview`, 'preview');
}
ensure('shot_1.js', `// shot 1 (cut ${cut})`);
ensure('shot_2.js', `// shot 2 (cut ${cut})`);

if (notesFile) {
  const notes = JSON.parse(fs.readFileSync(notesFile, 'utf8'));
  const keep = list('FAKE_ENGINE_KEEP_CODE');
  const planFile = path.join(work, 'plan.json');
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  log(
    `apply notes: ${Object.keys(notes.lines ?? {}).length} line, ${Object.keys(notes.assets ?? {}).length} asset, ${Object.keys(notes.shots ?? {}).length} shot notes -> reel-v${cut}`,
  );
  for (const [k, ls] of Object.entries(notes.lines ?? {})) {
    const s = plan.shots[Number(k) - 1];
    const nl = ls.filter((l) => plan.cast[l.who]);
    if (s && nl.length > 0) s.lines = nl;
    if (s && nl.length > 0 && list('FAKE_ENGINE_LINES_KEPT').includes(k))
      log(`shot${k}: its lines changed and its code still passes every check; kept`);
  }
  write(planFile, plan);
  const redraw = (file, id, note) => {
    if (keep.includes(id)) {
      log(`${file} attempt 3: rejected: fake check failed; keeping the old code`);
      return;
    }
    write(path.join(work, file), `// ${file} redrawn in cut ${cut}: ${note}`);
  };
  for (const [id, note] of Object.entries(notes.assets ?? {})) {
    if (workAssets.includes(id)) redraw(`asset_${id}.js`, id, note);
  }
  for (const [k, note] of Object.entries(notes.shots ?? {})) {
    if (Number(k) >= 1 && Number(k) <= plan.shots.length) redraw(`shot_${k}.js`, k, note);
  }
}

log('kit attempt 1: rejected: makeKit failed: Unexpected identifier');
log('shot2 attempt 1: rejected: fake check failed');
if (inCut('FAKE_ENGINE_FAILING_SHOT')) {
  const reason =
    'after kit.bg you paint a solid rectangle over 92% of the frame, which hides the background';
  log(`shot2 attempt 1: rejected: ${reason}`);
  log(`shot2: no attempt passed every check; using the last one that runs (it failed: ${reason})`);
}

fs.mkdirSync(dir, { recursive: true });
// a moving Mandelbrot zoom passes every frame gate at cutroom's thresholds; a flat colour fails frame0, blank, balance,
// flat and alive
const picture = inCut('FAKE_ENGINE_FLAT_FRAMES')
  ? 'color=c=0x204060:s=1080x1920:r=30'
  : 'mandelbrot=s=270x480:r=30,scale=1080:1920';
const mp4 = spawnSync(
  'ffmpeg',
  [
    ...['-y', '-loglevel', 'error'],
    ...['-f', 'lavfi', '-i', picture],
    ...['-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:d=1'],
    ...['-t', '1', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac'],
    ...['-shortest', path.join(dir, 'reel.mp4')],
  ],
  { encoding: 'utf8' },
);
if (mp4.status !== 0) {
  console.error(`FAILED: ffmpeg: ${mp4.stderr}`);
  process.exit(1);
}

const lines = [{ who: 'narrator', text: 'How big is it?', start: 0.1, end: 0.9, words: [] }];
const timeline = {
  total: 1,
  shots: [
    { start: 0, dur: 0.5, background: 'space_close', cue: 'big', lines },
    { start: 0.5, dur: 0.5, background: 'space_close', cue: 'sun', lines: [] },
  ],
};
const model = `fake/${voice}`;
const audio = {
  voice: {
    model,
    voice: 'meredith',
    words_per_s: 2.99,
    seconds: 0.8,
    median_f0_hz: 160,
    pitch_st_sd: list('FAKE_ENGINE_LOW_PITCH').includes(voice) ? 3.1 : 4.66,
    pitch_range_st: 15.2,
    loud_range_db: 10.8,
  },
  music: {
    source: 'library',
    title: 'Fake Waltz',
    fit: { start: 1, rise_db: 5.1, covers: true, score: 5.1, pass: true },
  },
  mix: {
    bed_lufs: -20,
    voice_over_music_db: 11.5,
    music_in_gaps_db: 8.2,
    ratio: 2.5,
    integrated_lufs: -14,
    pass: true,
  },
};
if (inCut('FAKE_ENGINE_SYNTH')) {
  // engine/audio.mjs pickMusic: the procedural fallback has no fit verdict
  audio.music = {
    source: 'synth',
    title: 'procedural (calm)',
    credit: null,
    fit: { start: 0, pass: null },
  };
}
if (inCut('FAKE_ENGINE_NULL_PITCH')) {
  audio.voice = {
    model,
    voice: 'meredith',
    pitch_st_sd: null,
    note: 'too little voiced audio to measure',
  };
}
write(path.join(dir, 'timeline.json'), timeline);
// like the engine, the cut's plan.json holds the code it shipped for the kit, each asset and each shot
const code = (name) => {
  const f = path.join(work, name);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
};
write(path.join(dir, 'plan.json'), {
  brief,
  seconds,
  story: {
    question: 'How big is it?',
    answer: 'Very big',
    payoff: 'f1',
    facts: [{ id: 'f1', text: 'It is very big.', source: 'reference' }],
  },
  kit: code('kit.js'),
  assets: [{ id: 'sun', code: code('asset_sun.js') }],
  shots: [
    { point: 'It is big.', idea: 'STAGE: a big circle.', code: code('shot_1.js') },
    { point: 'Very big.', idea: 'A small circle beside it.', code: code('shot_2.js') },
  ],
});
const sheet = spawnSync(
  'ffmpeg',
  [
    ...['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=400x300:d=0.1'],
    ...['-frames:v', '1', path.join(dir, 'assets.jpg')],
  ],
  { encoding: 'utf8' },
);
if (sheet.status !== 0) {
  console.error(`FAILED: ffmpeg: ${sheet.stderr}`);
  process.exit(1);
}
write(path.join(dir, 'audio.json'), audio);
write(
  path.join(dir, 'CREDITS.md'),
  `# Credits and posting checklist\n\n- Voice: synthetic (${model})\n`,
);

const cost = [
  `${brief} |${flag('--template')} | 1.0 s film | 2 s wall`,
  'phase                      calls      input  cached in    output all tokens      cost M3 time',
  'plan                           1      1,000        100       200      1,300   $0.0010      1s',
  'kit                            2      2,000        200       300      2,500   $0.0020      2s',
  '  draft                        1      1,500          0       200      1,700   $0.0015      1s',
  'sprite sheet                   1      3,000          0       400      3,400   $0.0030      1s',
  'shots                          2      4,000        400       500      4,900   $0.0040      1s',
  'TOTAL MiniMax                  6     10,000        700     1,400     12,100   $0.0100      5s',
  `voice (${model}): $0.0000    music (library): $0.0000    reel total: $0.0100    (M3 time is summed per call)`,
  '',
].join('\n');
write(`${out}-cost.txt`, cost);
write(`${out}-summary.json`, {
  brief,
  template: flag('--template'),
  seconds,
  final: dir,
  film_s: 1,
  minimax_calls: 6,
  input_tokens: 10000,
  cached_tokens: 700,
  output_tokens: 1400,
  thinking_tokens: 0,
  llm_usd: 0.01,
  speech_usd: 0,
  voice_model: model,
  music_usd: 0,
  audio,
  wall_s: 2,
  calls: [],
});
log(`final: ${path.join(dir, 'reel.mp4')}`);
