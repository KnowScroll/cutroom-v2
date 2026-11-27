import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { appendFile, mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { z } from 'zod';
import { parseConfig } from '../src/config.ts';
import { runJob } from '../src/job.ts';
import { LoopState, readLoop, writeLoop } from '../src/loop.ts';
import { createM3 } from '../src/minimax.ts';
import { drain, enqueue, listJobs, startWorker, type WorkerOptions } from '../src/queue.ts';
import {
  readEvents,
  readJob,
  readRunRecord,
  runDir,
  type ReviewScores,
  type TemplatePatch,
} from '../src/record.ts';
import { HistoryEntry } from '../src/templates.ts';
import { startFakeMiniMax, type Step } from './fixtures/fake-minimax.ts';

const root = await mkdtemp(path.join(tmpdir(), 'cutroom-queue-'));
process.on('exit', () => {
  rmSync(root, { recursive: true, force: true });
});
const fakeEngine = path.join(import.meta.dirname, 'fixtures', 'fake-engine.mjs');
const workerScript = path.join(import.meta.dirname, 'fixtures', 'worker.ts');
const originalsDir = path.join(root, 'templates');
await mkdir(originalsDir);
await writeFile(path.join(originalsDir, '_base.md'), '# base\n\n## story\nBASE STORY\n');
await writeFile(
  path.join(originalsDir, 'alpha.md'),
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
const SCORES: ReviewScores = { hook: 4, clarity: 4, visual: 3, pacing: 4, audio: 4, fit: 4 };
const NOTES = { shots: { '2': 'Give the small circle room.' } };
const review = (approve: boolean, extra: Record<string, unknown> = {}): Step =>
  reply({
    approve,
    summary: approve ? 'Ready.' : 'Shot 2 is cramped.',
    scores: SCORES,
    notes: approve ? {} : NOTES,
    ...extra,
  });
const LOOK_PATCH: TemplatePatch = {
  section: 'look',
  op: 'append',
  text: 'Keep every label inside the frame.',
  reason: 'labels clip on any topic',
};
const failing: Step = { kind: 'http', status: 400, body: '{"error":"bad request"}' };

let counter = 0;
const newVar = (): string => path.join(root, `var${String(++counter)}`);
function optionsFor(varDir: string, endpoint: string, engineEnv = {}): WorkerOptions {
  return {
    config: parseConfig({
      MINIMAX_API_KEY: 'test-key',
      CUTROOM_VAR: varDir,
      CUTROOM_ENGINE: fakeEngine,
      CUTROOM_VOICE_MODELS: 'heygen,minimax',
    }),
    m3: createM3({ apiKey: 'test-key', endpoint, retryWaitsMs: [] }),
    originalsDir,
    engineEnv,
  };
}
async function withFake<T>(script: Step[], body: (url: string) => Promise<T>): Promise<T> {
  const fake = await startFakeMiniMax(script);
  try {
    return await body(fake.url);
  } finally {
    await fake.close();
  }
}

const Invocation = z.object({ argv: z.array(z.string()), present: z.array(z.string()) });
async function invocations(varDir: string, id: string) {
  const text = await readFile(
    path.join(runDir(varDir, id), 'reel-work', 'invocations.log'),
    'utf8',
  );
  return text
    .trim()
    .split('\n')
    .map((l) => Invocation.parse(JSON.parse(l)));
}
const earlierUsd = (cut: { engine_cost: Record<string, { usd: number }> } | undefined): number =>
  Object.entries(cut?.engine_cost ?? {}).find(([k]) => k === 'earlier attempts')?.[1].usd ?? 0;
const cutOf = (argv: readonly string[]): number => {
  const i = argv.indexOf('--cut');
  return i === -1 ? 1 : Number(argv[i + 1]);
};
const countOf = (all: { argv: string[] }[], cut: number): number =>
  all.filter((i) => cutOf(i.argv) === cut).length;

await test('FIFO, one at a time, a failed job is skipped, files and folders without job.json are ignored', async () => {
  const varDir = newVar();
  const ids: string[] = [];
  for (const request of ['first reel', 'second reel', 'third reel']) {
    ids.push(await enqueue(varDir, { request }));
    await new Promise((r) => setTimeout(r, 5));
  }
  // not jobs: the index file and a folder with no job.json
  const old = {
    id: 'older-job',
    date: '2026-01-01T00:00:00.000Z',
    template: null,
    sha: null,
    fit: null,
    cuts: 1,
    selected: null,
    approved: false,
    blocking_fails: null,
    cost_usd: 0,
    wall_s: 0,
  };
  await appendFile(path.join(varDir, 'runs', 'index.jsonl'), `${JSON.stringify(old)}\n`);
  await mkdir(path.join(varDir, 'runs', 'stray-folder'));
  assert.deepEqual(
    (await listJobs(varDir)).map((j) => [j.id, j.status]),
    ids.map((id) => [id, 'queued']),
  );

  // intake + review for the first job, a failing intake for the second, the third as the first
  const ran = await withFake([intake, review(true), failing, intake, review(true)], async (url) => {
    let maxRunning = 0;
    const timer = setInterval(() => {
      void listJobs(varDir).then((jobs) => {
        maxRunning = Math.max(maxRunning, jobs.filter((j) => j.status === 'running').length);
      });
    }, 5);
    try {
      return {
        ids: await drain(optionsFor(varDir, url, { FAKE_ENGINE_SLEEP_MS: '150' })),
        maxRunning,
      };
    } finally {
      clearInterval(timer);
    }
  });
  assert.deepEqual(ran.ids, ids);
  assert.equal(ran.maxRunning, 1);
  const [a, b, c] = await Promise.all(ids.map((id) => readJob(varDir, id)));
  assert.ok(a && b && c);
  assert.deepEqual([a.status, b.status, c.status], ['done', 'failed', 'done']);
  assert.match(b.error ?? '', /400|bad request/i);
  // one at a time: each job finished before the next started
  assert.ok((a.finished ?? '') <= (b.started ?? ''), 'second started after first finished');
  assert.ok((b.finished ?? '') <= (c.started ?? ''), 'third started after second finished');
  assert.equal((await readRunRecord(varDir, c.id)).approved, true);
  assert.deepEqual(await drain(optionsFor(varDir, 'http://127.0.0.1:9')), []);
});

await test('the worker takes jobs as they are enqueued and stops when asked', async () => {
  const varDir = newVar();
  await withFake([intake, review(true)], async (url) => {
    const worker = startWorker(optionsFor(varDir, url), 20);
    try {
      const id = await enqueue(varDir, { request: 'a late reel' });
      worker.wake();
      for (let i = 0; i < 400 && (await readJob(varDir, id)).status !== 'done'; i++) {
        await new Promise((r) => setTimeout(r, 25));
      }
      assert.equal((await readJob(varDir, id)).status, 'done');
    } finally {
      await worker.stop();
    }
  });
});

/** A pid that is not running: a worker that died. */
const deadPid = (): number => {
  const r = spawnSync(process.execPath, ['-e', '']);
  assert.ok(r.pid > 0);
  return r.pid;
};

/** Runs a job to its end in `varDir`. */
async function finished(varDir: string, script: Step[]): Promise<string> {
  const id = await enqueue(varDir, { request: 'how big is the Sun' });
  await withFake(script, async (url) => {
    const o = optionsFor(varDir, url);
    await runJob({ ...o, request: { request: 'how big is the Sun' }, jobId: id });
  });
  return id;
}

/** Sets a finished job's folder back to what a worker killed at some point leaves (its owner pid is dead). */
async function rewind(
  varDir: string,
  id: string,
  cut: (state: LoopState) => LoopState,
  owner = deadPid(),
): Promise<void> {
  const dir = runDir(varDir, id);
  const state = await readLoop(dir);
  assert.ok(state);
  await writeLoop(dir, cut(state));
  const job = await readJob(varDir, id);
  await writeFile(
    path.join(dir, 'job.json'),
    JSON.stringify({
      ...job,
      status: 'running',
      finished: null,
      error: null,
      owner: { pid: owner },
    }),
  );
}

async function interrupted(
  varDir: string,
  script: Step[],
  cut: (state: LoopState) => LoopState,
): Promise<string> {
  const id = await finished(varDir, script);
  await rewind(varDir, id, cut);
  return id;
}

/** What the worker held when it died inside the round: cut 1 reviewed, the round not yet saved. */
const insideRound = (s: LoopState): LoopState => ({
  ...s,
  cuts: s.cuts.slice(0, 1),
  rounds: [],
  made: null,
  notes_rounds: [],
  harness_calls: s.harness_calls.slice(0, 2),
});

await test('a running job with a live owner is left alone; with a dead owner it is resumed', async () => {
  const varDir = newVar();
  const id = await finished(varDir, [intake, review(true)]);
  // another live process (a `make` run) owns it
  const other = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], {
    windowsHide: true,
    stdio: 'ignore',
  });
  try {
    if (other.pid === undefined) throw new Error('owner did not start');
    await rewind(varDir, id, (s) => s, other.pid);
    const queued = await enqueue(varDir, { request: 'another reel' });
    const ran = await withFake([intake, review(true)], (url) => drain(optionsFor(varDir, url)));
    assert.deepEqual(ran, [queued]);
    assert.equal((await readJob(varDir, id)).status, 'running');
    assert.equal((await readJob(varDir, id)).owner?.pid, other.pid);
  } finally {
    other.kill();
  }
  await rewind(varDir, id, (s) => s);
  assert.deepEqual(await withFake([review(true)], (url) => drain(optionsFor(varDir, url))), [id]);
  assert.equal((await readJob(varDir, id)).status, 'done');
});

