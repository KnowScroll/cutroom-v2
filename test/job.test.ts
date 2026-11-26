import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parseConfig } from '../src/config.ts';
import { runCut } from '../src/engine.ts';
import { basicGates } from '../src/gates/basic.ts';
import { runJob } from '../src/job.ts';
import { createM3 } from '../src/minimax.ts';
import {
  IndexLine,
  gateValue,
  readEvents,
  readJob,
  readRunRecord,
  runDir,
  type RunRecord,
} from '../src/record.ts';
import { startFakeMiniMax, type Step } from './fixtures/fake-minimax.ts';

const root = await mkdtemp(path.join(tmpdir(), 'cutroom-job-'));
process.on('exit', () => {
  rmSync(root, { recursive: true, force: true });
});
const fakeEngine = path.join(import.meta.dirname, 'fixtures', 'fake-engine.mjs');
const templatesDir = path.join(root, 'templates');
await mkdir(templatesDir);
await writeFile(path.join(templatesDir, '_base.md'), '# base\n\n## story\nBASE STORY\n');
await writeFile(
  path.join(templatesDir, 'alpha.md'),
  '# alpha\n\n## about\nALPHA ABOUT\n\n## look\nALPHA LOOK\n',
);

const usage = { input_tokens: 1000, output_tokens: 100 };
const reply = (o: unknown): Step => ({ kind: 'stream', chunks: [JSON.stringify(o)], usage });
const intake = reply({
  template: 'alpha',
  fit: 'good',
  reason: 'fits',
  audience: 'curious adults',
  goal: 'show the size',
  tone: 'wondering',
  seconds: 45,
});
const review = (approve: boolean): Step =>
  reply({
    approve,
    summary: approve ? 'Ready.' : 'Shot 2 is cramped.',
    scores: { hook: 4, clarity: 4, visual: 3, pacing: 4, audio: 4, fit: 4 },
    notes: approve ? {} : { shots: { '2': 'Give the small circle room.' } },
  });

let counter = 0;
async function job(
  script: Step[],
  engineEnv: Record<string, string> = {},
  voices = 'heygen,minimax',
): Promise<{ run: RunRecord; varDir: string }> {
  const varDir = path.join(root, `var${String(++counter)}`);
  const fake = await startFakeMiniMax(script);
  try {
    const config = parseConfig({
      MINIMAX_API_KEY: 'test-key',
      CUTROOM_VAR: varDir,
      CUTROOM_ENGINE: fakeEngine,
      CUTROOM_VOICE_MODELS: voices,
    });
    const run = await runJob({
      config,
      request: { request: 'how big is the Sun' },
      m3: createM3({ apiKey: 'test-key', endpoint: fake.url }),
      templatesDir,
      engineEnv,
    });
    return { run, varDir };
  } finally {
    await fake.close();
  }
}

await test('a job writes job.json done, run.json, report.md, brief.txt, ordered events and an index line', async () => {
  const { run, varDir } = await job([intake, review(true)]);
  const dir = runDir(varDir, run.id);
  assert.equal((await readJob(varDir, run.id)).status, 'done');
  assert.equal((await readJob(varDir, run.id)).error, null);
  const saved = await readRunRecord(varDir, run.id);
  assert.equal(saved.status, 'done');
  assert.equal(saved.approved, true);
  assert.deepEqual(saved.selected?.cut, 1);
  assert.equal(saved.intake?.template, 'alpha');
  assert.match(saved.git_commit, /^[0-9a-f]{40}$/);
  const cut = saved.cuts[0];
  assert.ok(cut);
  assert.match(cut.template_sha, /^[0-9a-f]{64}$/);
  assert.match(cut.voice_model, /^heygen \(fake\/heygen\)$/);
  assert.equal(cut.film_s, 1);
  assert.equal(cut.engine_cost['plan']?.usd, 0.001);
  assert.match(cut.credits, /Voice: synthetic/);
  assert.ok(cut.engine_rejections.some((r) => r.includes('kit attempt 1')));
  assert.equal(cut.gates.length, 5);
  assert.ok(
    cut.gates.every((g) => g.pass && g.mode === 'block'),
    JSON.stringify(cut.gates),
  );
  assert.equal(cut.review?.approve, true);
  assert.deepEqual(
    saved.harness_calls.map((c) => c.step),
    ['intake', 'review-1'],
  );
  assert.ok(saved.harness_calls.every((c) => c.tokens_in === 1000 && c.usd > 0));
  const engineUsd = 0.01 + 0;
  assert.ok(
    Math.abs(saved.totals.usd - (engineUsd + saved.harness_calls.reduce((a, c) => a + c.usd, 0))) <
      1e-9,
  );

  assert.match(
    await readFile(path.join(dir, 'brief.txt'), 'utf8'),
    /^how big is the Sun\n\nAudience: curious adults/,
  );
  assert.match(await readFile(path.join(dir, 'report.md'), 'utf8'), /Cut 1 of 1 \(approved\)/);
  assert.ok(existsSync(path.join(dir, 'review-1.json')));
  assert.ok(existsSync(path.join(dir, 'engine-1.log')));

  const names = (await readEvents(varDir, run.id)).map((e) => e.event);
  assert.deepEqual(names, [
    'job.start',
    'intake.done',
    'engine.start',
    'engine.end',
    'gates.done',
    'review.done',
    'selection',
  ]);
  const lines = (await readFile(path.join(varDir, 'runs', 'index.jsonl'), 'utf8'))
    .trim()
    .split('\n');
  assert.equal(lines.length, 1);
  const line = IndexLine.parse(JSON.parse(lines[0] ?? ''));
  assert.equal(line.id, run.id);
  assert.equal(line.approved, true);
});

