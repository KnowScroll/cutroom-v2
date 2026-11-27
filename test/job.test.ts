import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { z } from 'zod';
import { parseConfig } from '../src/config.ts';
import { runCut } from '../src/engine.ts';
import { basicGates } from '../src/gates/basic.ts';
import { MAX_FIX_ROUNDS, runJob } from '../src/job.ts';
import { createM3 } from '../src/minimax.ts';
import {
  IndexLine,
  gateValue,
  readEvents,
  readJob,
  readRunRecord,
  runDir,
  type ReviewNotes,
  type ReviewScores,
  type RunRecord,
  type TemplatePatch,
} from '../src/record.ts';
import { HistoryEntry, readManifest } from '../src/templates.ts';
import { startFakeMiniMax, type Step } from './fixtures/fake-minimax.ts';

const root = await mkdtemp(path.join(tmpdir(), 'cutroom-job-'));
process.on('exit', () => {
  rmSync(root, { recursive: true, force: true });
});
const fakeEngine = path.join(import.meta.dirname, 'fixtures', 'fake-engine.mjs');
const ALPHA = '# alpha\n\n## about\nALPHA ABOUT\n\n## look\nALPHA LOOK\n';
const originalsDir = path.join(root, 'templates');
await mkdir(originalsDir);
await writeFile(path.join(originalsDir, '_base.md'), '# base\n\n## story\nBASE STORY\n');
await writeFile(path.join(originalsDir, 'alpha.md'), ALPHA);

const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const usage = { input_tokens: 1000, output_tokens: 100 };
const reply = (o: unknown): Step => ({ kind: 'stream', chunks: [JSON.stringify(o)], usage });
const intake = reply({
  template: 'alpha',
  fit: 'good',
  reason: 'fits',
  subject: 'the Sun, a star',
  subject_kind: 'data',
  covers: 'ALPHA ABOUT',
  excludes: '',
  audience: 'curious adults',
  goal: 'show the size',
  tone: 'wondering',
  seconds: 45,
});
const SCORES: ReviewScores = { hook: 4, clarity: 4, visual: 3, pacing: 4, audio: 4, fit: 4 };
const NOTES: ReviewNotes = { shots: { '2': 'Give the small circle room.' } };
const answer = (
  o: {
    approve?: boolean;
    scores?: ReviewScores;
    notes?: ReviewNotes;
    patch?: TemplatePatch[];
    facts?: string[];
    wrongTemplate?: string;
  } = {},
): Step => {
  const approve = o.approve ?? false;
  return reply({
    approve,
    summary: approve ? 'Ready.' : 'Shot 2 is cramped.',
    scores: o.scores ?? SCORES,
    notes: o.notes ?? (approve ? {} : NOTES),
    ...(o.patch === undefined ? {} : { template_patch: o.patch }),
    ...(o.facts === undefined ? {} : { fact_errors: o.facts }),
    ...(o.wrongTemplate === undefined ? {} : { wrong_template: o.wrongTemplate }),
  });
};
const review = (approve: boolean): Step => answer({ approve });
const sum = (n: number): ReviewScores => {
  // six scores summing to n (6-30)
  const base = Math.floor(n / 6);
  const extra = n - base * 6;
  const s = [0, 1, 2, 3, 4, 5].map((i) => base + (i < extra ? 1 : 0));
  return {
    hook: s[0] ?? 1,
    clarity: s[1] ?? 1,
    visual: s[2] ?? 1,
    pacing: s[3] ?? 1,
    audio: s[4] ?? 1,
    fit: s[5] ?? 1,
  };
};
const LOOK_PATCH: TemplatePatch = {
  section: 'look',
  op: 'append',
  text: 'Keep every label inside the frame.',
  reason: 'labels clip on any topic',
};

let counter = 0;
interface Ran {
  run: RunRecord;
  varDir: string;
  dir: string;
}
async function job(
  script: Step[],
  engineEnv: Record<string, string> = {},
  voices = 'heygen,minimax',
  opts: { varDir?: string; originals?: string; log?: (line: string) => void } = {},
): Promise<Ran> {
  const varDir = opts.varDir ?? path.join(root, `var${String(++counter)}`);
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
      originalsDir: opts.originals ?? originalsDir,
      engineEnv,
      ...(opts.log === undefined ? {} : { log: opts.log }),
    });
    return { run, varDir, dir: runDir(varDir, run.id) };
  } finally {
    await fake.close();
  }
}

const Invocation = z.object({
  argv: z.array(z.string()),
  env: z.string().optional(),
  present: z.array(z.string()),
  notes: z.string().nullable(),
});
async function invocations(dir: string): Promise<z.infer<typeof Invocation>[]> {
  const text = await readFile(path.join(dir, 'reel-work', 'invocations.log'), 'utf8');
  return text
    .trim()
    .split('\n')
    .map((l) => Invocation.parse(JSON.parse(l)));
}
const argOf = (argv: readonly string[], name: string) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const usdOf = (run: RunRecord) => run.harness_calls.reduce((a, c) => a + c.usd, 0);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

