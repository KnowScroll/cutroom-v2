import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { z } from 'zod';
import {
  EngineBusyError,
  EngineCrashError,
  killTree,
  parseLog,
  parseOutputs,
  runCut,
  type CutResult,
  type RunCutOptions,
  type VoiceRefused,
} from '../src/engine.ts';

const fakeEngine = path.join(import.meta.dirname, 'fixtures', 'fake-engine.mjs');
const tempRoots: string[] = [];
process.on('exit', () => {
  for (const d of tempRoots) rmSync(d, { recursive: true, force: true });
});

interface Setup {
  opts: RunCutOptions;
  varDir: string;
  lockFile: string;
  invocations: () => number;
}

async function setup(env: Record<string, string> = {}): Promise<Setup> {
  const root = await mkdtemp(path.join(tmpdir(), 'cutroom-engine-'));
  tempRoots.push(root);
  const varDir = path.join(root, 'var');
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
  assert.equal(r.failingSteps[0]?.step, 'shot2');
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

await test('a wall clock stepped back during an engine run leaves the time spent the time it ran (#38)', async (t) => {
  const s = await setup({ FAKE_ENGINE_REFUSE: 'heygen' });
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  // WSL steps its wall clock back 2-4 s in the first minute after a boot; here it goes back 1 s every millisecond
  const stepBack = setInterval(() => {
    t.mock.timers.setTime(Date.now() - 1000);
  }, 1);
  const p0 = performance.now();
  let r: CutResult | VoiceRefused;
  try {
    r = await runCut(s.opts);
  } finally {
    clearInterval(stepBack);
  }
  const ran = (performance.now() - p0) / 1000;
  if (r.kind !== 'voice_refused') throw new Error('expected a voice refusal');
  assert.ok(r.spent.wallS > 0 && r.spent.wallS <= ran, String(r.spent.wallS));
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
        harness_pid: live.pid, // another live process; our own pid under a foreign token is stale
        engine_pid: live.pid,
        started_at: new Date().toISOString(),
      }),
    );
    await assert.rejects(runCut(s.opts), EngineBusyError);
    assert.ok(alive(live.pid), 'the live engine is left alone');
    assert.ok(existsSync(s.lockFile), 'the holder keeps its lock');
    assert.equal(s.invocations(), 0);
  } finally {
    await killTree(live.pid);
  }
});

await test('two concurrent runs: the second is refused', async () => {
  const s = await setup({ FAKE_ENGINE_SLEEP_MS: '800' });
  const first = runCut(s.opts);
  await new Promise((r) => setTimeout(r, 300));
  await assert.rejects(runCut(s.opts), EngineBusyError);
  cutOf(await first);
});

await test('a stale lock (harness and engine both gone) is taken over', async () => {
  const s = await setup();
  writeFileSync(
    s.lockFile,
    JSON.stringify({
      harness_pid: await deadPid(),
      engine_pid: await deadPid(),
      started_at: new Date().toISOString(),
    }),
  );
  cutOf(await runCut(s.opts));
  assert.ok(!existsSync(s.lockFile));
});

await test('a live harness holds the lock even when its engine pid is dead', async () => {
  const s = await setup();
  const holder = sleeper(); // another live process: a harness of its own
  try {
    writeFileSync(
      s.lockFile,
      JSON.stringify({
        harness_pid: holder.pid,
        engine_pid: await deadPid(),
        started_at: new Date().toISOString(),
      }),
    );
    await assert.rejects(runCut(s.opts), EngineBusyError);
  } finally {
    await killTree(holder.pid);
  }
});

await test('a second run during the crash-to-rerun gap is refused', async () => {
  const s = await setup({ FAKE_ENGINE_CRASH: 'once', FAKE_ENGINE_SLEEP_MS: '1200' });
  const first = runCut(s.opts);
  while (s.invocations() < 2) await new Promise((r) => setTimeout(r, 10));
  for (let i = 0; i < 20; i++) {
    await assert.rejects(runCut(s.opts), EngineBusyError);
    await new Promise((r) => setTimeout(r, 20));
  }
  cutOf(await first);
  assert.equal(s.invocations(), 2);
});

await test(
  'SIGTERM to the harness stops the engine once: no rerun, no live engine, no lock',
  { skip: process.platform === 'win32' },
  async () => {
    const s = await setup();
    const chromeFile = path.join(s.varDir, 'chrome.pid');
    const opts = { ...s.opts, env: { FAKE_ENGINE_CHROME: chromeFile } };
    const harness = spawn(
      process.execPath,
      [path.join(import.meta.dirname, 'fixtures', 'run-cut.ts'), JSON.stringify(opts)],
      { stdio: 'ignore' },
    );
    const exited = new Promise<number | null>((r) => harness.once('close', r));
    for (let i = 0; i < 200 && !existsSync(chromeFile); i++)
      await new Promise((r) => setTimeout(r, 50));
    assert.ok(existsSync(chromeFile), 'engine started');
    const chromePid = Number(readFileSync(chromeFile, 'utf8'));
    const logFile = path.join(opts.runDir, 'reel-work', 'invocations.log');
    const first: unknown = JSON.parse(readFileSync(logFile, 'utf8').split('\n')[0] ?? '');
    const enginePid = z.object({ pid: z.number() }).parse(first).pid;
    try {
      assert.ok(harness.kill('SIGTERM'));
      assert.equal(await exited, 143);
      await new Promise((r) => setTimeout(r, 300));
      assert.equal(s.invocations(), 1, 'the engine was not rerun');
      assert.ok(!alive(enginePid), 'engine stopped');
      assert.ok(!alive(chromePid), 'chrome stopped');
      assert.ok(!existsSync(s.lockFile), 'lock released');
    } finally {
      await killTree(enginePid);
      if (alive(chromePid)) process.kill(chromePid, 'SIGKILL');
    }
  },
);

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
    await killTree(orphan.pid);
  }
});