await test('a job whose owner pid is this process but was not claimed here is resumed (pid reuse)', async () => {
  const varDir = newVar();
  const id = await finished(varDir, [intake, review(true)]);
  await rewind(varDir, id, (s) => s, process.pid);
  assert.deepEqual(await withFake([review(true)], (url) => drain(optionsFor(varDir, url))), [id]);
  assert.equal((await readJob(varDir, id)).status, 'done');
});

await test('an engine lock naming this pid under a foreign token is stale; its live orphan engine is stopped', async () => {
  const varDir = newVar();
  const id = await enqueue(varDir, { request: 'how big is the Sun' });
  const orphan = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], {
    detached: process.platform !== 'win32',
    windowsHide: true,
    stdio: 'ignore',
  });
  if (orphan.pid === undefined) throw new Error('orphan did not start');
  const gone = new Promise<void>((resolve) => {
    orphan.on('exit', () => {
      resolve();
    });
  });
  await writeFile(
    path.join(varDir, 'engine.lock'),
    JSON.stringify({
      harness_pid: process.pid,
      engine_pid: orphan.pid,
      started_at: new Date().toISOString(),
      token: 'old',
    }),
  );
  const ran = await withFake([intake, review(true)], (url) =>
    drain({ ...optionsFor(varDir, url), lockPollMs: 50 }),
  );
  assert.deepEqual(ran, [id]);
  assert.equal((await readJob(varDir, id)).status, 'done');
  assert.equal((await readEvents(varDir, id)).filter((e) => e.event === 'engine.wait').length, 0);
  await gone; // the orphan engine's tree was stopped
});