await test('approve on cut 1 gives 1 cut: job.json done, run.json, report.md, brief.txt, ordered events, an index line', async () => {
  const { run, varDir, dir } = await job([intake, review(true)]);
  assert.equal((await readJob(varDir, run.id)).status, 'done');
  assert.equal((await readJob(varDir, run.id)).error, null);
  const saved = await readRunRecord(varDir, run.id);
  assert.equal(saved.status, 'done');
  assert.equal(saved.approved, true);
  assert.equal(saved.cuts.length, 1);
  assert.deepEqual(saved.rounds, []);
  assert.match(saved.loop_end, /cut 1 approved/);
  assert.deepEqual(saved.selected?.cut, 1);
  assert.equal(saved.intake?.template, 'alpha');
  assert.match(saved.git_commit, /^[0-9a-f]{40}$/);
  assert.deepEqual(saved.sync_conflicts, []);
  const cut = saved.cuts[0];
  assert.ok(cut);
  // the working copy the engine read, which the first sync copied from the original
  const working = path.join(varDir, 'templates');
  assert.equal(cut.template_sha, sha(await readFile(path.join(working, 'alpha.md'))));
  const [inv] = await invocations(dir);
  assert.equal(inv?.env, working);
  assert.match(cut.voice_model, /^heygen \(fake\/heygen\)$/);
  assert.equal(cut.film_s, 1);
  assert.equal(cut.engine_cost['plan']?.usd, 0.001);
  assert.match(cut.credits, /Voice: synthetic/);
  assert.ok(cut.engine_rejections.some((r) => r.includes('kit attempt 1')));
  // the 5 basic gates, then the 7 frame gates, all block for a template without gate lines
  assert.deepEqual(
    cut.gates.map((g) => g.name),
    [
      ...['format', 'shipped_failing', 'voice_pitch', 'music_fit', 'voice_over_music'],
      ...['same_view', 'frame0', 'blank', 'balance', 'flat', 'static_band', 'alive'],
    ],
  );
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
  assert.ok(near(saved.totals.usd, 0.01 + usdOf(saved)));

  assert.match(
    await readFile(path.join(dir, 'brief.txt'), 'utf8'),
    /^how big is the Sun\n\nAudience: curious adults/,
  );
  assert.match(await readFile(path.join(dir, 'report.md'), 'utf8'), /Cut 1 of 1 \(approved\)/);
  assert.ok(existsSync(path.join(dir, 'review-1.json')));
  assert.ok(existsSync(path.join(dir, 'engine-1.log')));
  // the successful invocation's calls are set aside, so a later invocation never counts them again
  assert.ok(existsSync(path.join(dir, 'calls-1.json')));
  assert.ok(!existsSync(path.join(dir, 'reel-work', 'calls.json')));

  const names = (await readEvents(varDir, run.id)).map((e) => e.event);
  assert.deepEqual(names, [
    'job.start',
    'sync.copied',
    'sync.copied',
    'intake.done',
    'gates.setup',
    'engine.start',
    'engine.end',
    'gates.done',
    'review.done',
    'loop.end',
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
  assert.match(gateValue(by('shipped_failing')?.value ?? null), /shot2/);
  assert.equal(by('music_fit')?.pass, true);
  assert.equal(by('voice_over_music')?.pass, true);
  assert.equal(by('format')?.pass, true);
  assert.equal(run.approved, false);
  assert.equal(run.status, 'done');
});

await test('never approving gives 4 cuts and the best by fewest FAILs, then score sum, then the later cut', async () => {
  // cut 1: 1 blocking FAIL and the top score; cuts 2 and 3: no FAIL and 24 each; cut 4: no FAIL and 20
  const { run, dir } = await job(
    [
      intake,
      answer({ scores: sum(30) }),
      answer({ scores: sum(24) }),
      answer({ scores: sum(24) }),
      answer({ scores: sum(20) }),
    ],
    { FAKE_ENGINE_FAILING_SHOT: '1' },
  );
  assert.equal(run.status, 'done');
  assert.equal(run.cuts.length, MAX_FIX_ROUNDS + 1);
  assert.deepEqual(
    run.cuts.map((c) => c.gates.filter((g) => g.mode === 'block' && !g.pass).length),
    [1, 0, 0, 0],
  );
  assert.equal(run.selected?.cut, 3);
  assert.match(run.selected.why, /best of 4 cut\(s\)/);
  assert.equal(run.approved, false);
  assert.match(
    run.loop_end,
    /fix rounds are used up; the fixes of cut 4 are recorded, not applied/,
  );
  assert.deepEqual(
    run.rounds.map((r) => [r.n, r.cut, r.kind]),
    [
      [1, 2, 'notes'],
      [2, 3, 'notes'],
      [3, 4, 'notes'],
    ],
  );
  assert.deepEqual(
    run.harness_calls.map((c) => c.step),
    ['intake', 'review-1', 'review-2', 'review-3', 'review-4'],
  );
  // every cut is reviewed; the last cut's notes are recorded but never written for a fifth cut
  assert.deepEqual(run.cuts[3]?.review?.notes, NOTES);
  assert.ok(!existsSync(path.join(dir, 'notes-5.json')));
  const inv = await invocations(dir);
  assert.equal(inv.length, 4);
  for (const n of [2, 3, 4]) {
    const argv = inv[n - 1]?.argv ?? [];
    assert.equal(argOf(argv, '--cut'), String(n));
    assert.equal(argOf(argv, '--apply-notes'), path.join(dir, `notes-${String(n)}.json`));
    assert.deepEqual(run.cuts[n - 1]?.notes_applied, { lines: {}, assets: {}, shots: NOTES.shots });
  }
  const report = await readFile(path.join(dir, 'report.md'), 'utf8');
  assert.match(report, /Cut 3 of 4 \(not approved\)/);
  assert.match(report, /## Fix rounds/);
  assert.match(report, /round 3 -> cut 4: notes/);
});

await test('approve with a blocking FAIL is re-asked and the loop continues', async () => {
  const { run, dir } = await job([intake, review(true), answer({ notes: NOTES }), review(true)], {
    FAKE_ENGINE_FAILING_SHOT: '1',
  });
  assert.deepEqual(
    run.harness_calls.map((c) => c.step),
    ['intake', 'review-1', 'review-1', 'review-2'],
  );
  assert.equal(run.cuts[0]?.review?.approve, false);
  assert.equal(run.rounds[0]?.kind, 'notes');
  assert.ok(existsSync(path.join(dir, 'notes-2.json')));
  assert.equal(run.cuts.length, 2);
  assert.equal(run.selected?.cut, 2);
  assert.equal(run.approved, true);
});

await test('a re-asked review that approves again with no fixes stops the loop', async () => {
  const { run, varDir, dir } = await job([intake, review(true)], { FAKE_ENGINE_FAILING_SHOT: '1' });
  assert.equal(run.status, 'done');
  assert.equal(run.cuts.length, 1);
  assert.equal(run.cuts[0]?.review?.approve, true);
  assert.equal(run.approved, false);
  assert.deepEqual(run.rounds, []);
  assert.match(
    run.loop_end,
    /no valid fix after cut 1 \(no patch, no notes\); the review was asked again/,
  );
  const line = IndexLine.parse(
    JSON.parse((await readFile(path.join(varDir, 'runs', 'index.jsonl'), 'utf8')).trim()),
  );
  assert.equal(line.approved, false);
  assert.equal(line.blocking_fails, 1);
  assert.match(await readFile(path.join(dir, 'report.md'), 'utf8'), /not approved/);
});

const FLAT_FAILS = ['frame0', 'blank', 'balance', 'flat', 'alive'];
const failing = (gates: readonly { name: string; pass: boolean; mode: string }[]) =>
  gates.filter((g) => !g.pass).map((g) => `${g.name} ${g.mode}`);

await test('a blocking frame FAIL prevents approval: the review is re-asked and the loop goes on', async () => {
  const { run } = await job([intake, review(true), answer({ notes: NOTES }), review(true)], {
    FAKE_ENGINE_FLAT_FRAMES: '1',
  });
  // cut 1 is one flat colour: its frame gates FAIL at cutroom's thresholds, all block
  assert.deepEqual(
    failing(run.cuts[0]?.gates ?? []),
    FLAT_FAILS.map((n) => `${n} block`),
  );
  assert.deepEqual(
    run.harness_calls.map((c) => c.step),
    ['intake', 'review-1', 'review-1', 'review-2'],
  );
  assert.equal(run.cuts[0]?.review?.approve, false);
  assert.equal(run.rounds[0]?.kind, 'notes');
  assert.deepEqual(failing(run.cuts[1]?.gates ?? []), []);
  assert.equal(run.selected?.cut, 2);
  assert.equal(run.approved, true);
});

await test('a blocking frame FAIL with an approving review is never approved', async () => {
  const { run, dir } = await job([intake, review(true)], { FAKE_ENGINE_FLAT_FRAMES: '1' });
  assert.equal(run.cuts.length, 1);
  assert.equal(run.cuts[0]?.review?.approve, true);
  assert.equal(run.approved, false);
  assert.match(run.selected?.why ?? '', /5 blocking gate FAIL\(s\), .*review approve overruled/);
  assert.match(await readFile(path.join(dir, 'report.md'), 'utf8'), /FAIL frame0 \[block\]/);
});

await test("a template's gate lines set the frame gates (off, info, threshold) and its captions the band", async () => {
  const originals = path.join(root, 'templates-gates');
  await mkdir(originals);
  await writeFile(path.join(originals, '_base.md'), '# base\n\n## story\nBASE STORY\n');
  const checks = [
    'captions: select',
    'gate blank: off',
    'gate flat: info',
    '- gate alive: info',
    'gate frame0: >= 0',
    'gate balance: lower half >= 0, centre 0-1',
  ];
  await writeFile(path.join(originals, 'alpha.md'), `${ALPHA}\n## checks\n${checks.join('\n')}\n`);
  const { run, varDir } = await job(
    [intake, review(true)],
    { FAKE_ENGINE_FLAT_FRAMES: '1' },
    'heygen',
    {
      originals,
    },
  );
  const gates = run.cuts[0]?.gates ?? [];
  const by = (n: string) => gates.find((g) => g.name === n);
  assert.equal(by('blank'), undefined);
  assert.deepEqual(failing(gates), ['flat info', 'alive info']);
  assert.deepEqual(by('frame0'), {
    name: 'frame0',
    value: 0,
    threshold: '>= 0',
    pass: true,
    mode: 'block',
  });
  assert.equal(by('balance')?.threshold, 'lower half >= 0, centre 0-1');
  assert.equal(by('same_view')?.mode, 'block');
  assert.equal(by('same_view')?.threshold, '<= 14 s');
  // only info gates FAIL, so the approve stands
  assert.equal(run.approved, true);
  const setup = (await readEvents(varDir, run.id)).find((e) => e.event === 'gates.setup');
  assert.deepEqual(setup?.data, {
    captions: 'select',
    band: { top: 300, bottom: 430 },
    settings: {
      blank: { mode: 'off' },
      flat: { mode: 'info' },
      alive: { mode: 'info' },
      frame0: { mode: 'block', limits: [0] },
      balance: { mode: 'block', limits: [0, 0, 1] },
    },
  });
});

await test('a bad gate line fails the job before the engine runs', async () => {
  const originals = path.join(root, 'templates-bad-gate');
  await mkdir(originals);
  await writeFile(path.join(originals, '_base.md'), '# base\n\n## story\nBASE STORY\n');
  await writeFile(path.join(originals, 'alpha.md'), `${ALPHA}\n## checks\ngate format: info\n`);
  const { run, dir } = await job([intake], {}, 'heygen', { originals });
  assert.equal(run.status, 'failed');
  assert.match(run.error ?? '', /"gate format: info": no frame gate "format"/);
  assert.equal(run.cuts.length, 0);
  assert.ok(!existsSync(path.join(dir, 'reel-work')));
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

await test('a notes round passes checked notes and records what the engine actually changed', async () => {
  const notes: ReviewNotes = {
    lines: { '1': [{ who: 'narrator', text: 'How huge is it?' }] },
    assets: { sun: 'Add a glowing rim.' },
    shots: { '1': 'Start wider.', '2': 'Give the small circle room.' },
  };
  // shot 2's redraw fails the engine's checks three times, so it keeps its old code
  const { run, dir } = await job([intake, answer({ notes }), review(true)], {
    FAKE_ENGINE_KEEP_CODE: '2',
  });
  const file = path.join(dir, 'notes-2.json');
  const raw = await readFile(file);
  assert.equal(raw[0], '{'.charCodeAt(0), 'UTF-8 without BOM');
  assert.deepEqual(JSON.parse(raw.toString('utf8')), notes);
  const r = run.rounds[0];
  assert.ok(r);
  assert.equal(r.kind, 'notes');
  assert.equal(r.notes_file, file);
  assert.deepEqual(r.changed, { lines: [1], shots: [1], assets: ['sun'] });
  assert.deepEqual(r.unchanged, { lines: [], shots: [2], assets: [] });
  assert.deepEqual(run.cuts[1]?.notes_applied, notes);
  const inv = await invocations(dir);
  assert.equal(inv[1]?.notes, raw.toString('utf8'));
  assert.match(await readFile(path.join(dir, 'report.md'), 'utf8'), /noted but unchanged: shot 2/);
});

await test('a note on an asset the work plan.json lacks is not passed on', async () => {
  const { run, varDir, dir } = await job(
    [
      intake,
      answer({ notes: { assets: { sun: 'Brighter.' }, shots: { '2': 'Wider.' } } }),
      review(true),
    ],
    { FAKE_ENGINE_WORK_ASSETS: 'moon' },
  );
  assert.deepEqual(JSON.parse(await readFile(path.join(dir, 'notes-2.json'), 'utf8')), {
    lines: {},
    assets: {},
    shots: { '2': 'Wider.' },
  });
  assert.deepEqual(run.rounds[0]?.ignored_notes, ['asset sun: not in the work plan.json']);
  assert.ok((await readEvents(varDir, run.id)).some((e) => e.event === 'notes.ignored'));
});

await test('a wall clock stepped back during a job leaves its wall time the time it ran (#38)', async (t) => {
  // WSL steps its wall clock back 2-4 s in the first minute after a boot; here it goes back a minute after review 1
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const p0 = performance.now();
  const { run, varDir } = await job([intake, review(true)], {}, 'heygen', {
    log: (line) => {
      if (line.startsWith('review 1:')) t.mock.timers.setTime(Date.now() - 60_000);
    },
  });
  const ran = (performance.now() - p0) / 1000;
  assert.equal(run.status, 'done', run.error ?? '');
  assert.ok(run.totals.wall_s > 0 && run.totals.wall_s <= ran, String(run.totals.wall_s));
  assert.equal((await readRunRecord(varDir, run.id)).totals.wall_s, run.totals.wall_s);
});

await test('a template round deletes the invalidated checkpoints and passes no notes', async () => {
  // round 1 notes, round 2 a template patch (dropping round 1's changes), cut 3 approved
  const { run, varDir, dir } = await job([
    intake,
    answer({ notes: NOTES }),
    answer({ notes: NOTES, patch: [LOOK_PATCH] }),
    review(true),
  ]);
  assert.equal(run.status, 'done');
  assert.deepEqual(
    run.rounds.map((r) => r.kind),
    ['notes', 'template'],
  );
  const r = run.rounds[1];
  assert.ok(r);
  assert.equal(r.patch?.k, 1);
  assert.equal(r.patch.from, 'plan.json');
  for (const f of [
    'plan.json',
    'kit.js',
    'asset_sun.js',
    'asset_sun.preview',
    'shot_1.js',
    'shot_2.js',
  ]) {
    assert.ok(r.patch.deleted.includes(f), f);
  }
  for (const f of ['facts.json', 'spine.json', 'script.json', 'music.json', 'reference.txt']) {
    assert.ok(!r.patch.deleted.includes(f), f);
  }
  assert.deepEqual(r.drops_rounds, [1]);
  assert.deepEqual(r.ignored_notes, ['shot 2: skipped by the template round']);
  assert.equal(r.notes_file, null);
  assert.ok(!existsSync(path.join(dir, 'notes-3.json')));

  // the engine's third invocation: cut 3, no notes, and the deleted checkpoints were gone when it started
  const inv = (await invocations(dir))[2];
  assert.ok(inv);
  assert.equal(argOf(inv.argv, '--cut'), '3');
  assert.ok(!inv.argv.includes('--apply-notes'));
  for (const f of ['plan.json', 'kit.js', 'asset_sun.js', 'shot_1.js', 'shot_2.js']) {
    assert.ok(!inv.present.includes(f), f);
  }
  for (const f of ['facts.json', 'spine.json', 'script.json', 'music.json', 'reference.txt']) {
    assert.ok(inv.present.includes(f), f);
  }

  // the working copy is patched and marked; the original is not touched
  const working = path.join(varDir, 'templates');
  const patched = await readFile(path.join(working, 'alpha.md'), 'utf8');
  assert.match(patched, /## look\nALPHA LOOK\n- Keep every label inside the frame\.\n/);
  assert.equal(await readFile(path.join(originalsDir, 'alpha.md'), 'utf8'), ALPHA);
  assert.equal((await readManifest(working))['alpha.md']?.patched, true);
  const [, cut2, cut3] = run.cuts;
  assert.ok(cut2 && cut3);
  assert.equal(cut3.template_sha, sha(patched));
  assert.notEqual(cut3.template_sha, cut2.template_sha);
  assert.deepEqual(cut3.patch_applied, [LOOK_PATCH]);
  assert.equal(cut3.notes_applied, null);

  // the history entry gets the next cut's gates and scores once that cut is reviewed
  const entry = HistoryEntry.parse(
    JSON.parse(await readFile(path.join(working, 'history', 'alpha', '1.json'), 'utf8')),
  );
  assert.equal(entry.job, run.id);
  assert.equal(entry.cut, 2);
  assert.equal(entry.round, 2);
  assert.equal(entry.next?.cut, 3);
  assert.deepEqual(entry.next.scores, SCORES);
  // cut 3 (approved) ranks better than cut 2, which asked for the patch: it stays
  assert.equal(r.patch.kept, true);
  assert.equal(entry.reverted, false);
  const names = (await readEvents(varDir, run.id)).map((e) => e.event);
  for (const e of ['patch.applied', 'patch.drops_notes', 'notes.skipped', 'patch.graded']) {
    assert.ok(names.includes(e), e);
  }
});

await test('an invalid patch is logged and the round uses the notes alone', async () => {
  const bad: TemplatePatch = { ...LOOK_PATCH, text: 'Draw the Sun twice as large.' };
  const { run, varDir, dir } = await job([intake, answer({ patch: [bad] }), review(true)]);
  const r = run.rounds[0];
  assert.ok(r);
  assert.equal(r.kind, 'notes');
  assert.equal(r.patch, null);
  assert.equal(r.rejected_patches.length, 1);
  assert.match(r.rejected_patches[0]?.reason ?? '', /content words of the request/);
  const argv = (await invocations(dir))[1]?.argv ?? [];
  assert.equal(argOf(argv, '--apply-notes'), path.join(dir, 'notes-2.json'));
  const working = path.join(varDir, 'templates');
  assert.equal(await readFile(path.join(working, 'alpha.md'), 'utf8'), ALPHA);
  assert.ok(!existsSync(path.join(working, 'history')));
  assert.ok((await readEvents(varDir, run.id)).some((e) => e.event === 'patch.rejected'));
  assert.equal(run.approved, true);
});

await test('an invalid patch and no notes is no valid fix: the loop stops', async () => {
  const bad: TemplatePatch = { ...LOOK_PATCH, section: 'checks' };
  const { run } = await job([intake, answer({ notes: {}, patch: [bad] })]);
  assert.equal(run.cuts.length, 1);
  assert.match(run.loop_end, /no valid fix after cut 1 \(1 patch\(es\) rejected, no notes\)/);
});

await test('a patch whose next cut is not better is reverted when the job ends; its later cuts keep it', async () => {
  // cut 1 (sum 24) asks for a look patch; cut 2, made with it, scores 20; a notes round makes cut 3 from cut 2's
  // checkpoints, which were built with the patch
  const { run, varDir, dir } = await job([
    intake,
    answer({ scores: sum(24), patch: [LOOK_PATCH] }),
    answer({ scores: sum(20) }),
    review(true),
  ]);
  assert.equal(run.cuts.length, 3);
  const r = run.rounds[0];
  assert.equal(r?.kind, 'template');
  assert.equal(r.patch?.kept, false);
  assert.equal(r.patch.reverted, true);
  assert.equal(run.rounds[1]?.kind, 'notes');
  // cut 3 was made with the patched text its checkpoints came from, and says so
  const [, cut2, cut3] = run.cuts;
  assert.notEqual(cut2?.template_sha, sha(ALPHA));
  assert.equal(cut3?.template_sha, cut2?.template_sha);
  const working = path.join(varDir, 'templates');
  assert.equal(await readFile(path.join(working, 'alpha.md'), 'utf8'), ALPHA);
  assert.deepEqual((await readManifest(working))['alpha.md'], {
    source_sha256: sha(ALPHA),
    working_sha256: sha(ALPHA),
    patched: false,
  });
  const entry = HistoryEntry.parse(
    JSON.parse(await readFile(path.join(working, 'history', 'alpha', '1.json'), 'utf8')),
  );
  assert.equal(entry.reverted, true);
  assert.equal(entry.next?.cut, 2);
  const events = await readEvents(varDir, run.id);
  const names = events.map((e) => e.event);
  assert.ok(
    names.indexOf('patch.reverted') > names.lastIndexOf('review.done'),
    'after the last cut',
  );
  const ev = events.find((e) => e.event === 'patch.reverted');
  assert.deepEqual(ev?.data, { k: 1, round: 1, why: 'cut 2 was not better than cut 1' });
  assert.match(
    await readFile(path.join(dir, 'report.md'), 'utf8'),
    /patch reverted: the next cut was not better/,
  );
});

await test('a patch whose next cut is never reviewed (the job fails) is reverted too', async () => {
  const { run, varDir, dir } = await job(
    [intake, answer({ scores: sum(24), patch: [LOOK_PATCH] })],
    { FAKE_ENGINE_CRASH: 'always', FAKE_ENGINE_CRASH_CUT: '2' },
  );
  assert.equal(run.status, 'failed');
  assert.equal(run.cuts.length, 1);
  assert.equal(run.rounds[0]?.patch?.kept, null);
  assert.equal(run.rounds[0].patch.reverted, true);
  assert.equal(await readFile(path.join(varDir, 'templates', 'alpha.md'), 'utf8'), ALPHA);
  assert.match(
    await readFile(path.join(dir, 'report.md'), 'utf8'),
    /patch reverted: the next cut was never reviewed/,
  );
});

await test('no patch for a template the intake rated "partial": a patch may not widen it', async () => {
  const partial = reply({
    template: 'alpha',
    fit: 'partial',
    reason: 'alpha can carry it with a compromise',
    subject: 'the Sun, a star',
    subject_kind: 'data',
    covers: 'ALPHA ABOUT',
    excludes: '',
    audience: 'curious adults',
    goal: 'show the size',
    tone: 'wondering',
    seconds: 45,
  });
  const { run, varDir } = await job([partial, answer({ patch: [LOOK_PATCH] }), review(true)]);
  const r = run.rounds[0];
  assert.equal(r?.kind, 'notes');
  assert.equal(r.patch, null);
  assert.match(
    r.rejected_patches[0]?.reason ?? '',
    /the intake fit is "partial": a patch may not widen what the template is for/,
  );
  assert.equal(await readFile(path.join(varDir, 'templates', 'alpha.md'), 'utf8'), ALPHA);
});

await test('a look patch with a story patch: the look patch alone is applied and the writer is not re-rolled', async () => {
  const story: TemplatePatch = {
    section: 'story',
    op: 'append',
    text: 'Name one number per shot.',
    reason: 'scripts crowd numbers on any topic',
  };
  const { run, dir } = await job([intake, answer({ patch: [story, LOOK_PATCH] }), review(true)]);
  const r = run.rounds[0];
  assert.equal(r?.kind, 'template');
  assert.equal(r.patch?.from, 'plan.json');
  assert.deepEqual(run.cuts[1]?.patch_applied, [LOOK_PATCH]);
  assert.deepEqual(
    r.rejected_patches.map((p) => [p.patch.section, p.reason]),
    [
      [
        'story',
        'a look/shots patch must not re-roll the writer: the story patch waits for a round of its own',
      ],
    ],
  );
  const present = (await invocations(dir))[1]?.present ?? [];
  for (const f of ['facts.json', 'spine.json', 'script.json']) assert.ok(present.includes(f), f);
});

await test('a cut with a fact error never beats a correct cut (the Venus cut 1 vs cut 4 shape)', async () => {
  // cut 1 is right (sum 17); cut 4 inverted the central fact but scored 18
  const { run, dir } = await job([
    intake,
    answer({ scores: sum(17) }),
    answer({ scores: sum(16) }),
    answer({
      scores: sum(16),
      facts: ['shot 1, 0-4 s: "a day shorter than its year"; true: longer'],
    }),
    answer({
      scores: sum(18),
      facts: ['shot 1, 0-4 s: "a day shorter than its year"; true: longer'],
    }),
  ]);
  assert.equal(run.cuts.length, 4);
  assert.deepEqual(
    run.cuts.map((c) => c.gates.filter((g) => g.mode === 'block' && !g.pass).length),
    [0, 0, 0, 0],
  );
  assert.equal(run.selected?.cut, 1);
  assert.match(run.selected.why, /0 fact error\(s\), 0 blocking gate FAIL\(s\), score sum 17/);
  const report = await readFile(path.join(dir, 'report.md'), 'utf8');
  assert.match(report, /\| 4 \| alpha \| [^|]+ \| 18 \| 0 \| 1 \| no \|/);
});

await test('an approve with a fact error is not approved', async () => {
  const facts = ['shot 2, 0.2 s: "a hundred Earths"; true: 109'];
  // the re-ask approves again, with the error still listed and no notes: no valid fix
  const { run } = await job([intake, answer({ approve: true, facts })]);
  assert.equal(run.cuts[0]?.review?.approve, true);
  assert.deepEqual(
    run.harness_calls.map((c) => c.step),
    ['intake', 'review-1', 'review-1'],
  );
  assert.equal(run.approved, false);
  assert.match(run.loop_end, /no valid fix after cut 1/);
});

await test('shipped_failing counts a failing shot carried forward unchanged (the Sun cuts 2-4 shape)', async () => {
  // shot 2 ships failing in cut 1; cut 2 notes another shot, cut 3's redraw of shot 2 fails and keeps its code
  const { run, dir } = await job(
    [
      intake,
      answer({ notes: { shots: { '1': 'Start wider.' } } }),
      answer({ notes: { shots: { '2': 'Give the small circle room.' } } }),
      answer({ notes: { shots: { '1': 'Start wider still.' } } }),
      answer(),
    ],
    { FAKE_ENGINE_FAILING_SHOT: '1', FAKE_ENGINE_KEEP_CODE: '2' },
  );
  assert.equal(run.cuts.length, 4);
  const shipped = run.cuts.map((c) => c.gates.find((g) => g.name === 'shipped_failing'));
  assert.deepEqual(
    shipped.map((g) => [g?.pass, g?.value]),
    [
      [false, 'shot2'],
      [false, 'shot2 (from cut 1)'],
      [false, 'shot2 (from cut 1)'],
      [false, 'shot2 (from cut 1)'],
    ],
  );
  assert.deepEqual(
    run.cuts.map((c) => c.shipped_failing.map((s) => `${s.step}@${String(s.cut)}`)),
    [['shot2@1'], ['shot2@1'], ['shot2@1'], ['shot2@1']],
  );
  // only cut 1's engine log names it
  assert.deepEqual(
    run.cuts.map((c) => c.engine_rejections.some((r) => r.startsWith('shipped failing:'))),
    [true, false, false, false],
  );
  assert.match(
    await readFile(path.join(dir, 'report.md'), 'utf8'),
    /- shipped failing: shot2: after kit\.bg you paint .* \(unchanged since cut 1\)/,
  );
});

await test('a wrong_template verdict re-runs intake once without that template, and the next cut starts over', async () => {
  const originals = path.join(root, 'templates-two');
  await mkdir(originals);
  await writeFile(path.join(originals, '_base.md'), '# base\n\n## story\nBASE STORY\n');
  await writeFile(path.join(originals, 'alpha.md'), ALPHA);
  await writeFile(
    path.join(originals, 'beta.md'),
    '# beta\n\n## about\nBETA ABOUT\n\n## look\nB\n',
  );
  const beta = reply({
    template: 'beta',
    fit: 'good',
    reason: 'beta draws it',
    subject: 'the Sun, a star',
    subject_kind: 'data',
    covers: 'BETA ABOUT',
    excludes: '',
    audience: 'curious teens',
    goal: 'see how big it is',
    tone: 'calm',
    seconds: 40,
  });
  const wrong = 'alpha draws only flat maps';
  const { run, varDir, dir } = await job(
    [
      intake,
      answer({ wrongTemplate: wrong, patch: [LOOK_PATCH] }),
      beta,
      answer({ wrongTemplate: 'beta is wrong too' }),
      review(true),
    ],
    {},
    'heygen',
    { originals },
  );
  assert.equal(run.status, 'done', run.error ?? '');
  assert.deepEqual(
    run.harness_calls.map((c) => c.step),
    ['intake', 'review-1', 'reintake', 'review-2', 'review-3'],
  );
  assert.deepEqual(
    run.rounds.map((r) => [r.kind, r.intake?.template ?? null]),
    [
      ['intake', 'beta'],
      ['notes', null],
    ],
  );
  assert.deepEqual(
    run.cuts.map((c) => c.template),
    ['alpha', 'beta', 'beta'],
  );
  assert.equal(run.intake?.template, 'alpha', 'run.json keeps the first intake');
  // the review's patch was for the template it found wrong
  assert.match(run.rounds[0]?.rejected_patches[0]?.reason ?? '', /found the template wrong/);
  assert.equal(await readFile(path.join(varDir, 'templates', 'alpha.md'), 'utf8'), ALPHA);
  assert.match(await readFile(path.join(dir, 'brief.txt'), 'utf8'), /Audience: curious teens/);

  const inv = await invocations(dir);
  assert.equal(argOf(inv[1]?.argv ?? [], '--template'), 'beta');
  assert.equal(argOf(inv[1]?.argv ?? [], '--seconds'), '40');
  assert.ok(!(inv[1]?.argv ?? []).includes('--apply-notes'));
  for (const f of ['facts.json', 'spine.json', 'plan.json', 'shot_1.js']) {
    assert.ok(!(inv[1]?.present ?? []).includes(f), f);
  }
  assert.ok(inv[1]?.present.includes('reference.txt'));

  const events = await readEvents(varDir, run.id);
  assert.ok(events.some((e) => e.event === 'intake.again'));
  assert.ok(events.some((e) => e.event === 'intake.not_again'));
  assert.equal(events.filter((e) => e.event === 'gates.setup').length, 2);
  const report = await readFile(path.join(dir, 'report.md'), 'utf8');
  assert.match(report, /- wrong template alpha \(review of cut 1\): alpha draws only flat maps/);
  assert.match(report, /round 1 -> cut 2: intake; intake again: template beta, fit good/);
  const line = IndexLine.parse(
    JSON.parse((await readFile(path.join(varDir, 'runs', 'index.jsonl'), 'utf8')).trim()),
  );
  assert.equal(line.template, 'beta');
});

await test('a voice_pitch FAIL switches the voice in the next round, and later cuts keep it', async () => {
  const { run, dir } = await job([intake, review(false), review(false), review(true)], {
    FAKE_ENGINE_LOW_PITCH: 'heygen',
  });
  assert.equal(run.cuts[0]?.gates.find((g) => g.name === 'voice_pitch')?.pass, false);
  const [round] = run.rounds;
  assert.ok(round);
  assert.equal(round.kind, 'notes');
  assert.deepEqual(round.voice, { from: 'heygen', to: 'minimax' });
  const argv = (await invocations(dir))[1]?.argv ?? [];
  assert.equal(argOf(argv, '--voice-model'), 'minimax');
  assert.ok(argv.includes('--apply-notes'));
  const [sw] = run.voice_switches;
  assert.equal(run.voice_switches.length, 1);
  assert.ok(sw);
  assert.equal(sw.cut, 2);
  assert.match(sw.reason, /voice_pitch FAIL on cut 1 \(3\.1 st/);
  assert.deepEqual(
    run.cuts.map((c) => c.voice_model.split(' ')[0]),
    ['heygen', 'minimax', 'minimax'],
  );
  assert.equal(run.rounds[1]?.voice, null);
  assert.equal(run.approved, true);
});

await test('a model left behind by a voice_pitch switch is not ruled out: a refused switch falls back to it', async () => {
  const { run, varDir } = await job([intake, review(false)], {
    FAKE_ENGINE_LOW_PITCH: 'heygen',
    FAKE_ENGINE_REFUSE: 'minimax',
  });
  assert.equal(run.status, 'done', run.error ?? '');
  assert.equal(run.error, null);
  assert.equal(run.cuts.length, MAX_FIX_ROUNDS + 1);
  assert.ok(run.cuts.every((c) => c.voice_model.startsWith('heygen ')));
  assert.deepEqual(
    run.voice_switches.map((s) => [s.cut, s.from, s.to]),
    [
      [2, 'heygen', 'minimax'],
      [2, 'minimax', 'heygen'],
    ],
  );
  assert.match(run.voice_switches[1]?.reason ?? '', /HTTP 402/);
  // minimax is ruled out and heygen tried: the later pitch FAILs have no model to switch to
  assert.deepEqual(
    run.rounds.map((r) => r.voice),
    [{ from: 'heygen', to: 'minimax' }, null, null],
  );
  assert.ok((await readEvents(varDir, run.id)).some((e) => e.event === 'voice.none_left'));
});

await test('a voice_pitch FAIL with no untried model and no other fix stops the loop', async () => {
  const { run } = await job([intake, review(true)], { FAKE_ENGINE_LOW_PITCH: 'heygen' }, 'heygen');
  assert.equal(run.status, 'done');
  assert.equal(run.cuts.length, 1);
  assert.deepEqual(run.rounds, []);
  assert.equal(run.approved, false);
  assert.match(run.loop_end, /no valid fix after cut 1 \(no patch, no notes\)/);
});

await test('a voice_pitch FAIL with no other fix still makes a voice round', async () => {
  // approve, re-asked, approve again with no notes: only the voice can change
  const { run, dir } = await job([intake, review(true)], { FAKE_ENGINE_LOW_PITCH: 'heygen' });
  assert.equal(run.rounds[0]?.kind, 'voice');
  const argv = (await invocations(dir))[1]?.argv ?? [];
  assert.equal(argOf(argv, '--voice-model'), 'minimax');
  assert.ok(!argv.includes('--apply-notes'));
  assert.equal(run.cuts.length, 2);
  assert.equal(run.approved, true);
});

await test('an engine that crashes twice gives a failed job with a report', async () => {
  const { run, varDir, dir } = await job([intake], { FAKE_ENGINE_CRASH: 'always' });
  assert.equal(run.status, 'failed');
  assert.match(run.error ?? '', /twice/);
  assert.equal(run.selected, null);
  assert.ok(near(run.totals.usd, 0.84 + usdOf(run)));
  assert.equal((await readJob(varDir, run.id)).status, 'failed');
  const report = await readFile(path.join(dir, 'report.md'), 'utf8');
  assert.match(report, /job failed: engine exited with code 1 twice/);
  assert.equal(
    (await readFile(path.join(varDir, 'runs', 'index.jsonl'), 'utf8')).trim().split('\n').length,
    1,
  );
  assert.ok((await readEvents(varDir, run.id)).some((e) => e.event === 'job.error'));
});

await test('an engine crash mid-loop gives a failed job whose report covers the cuts so far', async () => {
  const { run, varDir, dir } = await job([intake, review(false)], {
    FAKE_ENGINE_CRASH: 'always',
    FAKE_ENGINE_CRASH_CUT: '3',
  });
  assert.equal(run.status, 'failed');
  assert.match(run.error ?? '', /twice/);
  assert.equal((await readJob(varDir, run.id)).status, 'failed');
  assert.equal(run.cuts.length, 2);
  assert.equal(run.rounds.length, 2);
  assert.equal(run.selected?.cut, 2);
  assert.match(run.loop_end, /stopped by an error after 2 cut/);
  // two written cuts plus the two crashed invocations of cut 3 (0.42 each, from their calls.json)
  assert.ok(near(run.totals.usd, 0.01 + 0.01 + 0.84 + usdOf(run)));
  const report = await readFile(path.join(dir, 'report.md'), 'utf8');
  assert.match(report, /job failed: engine exited with code 1 twice/);
  assert.match(report, /^\| 1 \|/m);
  assert.match(report, /^\| 2 \|/m);
  assert.doesNotMatch(report, /^\| 3 \|/m);
  assert.equal((await readRunRecord(varDir, run.id)).cuts.length, 2);
});

await test("a cut that fails before its first model call does not re-count the last cut's calls", async () => {
  const { run, dir } = await job([intake, review(false)], {
    FAKE_ENGINE_CRASH: 'always',
    FAKE_ENGINE_CRASH_CUT: '2',
    FAKE_ENGINE_CRASH_EARLY: '1',
  });
  assert.equal(run.status, 'failed');
  assert.equal(run.cuts.length, 1);
  assert.ok(near(run.totals.usd, 0.01 + usdOf(run)), String(run.totals.usd));
  assert.ok(!(await invocations(dir))[1]?.present.includes('calls.json'));
  assert.ok(existsSync(path.join(dir, 'calls-1.json')));
  assert.ok(!existsSync(path.join(dir, 'calls-2-1.json')));
});

await test('a refused first voice falls back to the second', async () => {
  const { run, varDir, dir } = await job([intake, review(true)], { FAKE_ENGINE_REFUSE: 'heygen' });
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
  assert.ok(near(cut.engine_cost['earlier attempts']?.usd ?? 0, 0.42));
  assert.equal(cut.engine_cost['earlier attempts']?.tokens_in, 1_000_000);
  assert.ok(cut.wall_s > 2);
  assert.ok(near(run.totals.usd, 0.42 + 0.01 + usdOf(run)));
  assert.ok(existsSync(path.join(dir, 'calls-1-1.json')));
  assert.doesNotMatch(await readFile(path.join(dir, 'report.md'), 'utf8'), /engine rejection:/);
  const events = (await readEvents(varDir, run.id)).map((e) => e.event);
  const start = events.indexOf('engine.start');
  assert.deepEqual(events.slice(start, start + 4), [
    'engine.start',
    'voice.refused',
    'voice.switch',
    'engine.start',
  ]);
  assert.match(await readFile(path.join(dir, 'report.md'), 'utf8'), /heygen -> minimax/);
});

await test('every voice refused fails the job and lists each refusal', async () => {
  const { run } = await job([intake], { FAKE_ENGINE_REFUSE: 'heygen,minimax' });
  assert.equal(run.status, 'failed');
  assert.match(run.error ?? '', /heygen \(HTTP 402/);
  assert.match(run.error ?? '', /minimax \(HTTP 402/);
  assert.equal(run.voice_switches.length, 1);
});

await test('sync at job start: a conflict is logged in events, run.json and the report', async () => {
  const originals = path.join(root, 'templates-sync');
  await mkdir(originals);
  await writeFile(path.join(originals, '_base.md'), '# base\n\n## story\nBASE STORY\n');
  await writeFile(path.join(originals, 'alpha.md'), ALPHA);
  const varDir = path.join(root, 'var-sync');
  const first = await job([intake, review(true)], {}, 'heygen', { varDir, originals });
  assert.deepEqual(first.run.sync_conflicts, []);
  // both changed: the original by a developer, the working copy outside the harness
  await writeFile(path.join(originals, 'alpha.md'), `${ALPHA}\n## shots\n- New original.\n`);
  const working = path.join(varDir, 'templates', 'alpha.md');
  await writeFile(working, `${ALPHA}\n## shots\n- Edited copy.\n`);
  const second = await job([intake, review(true)], {}, 'heygen', { varDir, originals });
  assert.equal(second.run.sync_conflicts.length, 1);
  assert.match(second.run.sync_conflicts[0] ?? '', /^alpha\.md: original changed/);
  assert.match(await readFile(working, 'utf8'), /Edited copy/);
  assert.equal(second.run.cuts[0]?.template_sha, sha(await readFile(working)));
  assert.match(
    await readFile(path.join(second.dir, 'report.md'), 'utf8'),
    /sync conflict: alpha\.md/,
  );
  assert.ok((await readEvents(varDir, second.run.id)).some((e) => e.event === 'sync.conflict'));
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
      subject: 'the Sun, a star',
      subject_kind: 'data',
      covers: 'sizes, distances, numbers and life stories of things in space',
      excludes: '',
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
    // the CLI syncs the repo's originals into <var>/templates and the engine reads them there
    assert.ok(existsSync(path.join(varDir, 'templates', 'kurzgesagt.md')));
  } finally {
    await fake.close();
  }
});

await test('make without a request exits 2', () => {
  const r = spawnSync(process.execPath, ['src/cli.ts', 'make'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
});
