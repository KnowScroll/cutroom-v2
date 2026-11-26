import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  appendEvent,
  appendIndex,
  createJob,
  readEvents,
  readJob,
  readRunRecord,
  renderReport,
  RunRecord,
  setJobStage,
  setJobStatus,
  writeReport,
  writeRunRecord,
} from '../src/record.ts';

async function withVar(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'cutroom-record-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const at = new Date('2026-11-27T10:20:30Z');

function sampleRun(id: string): RunRecord {
  const scores = (n: number) => ({ hook: n, clarity: n, visual: n, pacing: n, audio: n, fit: n });
  const gates = (voicePass: boolean) => [
    { name: 'format', value: '1080x1920', threshold: '1080x1920', pass: true, mode: 'block' },
    {
      name: 'voice_pitch',
      value: voicePass ? 4.6 : 2.9,
      threshold: 4,
      pass: voicePass,
      mode: 'block',
    },
    { name: 'same_view', value: 16, threshold: 14, pass: false, mode: 'info' },
  ];
  const cost = {
    script: { usd: 0.12, tokens_in: 9000, tokens_out: 2000 },
    voice: { usd: 0.3, tokens_in: 0, tokens_out: 0 },
  };
  return RunRecord.parse({
    id,
    request: { request: 'A reel about why the sky is blue', seconds: 45 },
    intake: {
      template: 'explainer',
      fit: 'none',
      reason: 'no template is about science explainers',
      audience: 'curious adults',
      goal: 'explain Rayleigh scattering',
      tone: 'warm',
      seconds: 45,
    },
    git_commit: 'abc1234',
    sync_conflicts: ['explainer: working copy edited and original changed'],
    cuts: [
      {
        n: 1,
        dir: 'reel-v1',
        template: 'explainer',
        template_sha: 'sha-a',
        voice_model: 'kokoro',
        film_s: 44.2,
        wall_s: 410,
        engine_cost: cost,
        gates: gates(false),
        review: {
          approve: false,
          summary: 'Hook is slow; ending does not hold.',
          scores: scores(3),
          notes: { shots: { '3': 'caption covers the subject' } },
        },
        notes_applied: null,
        patch_applied: null,
        engine_rejections: ['shot 2 rejected: text clipped'],
        credits: '',
      },
      {
        n: 2,
        dir: 'reel-v2',
        template: 'explainer',
        template_sha: 'sha-a',
        voice_model: 'heygen',
        film_s: 45.1,
        wall_s: 150,
        engine_cost: cost,
        gates: gates(true),
        review: { approve: true, summary: 'Clear and well paced.', scores: scores(4), notes: {} },
        notes_applied: { shots: { '3': 'caption covers the subject' } },
        patch_applied: null,
        engine_rejections: [],
        credits: 'Music: Kevin MacLeod, CC BY 4.0. Put this line in the post description.',
      },
    ],
    voice_switches: [{ cut: 2, from: 'kokoro', to: 'heygen', reason: 'voice_pitch FAIL (2.9 st)' }],
    harness_calls: [
      { step: 'intake', tokens_in: 1200, tokens_out: 300, usd: 0.0007 },
      { step: 'review-1', tokens_in: 20000, tokens_out: 900, usd: 0.0071 },
    ],
    selected: { cut: 2, why: 'fewest blocking FAILs (0), then highest score sum (24)' },
    status: 'done',
    error: null,
    approved: true,
    totals: { usd: 0.85, wall_s: 560, cuts: 2, harness_calls: 2 },
    started: '2026-11-27T10:20:30.000Z',
    finished: '2026-11-27T10:29:50.000Z',
  });
}

await test('job moves queued -> running -> done and rejects invalid moves', async () => {
  await withVar(async (dir) => {
    const job = await createJob(dir, { request: 'Hello World!', seconds: 30 }, at);
    assert.equal(job.id, '20261127-102030-hello-world');
    assert.equal(job.status, 'queued');
    await assert.rejects(setJobStatus(dir, job.id, 'done'), /cannot move from queued to done/);
    await assert.rejects(setJobStage(dir, job.id, 'intake'), /only change while running/);
    await setJobStatus(dir, job.id, 'running', { stage: 'sync' });
    await setJobStage(dir, job.id, 'cut-1');
    assert.equal((await readJob(dir, job.id)).stage, 'cut-1');
    await assert.rejects(setJobStatus(dir, job.id, 'queued'), /cannot move/);
    await assert.rejects(setJobStatus(dir, job.id, 'failed'), /needs an error/);
    const done = await setJobStatus(dir, job.id, 'done');
    assert.equal(done.status, 'done');
    assert.notEqual(done.finished, null);
    await assert.rejects(setJobStatus(dir, job.id, 'running'), /cannot move from done/);
    assert.deepEqual(await readJob(dir, job.id), done);
  });
});

await test('a failed job keeps its error', async () => {
  await withVar(async (dir) => {
    const job = await createJob(dir, { request: 'x' }, at);
    await setJobStatus(dir, job.id, 'running');
    const failed = await setJobStatus(dir, job.id, 'failed', { error: 'engine crashed twice' });
    assert.equal(failed.error, 'engine crashed twice');
    assert.equal((await readJob(dir, job.id)).status, 'failed');
  });
});

await test('two jobs in the same second with the same slug get distinct folders', async () => {
  await withVar(async (dir) => {
    const jobs = await Promise.all(
      [1, 2, 3, 4, 5].map(() => createJob(dir, { request: 'Same request' }, at)),
    );
    const ids = new Set(jobs.map((j) => j.id));
    assert.equal(ids.size, 5);
    assert.ok(ids.has('20261127-102030-same-request'));
    assert.ok(ids.has('20261127-102030-same-request-2'));
    for (const j of jobs) assert.equal((await readJob(dir, j.id)).id, j.id);
  });
});

await test('events keep their order', async () => {
  await withVar(async (dir) => {
    const job = await createJob(dir, { request: 'events' }, at);
    for (let i = 0; i < 20; i++) {
      const t = new Date(at.getTime() + i * 1000);
      await appendEvent(dir, job.id, 'engine', `step-${String(i)}`, { i }, t);
    }
    const events = await readEvents(dir, job.id);
    assert.deepEqual(
      events.map((e) => e.event),
      Array.from({ length: 20 }, (_, i) => `step-${String(i)}`),
    );
    assert.deepEqual(events[3], {
      t: '2026-11-27T10:20:33.000Z',
      stage: 'engine',
      event: 'step-3',
      data: { i: 3 },
    });
  });
});

await test('run.json round-trips through its schema and a bad record is rejected', async () => {
  await withVar(async (dir) => {
    const job = await createJob(dir, { request: 'sky' }, at);
    const run = sampleRun(job.id);
    await writeRunRecord(dir, run);
    assert.deepEqual(await readRunRecord(dir, job.id), run);
    await assert.rejects(writeRunRecord(dir, { ...run, git_commit: 7 } as unknown as RunRecord)); // deliberately invalid
  });
});

await test('report.md shows the cut, why, scores, gates, flags and costs', async () => {
  await withVar(async (dir) => {
    const job = await createJob(dir, { request: 'sky' }, at);
    const run = sampleRun(job.id);
    await writeRunRecord(dir, run);
    const text = await writeReport(dir, run);
    assert.equal(await readFile(join(dir, 'runs', job.id, 'report.md'), 'utf8'), text);
    assert.equal(renderReport(run), text);
    assert.match(text, /Cut 2 of 2 \(approved\)/);
    assert.match(text, /Why: fewest blocking FAILs/);
    assert.match(text, /hook 4, clarity 4/);
    assert.match(text, /FAIL same_view \[info\]/);
    assert.match(text, /PASS voice_pitch \[block\]/);
    assert.match(text, /fit: none \(no template/);
    assert.match(text, /sync conflict: explainer/);
    assert.match(text, /Total \$0\.85 \(engine \$0\.84, harness \$0\.01\)/);
    assert.match(text, /kokoro -> heygen/);
    assert.match(text, /## Credits\n\nMusic: Kevin MacLeod, CC BY 4.0/);
    assert.match(text, /2 cut\(s\), 2 harness call\(s\), git abc1234/);
    console.log(`\n--- sample report.md ---\n${text}\n--- end ---`);
  });
});

await test('a failed job report shows the error with zero cuts', async () => {
  await withVar(async (dir) => {
    const job = await createJob(dir, { request: 'doomed' }, at);
    const run: RunRecord = {
      ...sampleRun(job.id),
      intake: null,
      sync_conflicts: [],
      cuts: [],
      voice_switches: [],
      harness_calls: [],
      selected: null,
      status: 'failed',
      error: 'no voice left: heygen HTTP 402, kokoro HTTP 500',
      approved: false,
      totals: { usd: 0, wall_s: 12, cuts: 0, harness_calls: 0 },
    };
    await writeRunRecord(dir, run);
    assert.deepEqual(await readRunRecord(dir, job.id), run);
    const text = renderReport(run);
    assert.match(text, /- job failed: no voice left: heygen HTTP 402, kokoro HTTP 500/);
    assert.match(text, /## Still wrong\n\n- job failed: no voice left/);
    assert.doesNotMatch(text, /Nothing recorded/);
  });
});

await test('index.jsonl gets exactly one line per finished job', async () => {
  await withVar(async (dir) => {
    const a = await createJob(dir, { request: 'a' }, at);
    const b = await createJob(dir, { request: 'b' }, at);
    assert.equal(await appendIndex(dir, sampleRun(a.id)), true);
    assert.equal(await appendIndex(dir, sampleRun(a.id)), false);
    assert.equal(await appendIndex(dir, sampleRun(b.id)), true);
    const lines = (await readFile(join(dir, 'runs', 'index.jsonl'), 'utf8')).trim().split('\n');
    assert.equal(lines.length, 2);
    assert.deepEqual(JSON.parse(lines[0] ?? ''), {
      id: a.id,
      date: '2026-11-27T10:29:50.000Z',
      template: 'explainer',
      sha: 'sha-a',
      fit: 'none',
      cuts: 2,
      selected: 2,
      approved: true,
      blocking_fails: 0,
      cost_usd: 0.85,
      wall_s: 560,
    });
  });
});