await test('a wrong-size video fails the format gate', async () => {
  const varDir = path.join(root, 'var-format');
  const runDirectory = path.join(varDir, 'runs', 'j');
  await mkdir(runDirectory, { recursive: true });
  const briefFile = path.join(runDirectory, 'brief.txt');
  await writeFile(briefFile, 'x');
  const r = await runCut({
    config: { varDir, engineEntry: fakeEngine },
    runDir: runDirectory,
    briefFile,
    template: 'alpha',
    seconds: 45,
    cut: 1,
    voiceModel: 'heygen',
  });
  assert.equal(r.kind, 'cut');
  assert.equal((await basicGates(r)).find((g) => g.name === 'format')?.pass, true);
  const wrong = spawnSync(
    'ffmpeg',
    [
      ...['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=640x360:r=30:d=1'],
      ...['-f', 'lavfi', '-i', 'sine=frequency=440:d=1', '-shortest', '-c:v', 'libx264'],
      ...['-pix_fmt', 'yuv420p', '-c:a', 'aac', r.reelPath],
    ],
    { encoding: 'utf8' },
  );
  assert.equal(wrong.status, 0, wrong.stderr);
  const format = (await basicGates(r)).find((g) => g.name === 'format');
  assert.equal(format?.pass, false);
  assert.match(gateValue(format.value), /640x360/);
  await writeFile(r.reelPath, 'not a video');
  const unreadable = (await basicGates(r)).find((g) => g.name === 'format');
  assert.ok(unreadable);
  assert.equal(unreadable.pass, false);
  assert.equal(unreadable.mode, 'block');
  assert.match(gateValue(unreadable.value), /^unreadable: ffprobe exited/);
});

await test('audio gates read audio.json: a null pitch and a shipped-failing shot block', async () => {
  const { run } = await job([intake, review(false)], {
    FAKE_ENGINE_NULL_PITCH: '1',
    FAKE_ENGINE_FAILING_SHOT: '1',
  });
  const gates = run.cuts[0]?.gates ?? [];
  const by = (n: string) => gates.find((g) => g.name === n);
  assert.equal(by('voice_pitch')?.pass, false);
  assert.equal(by('voice_pitch')?.value, null);
  assert.equal(by('shipped_failing')?.pass, false);
  assert.match(gateValue(by('shipped_failing')?.value ?? null), /shot4/);
  assert.equal(by('music_fit')?.pass, true);
  assert.equal(by('voice_over_music')?.pass, true);
  assert.equal(by('format')?.pass, true);
  assert.equal(run.approved, false);
  assert.equal(run.status, 'done');
  assert.match(run.selected?.why ?? '', /2 blocking gate FAIL/);
});

await test('an approve while a blocking gate FAILs is not approved', async () => {
  const { run, varDir } = await job([intake, review(true)], { FAKE_ENGINE_NULL_PITCH: '1' });
  assert.equal(run.cuts[0]?.review?.approve, true);
  assert.equal(run.approved, false);
  const line = IndexLine.parse(
    JSON.parse((await readFile(path.join(varDir, 'runs', 'index.jsonl'), 'utf8')).trim()),
  );
  assert.equal(line.approved, false);
  assert.equal(line.blocking_fails, 1);
  assert.match(
    await readFile(path.join(runDir(varDir, run.id), 'report.md'), 'utf8'),
    /not approved/,
  );
});

await test('synth music (no fit verdict) fails the music_fit gate, not the job', async () => {
  const { run } = await job([intake, review(true)], { FAKE_ENGINE_SYNTH: '1' });
  assert.equal(run.status, 'done');
  const gate = run.cuts[0]?.gates.find((g) => g.name === 'music_fit');
  assert.ok(gate);
  assert.equal(gate.pass, false);
  assert.equal(gate.value, null);
  assert.equal(run.approved, false);
  assert.ok(run.cuts[0]?.review);
});

