import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  EngineBusyError,
  EngineCrashError,
  killTree,
  parseOutputs,
  runCut,
  type CutResult,
  type RunCutOptions,
  type VoiceRefused,
} from '../src/engine.ts';

const fakeEngine = path.join(import.meta.dirname, 'fixtures', 'fake-engine.mjs');

interface Setup {
  opts: RunCutOptions;
  varDir: string;
  lockFile: string;
  invocations: () => number;
}

async function setup(env: Record<string, string> = {}): Promise<Setup> {
  const varDir = path.join(await mkdtemp(path.join(tmpdir(), 'cutroom-engine-')), 'var');
  const runDir = path.join(varDir, 'runs', 'job1');
  await mkdir(runDir, { recursive: true });
  const briefFile = path.join(runDir, 'brief.txt');
  writeFileSync(briefFile, 'how big is the Sun');
  return {
    varDir,
    lockFile: path.join(varDir, 'engine.lock'),
    invocations: () => {
      const f = path.join(runDir, 'reel-work', 'invocations.log');
      return existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n').length : 0;
    },
    opts: {
      config: { varDir, engineEntry: fakeEngine },
      runDir,
      briefFile,
      template: 'kurzgesagt',
      seconds: 45,
      cut: 1,
      voiceModel: 'heygen',
      env,
    },
  };
}

function cutOf(r: CutResult | VoiceRefused): CutResult {
  if (r.kind !== 'cut') throw new Error('expected a cut, got a voice refusal');
  return r;
}

/** A process of our own that stays alive; on Linux its own group so killTree reaches it. */
function sleeper(): ChildProcess & { pid: number } {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: 'ignore',
    detached: process.platform !== 'win32',
    windowsHide: true,
  });
  assert.ok(child.pid !== undefined);
  return Object.assign(child, { pid: child.pid });
}

