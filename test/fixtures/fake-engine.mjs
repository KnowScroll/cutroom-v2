// Fake fastreel engine for tests: same flags, a realistic (tiny) output set, no network.
// Env switches:
//   FAKE_ENGINE_CRASH=once|always   exit 1 mid-run (once: only the first invocation for this --out)
//   FAKE_ENGINE_FAILING_SHOT=1      ship shot4 although no attempt passed (real log lines)
//   FAKE_ENGINE_REFUSE=<keys,...>   refuse these --voice-model keys with the engine's own error format
//   FAKE_ENGINE_REFUSE_STATUS=402   HTTP status of that refusal (default 402)
//   FAKE_ENGINE_SLEEP_MS=n          wait before writing outputs
//   FAKE_ENGINE_CHROME=<file>       start a detached grandchild (like puppeteer's Chrome) and write its pid to <file>;
//                                   then idle; on SIGTERM kill the grandchild and exit (like the real engine's handlers)
//   FAKE_ENGINE_SYNTH=1             audio.json with the synth fallback (music.fit.pass null)
//   FAKE_ENGINE_NULL_PITCH=1        audio.json voice without measured pitch (engine/audio.mjs: too little voiced audio)
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
const work = `${out}-work`;
const dir = `${out}-v${cut}`;
const t0 = Date.now();
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s] ${m}`);

fs.mkdirSync(work, { recursive: true });
fs.appendFileSync(
  path.join(work, 'invocations.log'),
  JSON.stringify({ argv, pid: process.pid, env: process.env['CUTROOM_TEMPLATE_DIR'] }) + '\n',
);
log(`asset_reel (fake): "${brief}", ${seconds}s, 0 director rounds`);
log(`template: ${flag('--template')}`);

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

if ((process.env['FAKE_ENGINE_REFUSE'] ?? '').split(',').includes(voice)) {
  const status = process.env['FAKE_ENGINE_REFUSE_STATUS'] ?? '402';
  const body = '{"error":{"message":"Insufficient credits","code":' + status + '}}';
  console.error(
    `FAILED: Error: OpenRouter speech fake/${voice} HTTP ${status}: ${body}\n    at speak (file:///engine/audio.mjs:142:40)`,
  );
  process.exit(1);
}

const crash = process.env['FAKE_ENGINE_CRASH'];
const marker = path.join(work, 'crashed');
if (crash === 'always' || (crash === 'once' && !fs.existsSync(marker))) {
  fs.writeFileSync(marker, '1');
  log('script: restored from checkpoint');
  console.error('FAILED: Error: fake crash\n    at main (file:///engine/asset_reel.mjs:1:1)');
  process.exit(1);
}

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

log('kit attempt 1: rejected: makeKit failed: Unexpected identifier');
log('shot2 attempt 1: rejected: fake check failed');
if (process.env['FAKE_ENGINE_FAILING_SHOT'] === '1') {
  const reason =
    'after kit.bg you paint a solid rectangle over 92% of the frame, which hides the background';
  log(`shot4 attempt 1: rejected: ${reason}`);
  log(`shot4: no attempt passed every check; using the last one that runs (it failed: ${reason})`);
}

fs.mkdirSync(dir, { recursive: true });
const mp4 = spawnSync(
  'ffmpeg',
  [
    ...['-y', '-loglevel', 'error'],
    ...['-f', 'lavfi', '-i', 'color=c=0x204060:s=1080x1920:r=30:d=1'],
    ...['-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:d=1'],
    ...['-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac'],
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
    pitch_st_sd: 4.66,
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
if (process.env['FAKE_ENGINE_SYNTH'] === '1') {
  // engine/audio.mjs pickMusic: the procedural fallback has no fit verdict
  audio.music = {
    source: 'synth',
    title: 'procedural (calm)',
    credit: null,
    fit: { start: 0, pass: null },
  };
}
if (process.env['FAKE_ENGINE_NULL_PITCH'] === '1') {
  audio.voice = {
    model,
    voice: 'meredith',
    pitch_st_sd: null,
    note: 'too little voiced audio to measure',
  };
}
const write = (f, v) => fs.writeFileSync(f, typeof v === 'string' ? v : JSON.stringify(v, null, 2));
write(path.join(dir, 'timeline.json'), timeline);
write(path.join(dir, 'plan.json'), {
  brief,
  seconds,
  story: {
    question: 'How big is it?',
    answer: 'Very big',
    payoff: 'f1',
    facts: [{ id: 'f1', text: 'It is very big.', source: 'reference' }],
  },
  assets: [{ id: 'sun' }],
  shots: [
    { point: 'It is big.', idea: 'STAGE: a big circle.' },
    { point: 'Very big.', idea: 'A small circle beside it.' },
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
write(path.join(work, 'script.md'), 'How big is it?\n');
write(path.join(work, 'plan.json'), { brief, seconds });

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