const real = path.join(
  process.env['CUTROOM_VAR'] ?? path.join(import.meta.dirname, '..', 'var'),
  'runs',
  'import-check',
);
await test(
  'the parser matches the real output of the import check',
  { skip: !existsSync(real) },
  async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'cutroom-real-'));
    tempRoots.push(dir);
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
  },
);

await test('two runs racing for an orphaned lock: only one runs', async () => {
  const s = await setup({ FAKE_ENGINE_SLEEP_MS: '1500' });
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
    const results = await Promise.allSettled([runCut(s.opts), runCut(s.opts)]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const busy = results.filter(
      (r) => r.status === 'rejected' && r.reason instanceof EngineBusyError,
    );
    assert.equal(ok.length, 1);
    assert.equal(busy.length, 1);
    assert.equal(s.invocations(), 1);
    assert.ok(!alive(orphan.pid));
  } finally {
    await killTree(orphan.pid);
  }
});

await test('an unreadable lock is never deleted', async () => {
  const s = await setup();
  writeFileSync(s.lockFile, '{"harness_pid": ');
  await assert.rejects(runCut(s.opts), EngineBusyError);
  assert.equal(readFileSync(s.lockFile, 'utf8'), '{"harness_pid": ');
});

await test('the lock carries an owner token and its owner releases it', async () => {
  const s = await setup({ FAKE_ENGINE_SLEEP_MS: '600' });
  const run = runCut(s.opts);
  await new Promise((r) => setTimeout(r, 300));
  assert.match(readFileSync(s.lockFile, 'utf8'), /"token"/);
  await run;
  assert.ok(!existsSync(s.lockFile));
});

await test('stopping an orphan engine also stops the Chrome it started in its own group', async () => {
  const s = await setup();
  const chromeFile = path.join(s.varDir, 'chrome.pid');
  const brief = path.join(s.varDir, 'brief.txt');
  writeFileSync(brief, 'x');
  const engine = spawn(
    process.execPath,
    [fakeEngine, '--brief-file', brief, '--out', path.join(s.varDir, 'o', 'reel')],
    {
      env: { ...process.env, FAKE_ENGINE_CHROME: chromeFile },
      stdio: 'ignore',
      detached: process.platform !== 'win32',
      windowsHide: true,
    },
  );
  const enginePid = engine.pid;
  assert.ok(enginePid !== undefined);
  let chromePid = 0;
  try {
    for (let i = 0; i < 100 && !existsSync(chromeFile); i++)
      await new Promise((r) => setTimeout(r, 50));
    chromePid = Number(readFileSync(chromeFile, 'utf8'));
    assert.ok(alive(chromePid));
    writeFileSync(
      s.lockFile,
      JSON.stringify({
        harness_pid: await deadPid(),
        engine_pid: enginePid,
        started_at: new Date().toISOString(),
      }),
    );
    cutOf(await runCut(s.opts));
    assert.ok(!alive(enginePid), 'engine stopped');
    assert.ok(!alive(chromePid), 'chrome stopped');
  } finally {
    await killTree(enginePid);
    if (chromePid > 0 && alive(chromePid)) process.kill(chromePid, 'SIGKILL');
  }
});

await test('a null measured pitch does not fail a finished cut', async () => {
  const s = await setup({ FAKE_ENGINE_NULL_PITCH: '1' });
  const r = cutOf(await runCut(s.opts));
  assert.equal(r.audio.pitchStSd, null);
  assert.equal(r.audio.mixPass, true);
});

await test('every rejection log format of the engine is matched', () => {
  const log = [
    '[ 1.0s] facts rejected: fact f14: "calc" uses 12742',
    '[ 2.0s] script-revise rejected: shot 1 opens with a definition',
    '[ 3.0s] plan rejected: bad shot count',
    '[ 4.0s] poses rejected: unknown pose',
    '[ 5.0s] shot3 attempt 2: rejected: after kit.bg you paint a solid rectangle',
    '[ 6.0s] shot3 craft pass rejected (some error), one repair try',
    '[ 7.0s] shot3 craft pass: improvement rejected (some error), keeping first version',
    '[ 8.0s] shot3 attempt 1: valid',
    '[ 9.0s] shot3 craft pass: KEEP',
  ].join('\n');
  assert.equal(parseLog(log).rejections.length, 7);
});

await test(
  'rejection lines of both real import-check logs are found',
  { skip: !existsSync(real) },
  async () => {
    const until = parseLog(await readFile(path.join(real, 'until-script.log'), 'utf8'));
    assert.equal(until.rejections.length, 13);
    const engine = parseLog(await readFile(path.join(real, 'engine-1.log'), 'utf8'));
    assert.equal(engine.rejections.length, 7);
  },
);