async function deadPid(): Promise<number> {
  const child = spawn(process.execPath, ['-e', ''], { stdio: 'ignore', windowsHide: true });
  const pid = child.pid;
  assert.ok(pid !== undefined);
  await new Promise((r) => child.once('close', r));
  return pid;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

await test('a successful cut is parsed from the files the engine wrote', async () => {
  const s = await setup();
  const r = cutOf(await runCut(s.opts));
  assert.equal(r.cut, 1);
  assert.equal(r.filmS, 1);
  assert.equal(r.voiceModelId, 'fake/heygen');
  assert.equal(r.minimaxCalls, 6);
  assert.deepEqual(r.tokens, { input: 10000, cached: 700, output: 1400 });
  assert.deepEqual(r.cost['shots'], { usd: 0.004, tokens_in: 4000, tokens_out: 500 });
  assert.deepEqual(r.cost['sprite sheet'], { usd: 0.003, tokens_in: 3000, tokens_out: 400 });
  assert.equal(r.cost['draft'], undefined);
  assert.equal(r.cost['voice']?.usd, 0);
  assert.equal(r.shots.length, 2);
  assert.equal(r.audio.pitchStSd, 4.66);
  assert.equal(r.audio.musicFitPass, true);
  assert.equal(r.audio.mixPass, true);
  assert.equal(r.rejections.length, 2);
  assert.deepEqual(r.failingSteps, []);
  assert.ok(existsSync(r.reelPath));
  assert.equal(path.basename(r.logPath), 'engine-1.log');
  assert.equal(path.basename(r.summaryPath), 'reel-summary-1.json');
  assert.ok(existsSync(r.summaryPath));
  assert.ok(!existsSync(s.lockFile), 'lock released');
  const argv = (await readFile(path.join(r.workDir, 'invocations.log'), 'utf8')).trim();
  assert.ok(argv.includes('--rounds'));
  assert.ok(!argv.includes('--cut'), 'cut 1 is the engine default');
  assert.ok(!argv.includes('--apply-notes'));
});

await test('cut n and notes pass --cut and --apply-notes', async () => {
  const s = await setup();
  const notes = path.join(s.opts.runDir, 'notes-2.json');
  writeFileSync(notes, '{}');
  const r = cutOf(await runCut({ ...s.opts, cut: 2, notesFile: notes }));
  assert.equal(path.basename(r.dir), 'reel-v2');
  assert.equal(path.basename(r.logPath), 'engine-2.log');
  const line = readFileSync(path.join(r.workDir, 'invocations.log'), 'utf8');
  assert.match(line, /"--cut","2"/);
  assert.match(line, /"--apply-notes"/);
});

await test('failing-shot lines are parsed', async () => {
  const s = await setup({ FAKE_ENGINE_FAILING_SHOT: '1' });
  const r = cutOf(await runCut(s.opts));
  assert.equal(r.failingSteps.length, 1);
  assert.equal(r.failingSteps[0]?.step, 'shot4');
  assert.match(r.failingSteps[0].reason, /solid rectangle over 92%/);
  assert.equal(r.rejections.length, 3);
});

await test('a voice refusal is returned without a rerun (429 too)', async () => {
  for (const status of ['402', '429']) {
    const s = await setup({ FAKE_ENGINE_REFUSE: 'heygen', FAKE_ENGINE_REFUSE_STATUS: status });
    const r = await runCut(s.opts);
    if (r.kind !== 'voice_refused') throw new Error('expected a voice refusal');
    assert.equal(r.model, 'heygen');
    assert.equal(r.status, Number(status));
    assert.match(r.message, /Insufficient credits/);
    assert.equal(s.invocations(), 1);
    assert.ok(!existsSync(s.lockFile));
  }
});

await test('a crash once reruns the same command and resumes', async () => {
  const s = await setup({ FAKE_ENGINE_CRASH: 'once' });
  const r = cutOf(await runCut(s.opts));
  assert.equal(s.invocations(), 2);
  assert.match(readFileSync(r.logPath, 'utf8'), /fake crash/);
  assert.equal(r.filmS, 1);
});

await test('a second crash throws with the log tail', async () => {
  const s = await setup({ FAKE_ENGINE_CRASH: 'always' });
  await assert.rejects(runCut(s.opts), (e: unknown) => {
    assert.ok(e instanceof EngineCrashError);
    assert.match(e.message, /fake crash/);
    return true;
  });
  assert.equal(s.invocations(), 2);
  assert.ok(!existsSync(s.lockFile));
});

await test('a held lock blocks a second run', async () => {
  const s = await setup();
  const live = sleeper();
  try {
    writeFileSync(
      s.lockFile,
      JSON.stringify({
        harness_pid: process.pid,
        engine_pid: live.pid,
        started_at: new Date().toISOString(),
      }),
    );
    await assert.rejects(runCut(s.opts), EngineBusyError);
    assert.ok(alive(live.pid), 'the live engine is left alone');
    assert.ok(existsSync(s.lockFile), 'the holder keeps its lock');
    assert.equal(s.invocations(), 0);
  } finally {
    killTree(live.pid);
  }
});

await test('two concurrent runs: the second is refused', async () => {
  const s = await setup({ FAKE_ENGINE_SLEEP_MS: '800' });
  const first = runCut(s.opts);
  await new Promise((r) => setTimeout(r, 300));
  await assert.rejects(runCut(s.opts), EngineBusyError);
  cutOf(await first);
});

await test('a stale lock (engine pid gone) is taken over', async () => {
  const s = await setup();
  writeFileSync(
    s.lockFile,
    JSON.stringify({
      harness_pid: process.pid,
      engine_pid: await deadPid(),
      started_at: new Date().toISOString(),
    }),
  );
  cutOf(await runCut(s.opts));
  assert.ok(!existsSync(s.lockFile));
});

await test('a live engine of a dead harness is stopped, then the run starts', async () => {
  const s = await setup();
  const orphan = sleeper();
  try {
    writeFileSync(
      s.lockFile,
      JSON.stringify({
        harness_pid: await deadPid(),
        engine_pid: orphan.pid,
        started_at: new Date().toISOString(),
      }),
    );
    cutOf(await runCut(s.opts));
    assert.ok(!alive(orphan.pid), 'the orphan engine tree was stopped');
  } finally {
    killTree(orphan.pid);
  }
});

const real = 'C:\\Users\\XZNON\\cutroom-v2\\var\\runs\\import-check';
await test(
  'the parser matches the real output of the import check',
  { skip: !existsSync(real) },
  async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'cutroom-real-'));
    await mkdir(path.join(dir, 'reel-v1'));
    for (const f of ['reel-summary.json', 'reel-cost.txt', 'engine-1.log'])
      await copyFile(path.join(real, f), path.join(dir, f));
    for (const f of ['timeline.json', 'audio.json'])
      await copyFile(path.join(real, 'reel-v1', f), path.join(dir, 'reel-v1', f));
    const r = await parseOutputs(dir, 1, path.join(dir, 'engine-1.log'));
    assert.equal(r.filmS, 44.439);
    assert.equal(r.wallS, 379);
    assert.equal(r.voiceModelId, 'heygen/heygen-voice-1-turbo:free');
    assert.equal(r.minimaxCalls, 28);
    assert.deepEqual(r.tokens, { input: 148981, cached: 110773, output: 26056 });
    assert.equal(r.totalUsd, 0.0826);
    assert.deepEqual(r.cost['plan'], { usd: 0.0074, tokens_in: 15598, tokens_out: 2252 });
    assert.deepEqual(r.cost['sprite sheet'], { usd: 0.0206, tokens_in: 40863, tokens_out: 6580 });
    assert.deepEqual(r.cost['shots'], { usd: 0.0375, tokens_in: 71938, tokens_out: 8730 });
    assert.deepEqual(Object.keys(r.cost), [
      'plan',
      'kit',
      'assets',
      'sprite sheet',
      'shots',
      'voice',
      'music',
    ]);
    assert.equal(r.shots.length, 7);
    assert.equal(r.audio.pitchStSd, 4.66);
    assert.equal(r.audio.voiceOverMusicDb, 11.5);
    assert.equal(r.audio.musicFitPass, true);
    assert.deepEqual(
      r.failingSteps.map((f) => f.step),
      ['shot4', 'shot5'],
    );
    assert.equal(r.rejections.length, 7);
    await rm(dir, { recursive: true });
  },
);