await test('two dead jobs that applied a patch resume one after the other without applying it again', async () => {
  const varDir = newVar();
  const script = [intake, review(false, { template_patch: [LOOK_PATCH] }), review(true)];
  const a = await finished(varDir, script);
  const b = await finished(varDir, script);
  await rewind(varDir, a, insideRound);
  await rewind(varDir, b, insideRound);
  const working = path.join(varDir, 'templates');
  const before = await readFile(path.join(working, 'alpha.md'), 'utf8');
  assert.equal(before.split('Keep every label inside the frame.').length - 1, 2);
  const ran = await withFake([review(true), review(true)], (url) => drain(optionsFor(varDir, url)));
  assert.deepEqual(ran, [a, b]);
  assert.equal(await readFile(path.join(working, 'alpha.md'), 'utf8'), before);
  assert.deepEqual((await readdir(path.join(working, 'history', 'alpha'))).sort(), [
    '1.json',
    '1.md',
    '2.json',
    '2.md',
  ]);
  assert.equal((await readRunRecord(varDir, a)).rounds[0]?.patch?.k, 1);
  assert.equal((await readRunRecord(varDir, b)).rounds[0]?.patch?.k, 2);
});

await test('a restart after a patch was applied but before the checkpoints were deleted completes the round', async () => {
  const varDir = newVar();
  const id = await interrupted(
    varDir,
    [intake, review(false, { template_patch: [LOOK_PATCH] }), review(true)],
    // what the worker held when it died inside the round: cut 1 reviewed, the round not yet saved
    (s) => ({
      ...s,
      cuts: s.cuts.slice(0, 1),
      rounds: [],
      made: null,
      notes_rounds: [],
      harness_calls: s.harness_calls.slice(0, 2),
    }),
  );
  const dir = runDir(varDir, id);
  const working = path.join(varDir, 'templates');
  const history = path.join(working, 'history', 'alpha');
  assert.deepEqual((await readdir(history)).sort(), ['1.json', '1.md']);
  const patched = await readFile(path.join(working, 'alpha.md'), 'utf8');
  // the checkpoints the patch should have deleted are still there (stale)
  await writeFile(path.join(dir, 'reel-work', 'kit.js'), '// STALE');
  const later = await enqueue(varDir, { request: 'a reel after the restart' });

  const ran = await withFake([review(true), intake, review(true)], (url) =>
    drain(optionsFor(varDir, url)),
  );
  // the running job first, then the queued one
  assert.deepEqual(ran, [id, later]);
  assert.equal((await readJob(varDir, id)).status, 'done');
  const run = await readRunRecord(varDir, id);
  assert.equal(run.cuts.length, 2);
  assert.equal(run.rounds.length, 1);
  const round = run.rounds[0];
  assert.ok(round);
  assert.equal(round.kind, 'template');
  assert.equal(round.patch?.k, 1);
  assert.ok(round.patch.deleted.includes('kit.js'));
  assert.deepEqual(
    run.harness_calls.map((c) => c.step),
    ['intake', 'review-1', 'review-2'],
  );
  // the patch was not applied twice
  assert.deepEqual((await readdir(history)).sort(), ['1.json', '1.md']);
  assert.equal(await readFile(path.join(working, 'alpha.md'), 'utf8'), patched);
  assert.equal(patched.split('Keep every label inside the frame.').length - 1, 1);
  const entry = HistoryEntry.parse(
    JSON.parse(await readFile(path.join(history, '1.json'), 'utf8')),
  );
  assert.equal(entry.next?.cut, 2);
  // the engine reran cut 2 from checkpoints without the stale kit
  const inv = await invocations(varDir, id);
  assert.equal(countOf(inv, 1), 1);
  assert.equal(countOf(inv, 2), 2);
  assert.ok(!inv.at(-1)?.present.includes('kit.js'));
  assert.equal(await readFile(path.join(dir, 'reel-work', 'kit.js'), 'utf8'), '// kit (cut 2)');
  assert.equal((await readJob(varDir, later)).status, 'done');
});