await test('an engine that crashes twice gives a failed job with a report', async () => {
  const { run, varDir } = await job([intake], { FAKE_ENGINE_CRASH: 'always' });
  assert.equal(run.status, 'failed');
  assert.match(run.error ?? '', /twice/);
  assert.equal(run.selected, null);
  assert.ok(
    Math.abs(run.totals.usd - (0.84 + run.harness_calls.reduce((a, c) => a + c.usd, 0))) < 1e-9,
  );
  assert.equal((await readJob(varDir, run.id)).status, 'failed');
  const report = await readFile(path.join(runDir(varDir, run.id), 'report.md'), 'utf8');
  assert.match(report, /job failed: engine exited with code 1 twice/);
  assert.equal(
    (await readFile(path.join(varDir, 'runs', 'index.jsonl'), 'utf8')).trim().split('\n').length,
    1,
  );
  assert.ok((await readEvents(varDir, run.id)).some((e) => e.event === 'job.error'));
});

await test('a refused first voice falls back to the second', async () => {
  const { run, varDir } = await job([intake, review(true)], { FAKE_ENGINE_REFUSE: 'heygen' });
  assert.equal(run.status, 'done');
  assert.match(run.cuts[0]?.voice_model ?? '', /^minimax \(fake\/minimax\)$/);
  const sw = run.voice_switches[0];
  assert.equal(run.voice_switches.length, 1);
  assert.ok(sw);
  assert.equal(sw.from, 'heygen');
  assert.equal(sw.to, 'minimax');
  assert.match(sw.reason, /HTTP 402/);
  // The refused invocation paid for its steps before the voice was refused: that cost and time stay on the cut.
  const cut = run.cuts[0];
  assert.ok(cut);
  assert.ok(Math.abs((cut.engine_cost['earlier attempts']?.usd ?? 0) - 0.42) < 1e-9);
  assert.equal(cut.engine_cost['earlier attempts']?.tokens_in, 1_000_000);
  assert.ok(cut.wall_s > 2);
  assert.ok(
    Math.abs(run.totals.usd - (0.42 + 0.01 + run.harness_calls.reduce((a, c) => a + c.usd, 0))) <
      1e-9,
  );
  assert.ok(existsSync(path.join(runDir(varDir, run.id), 'calls-1-1.json')));
  assert.doesNotMatch(
    await readFile(path.join(runDir(varDir, run.id), 'report.md'), 'utf8'),
    /engine rejection:/,
  );
  const events = (await readEvents(varDir, run.id)).map((e) => e.event);
  assert.deepEqual(events.slice(2, 6), [
    'engine.start',
    'voice.refused',
    'voice.switch',
    'engine.start',
  ]);
  assert.match(
    await readFile(path.join(runDir(varDir, run.id), 'report.md'), 'utf8'),
    /heygen -> minimax/,
  );
});

await test('every voice refused fails the job and lists each refusal', async () => {
  const { run } = await job([intake], { FAKE_ENGINE_REFUSE: 'heygen,minimax' });
  assert.equal(run.status, 'failed');
  assert.match(run.error ?? '', /heygen \(HTTP 402/);
  assert.match(run.error ?? '', /minimax \(HTTP 402/);
  assert.equal(run.voice_switches.length, 1);
});

await test('cutroom make runs a job from the command line', async () => {
  const varDir = path.join(root, 'var-cli');
  const envFile = path.join(root, 'cli.env');
  await writeFile(envFile, 'MINIMAX_API_KEY=test-key\n');
  const fake = await startFakeMiniMax([
    reply({
      template: 'kurzgesagt',
      fit: 'good',
      reason: 'fits',
      audience: 'a',
      goal: 'g',
      tone: 't',
      seconds: 45,
    }),
    review(true),
  ]);
  try {
    const child = spawn(
      process.execPath,
      ['src/cli.ts', 'make', 'how big is the Sun', '--template', 'kurzgesagt'],
      {
        env: {
          ...process.env,
          CUTROOM_ENV_FILE: envFile,
          CUTROOM_VAR: varDir,
          CUTROOM_ENGINE: fakeEngine,
          CUTROOM_VOICE_MODELS: 'heygen',
          CUTROOM_MINIMAX_URL: fake.url,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );
    let out = '';
    let err = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d: string) => (out += d));
    child.stderr.on('data', (d: string) => (err += d));
    const code = await new Promise<number | null>((resolve) => child.once('close', resolve));
    assert.equal(code, 0, err);
    const folder = /run folder: (.+)/.exec(out)?.[1]?.trim();
    assert.ok(folder, out);
    assert.match(out, /report: .*report\.md/);
    assert.ok(existsSync(path.join(folder, 'report.md')));
    assert.equal((await readFile(path.join(folder, 'job.json'), 'utf8')).includes('"done"'), true);
  } finally {
    await fake.close();
  }
});

await test('make without a request exits 2', () => {
  const r = spawnSync(process.execPath, ['src/cli.ts', 'make'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
});
