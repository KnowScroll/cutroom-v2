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
  } = {},
): Step => {
  const approve = o.approve ?? false;
  return reply({
    approve,
    summary: approve ? 'Ready.' : 'Shot 2 is cramped.',
    scores: o.scores ?? SCORES,
    notes: o.notes ?? (approve ? {} : NOTES),
    ...(o.patch === undefined ? {} : { template_patch: o.patch }),
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
  opts: { varDir?: string; originals?: string } = {},
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
  assert.match(gateValue(by('shipped_failing')?.value ?? null), /shot4/);
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