await test('a restart after the engine finished a cut but before its review reviews it without the engine', async () => {
  const varDir = newVar();
  const id = await interrupted(varDir, [intake, review(true)], (s) => ({
    ...s,
    cuts: s.cuts.map((c) => ({ ...c, gates: [], review: null })),
    harness_calls: s.harness_calls.slice(0, 1),
  }));
  const ran = await withFake([review(true)], (url) => drain(optionsFor(varDir, url)));
  assert.deepEqual(ran, [id]);
  const run = await readRunRecord(varDir, id);
  assert.equal(run.status, 'done');
  assert.equal(run.approved, true);
  // the basic gates and the frame gates (#13) both ran on resume
  assert.equal(run.cuts[0]?.gates.length, 12);
  assert.equal(countOf(await invocations(varDir, id), 1), 1);
});

function killHard(pid: number): void {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    process.kill(-pid, 'SIGKILL'); // the worker leads its own group (spawned detached)
  }
}

function startWorkerProcess(
  varDir: string,
  endpoint: string,
  env: Record<string, string>,
): { pid: number; exit: Promise<number | null>; output: () => string } {
  const child = spawn(
    process.execPath,
    [
      workerScript,
      JSON.stringify({
        varDir,
        engine: fakeEngine,
        voices: 'heygen,minimax',
        endpoint,
        originals: originalsDir,
        env,
      }),
    ],
    {
      detached: process.platform !== 'win32',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let out = '';
  child.stdout.on('data', (d: Buffer) => (out += d.toString()));
  child.stderr.on('data', (d: Buffer) => (out += d.toString()));
  if (child.pid === undefined) throw new Error('worker did not start');
  return {
    pid: child.pid,
    exit: new Promise((resolve) =>
      child.on('exit', (code) => {
        resolve(code);
      }),
    ),
    output: () => out,
  };
}

await test('a worker process killed mid-job resumes after the restart without redoing finished cuts', async () => {
  const varDir = newVar();
  const id = await enqueue(varDir, { request: 'how big is the Sun' });
  const fake = await startFakeMiniMax([intake, review(false), review(true)]);
  try {
    // slow engine: cut 1 finishes, review asks for notes, and the worker dies inside cut 2
    const first = startWorkerProcess(varDir, fake.url, { FAKE_ENGINE_SLEEP_MS: '2500' });
    const logFile = path.join(runDir(varDir, id), 'reel-work', 'invocations.log');
    const callsFile = path.join(runDir(varDir, id), 'reel-work', 'calls.json');
    let seen = false;
    for (let i = 0; i < 600 && !seen; i++) {
      await new Promise((r) => setTimeout(r, 50));
      seen =
        existsSync(logFile) &&
        existsSync(callsFile) &&
        (await readFile(logFile, 'utf8')).includes('"--cut","2"');
    }
    assert.ok(seen, `cut 2 never started: ${first.output()}`);
    killHard(first.pid);
    await first.exit;
    assert.equal((await readJob(varDir, id)).status, 'running');
    assert.equal((await readLoop(runDir(varDir, id)))?.cuts.length, 1);
    assert.equal(fake.requests.length, 2); // intake and the review of cut 1

    const second = startWorkerProcess(varDir, fake.url, {});
    assert.equal(await second.exit, 0, second.output());
    assert.deepEqual(JSON.parse(second.output().trim()), [id]);

    const job = await readJob(varDir, id);
    assert.equal(job.status, 'done');
    const run = await readRunRecord(varDir, id);
    assert.equal(run.cuts.length, 2);
    assert.equal(run.approved, true);
    assert.equal(run.rounds.length, 1);
    assert.deepEqual(run.cuts[1]?.notes_applied?.shots, NOTES.shots);
    assert.deepEqual(
      run.harness_calls.map((c) => c.step),
      ['intake', 'review-1', 'review-2'],
    );
    assert.equal(fake.requests.length, 3); // no second intake, no second review of cut 1
    const inv = await invocations(varDir, id);
    assert.equal(countOf(inv, 1), 1, 'the finished cut is not redone');
    assert.equal(countOf(inv, 2), 2, 'the killed cut resumes once');
    assert.equal(inv.length, 3);
    // the killed invocation's model calls are priced into the cut, not lost
    assert.ok(earlierUsd(run.cuts[1]) > 0);
    assert.equal(earlierUsd(run.cuts[0]), 0);
    const notesRuns = inv.filter((i) => cutOf(i.argv) === 2 && i.argv.includes('--apply-notes'));
    assert.equal(notesRuns.length, 2);
    // the lock was released
    assert.ok(!existsSync(path.join(varDir, 'engine.lock')));
  } finally {
    await fake.close();
  }
});

await test('a worker killed in the fallback cut after a voice refusal keeps the refusal and the switch', async () => {
  const varDir = newVar();
  const id = await enqueue(varDir, { request: 'how big is the Sun' });
  const fake = await startFakeMiniMax([intake, review(true)]);
  try {
    const first = startWorkerProcess(varDir, fake.url, {
      FAKE_ENGINE_REFUSE: 'heygen',
      FAKE_ENGINE_SLEEP_MS: '2500',
    });
    const dir = runDir(varDir, id);
    const logFile = path.join(dir, 'reel-work', 'invocations.log');
    const callsFile = path.join(dir, 'reel-work', 'calls.json');
    let seen = false;
    for (let i = 0; i < 600 && !seen; i++) {
      await new Promise((r) => setTimeout(r, 50));
      seen =
        existsSync(logFile) &&
        existsSync(callsFile) &&
        (await readFile(logFile, 'utf8')).includes('"--voice-model","minimax"');
    }
    assert.ok(seen);
    killHard(first.pid);
    await first.exit;
    assert.equal((await readLoop(dir))?.voice_switches.length, 1);

    const second = startWorkerProcess(varDir, fake.url, {});
    assert.equal(await second.exit, 0, second.output());
    const run = await readRunRecord(varDir, id);
    assert.equal(run.status, 'done');
    assert.equal(run.voice_switches.length, 1);
    const [sw] = run.voice_switches;
    assert.ok(sw);
    assert.equal(sw.from, 'heygen');
    assert.equal(sw.to, 'minimax');
    assert.match(sw.reason, /HTTP 402/);
    assert.match(run.cuts[0]?.voice_model ?? '', /^minimax/);
    assert.ok(earlierUsd(run.cuts[0]) > 0);
  } finally {
    await fake.close();
  }
});

await test('a busy engine lock makes the job wait, not fail, and it finishes when the holder is gone', async () => {
  const varDir = newVar();
  const id = await enqueue(varDir, { request: 'how big is the Sun' });
  // another harness (a live process of ours) holds engine.lock for about 2 s
  const holder = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 2000)'], {
    windowsHide: true,
    stdio: 'ignore',
  });
  if (holder.pid === undefined) throw new Error('holder did not start');
  await writeFile(
    path.join(varDir, 'engine.lock'),
    JSON.stringify({
      harness_pid: holder.pid,
      engine_pid: null,
      started_at: new Date().toISOString(),
      token: 'holder',
    }),
  );
  const gone = new Promise<void>((resolve) => {
    holder.on('exit', () => {
      resolve();
    });
  });
  const t0 = Date.now();
  const ran = await withFake([intake, review(true)], async (url) => {
    const worker = drain({ ...optionsFor(varDir, url), lockPollMs: 100 });
    await new Promise((r) => setTimeout(r, 700));
    const mid = await readJob(varDir, id);
    assert.equal(mid.status, 'running');
    assert.equal(mid.error, null);
    return worker;
  });
  await gone;
  assert.ok(Date.now() - t0 >= 1500, 'it waited for the holder');
  assert.deepEqual(ran, [id]);
  assert.equal((await readJob(varDir, id)).status, 'done');
  const waits = (await readEvents(varDir, id)).filter((e) => e.event === 'engine.wait');
  assert.equal(waits.length, 1);
  assert.deepEqual(waits[0]?.data, { cut: 1, holder_pid: holder.pid });
});
