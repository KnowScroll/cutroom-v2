import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { Config, VoiceModelKey } from './config.ts';
import { EngineCrashError, runCut, type CutResult, type Spent } from './engine.ts';
import { basicGates } from './gates/basic.ts';
import { frameGates, frameSetup, measureFrames } from './gates/frames.ts';
import { runIntake } from './intake.ts';
import type { M3Request, M3Result } from './minimax.ts';
import {
  appendEvent,
  appendIndex,
  createJob,
  gateValue,
  runDir,
  setJobStage,
  setJobStatus,
  writeReport,
  writeRunRecord,
  type CutRecord,
  type FixRound,
  type HarnessCall,
  type Intake,
  type JobRequest,
  type NoteTargets,
  type Review,
  type ReviewNotes,
  type RunRecord,
  type TemplatePatch,
  type VoiceSwitch,
} from './record.ts';
import { reviewCut } from './review.ts';
import { applyPatches, invalidateCheckpoints, recordNextCut, syncTemplates } from './templates.ts';

const repoRoot = path.resolve(import.meta.dirname, '..');

/** D20: the first cut plus at most this many fix rounds (at most 4 cuts per job). */
export const MAX_FIX_ROUNDS = 3;

export interface JobOptions {
  config: Config;
  request: JobRequest;
  m3: (req: M3Request) => Promise<M3Result>;
  /** The template originals, synced into `<var>/templates` at job start (design §5.2). Default `<repo>/templates`. */
  originalsDir?: string;
  /** Extra environment for the engine process. */
  engineEnv?: Readonly<Record<string, string>>;
  /** One line per step for the person watching the CLI. */
  log?: (line: string) => void;
}

interface Refusal {
  model: VoiceModelKey;
  status: number;
  message: string;
}

function gitCommit(): string {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  return r.status === 0 ? r.stdout.trim() : 'unknown';
}

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function blockingFails(cut: CutRecord): number {
  return cut.gates.filter((g) => g.mode === 'block' && !g.pass).length;
}

/** Approved means the review approved and no blocking gate FAILs (design §6.5); a re-asked approve is not enough. */
function isApproved(cut: CutRecord): boolean {
  return cut.review?.approve === true && blockingFails(cut) === 0;
}

function scoreSum(cut: CutRecord): number | null {
  return cut.review === null ? null : Object.values(cut.review.scores).reduce((a, b) => a + b, 0);
}

/** Design §6.5: fewest blocking FAILs, then the highest score sum (an unreviewed cut has none), then the later cut. */
export function bestCut(cuts: readonly CutRecord[]): CutRecord | undefined {
  let best: CutRecord | undefined;
  for (const c of cuts) {
    if (best === undefined) {
      best = c;
      continue;
    }
    const fails = blockingFails(c) - blockingFails(best);
    const score = (scoreSum(c) ?? 0) - (scoreSum(best) ?? 0);
    if (fails < 0 || (fails === 0 && (score > 0 || (score === 0 && c.n > best.n)))) best = c;
  }
  return best;
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// The engine's work-folder plan.json (planJson in engine/asset_reel.mjs): the shots and assets the notes may name.
const WorkPlan = z.object({
  assets: z.array(z.object({ id: z.string() })),
  shots: z.array(z.object({ lines: z.array(z.unknown()) })),
});
type WorkPlan = z.infer<typeof WorkPlan>;

async function readWorkPlan(workDir: string): Promise<WorkPlan> {
  const file = path.join(workDir, 'plan.json');
  const parsed = WorkPlan.safeParse(JSON.parse(await readFile(file, 'utf8')));
  if (!parsed.success) throw new Error(`${file}: ${parsed.error.message}`);
  return parsed.data;
}

/**
 * Keeps the notes on a shot or asset the work plan.json has (the engine skips the others in silence) and drops empty
 * ones; returns what was dropped.
 */
function checkNotes(notes: ReviewNotes, plan: WorkPlan): { notes: ReviewNotes; ignored: string[] } {
  const ignored: string[] = [];
  const isShot = (k: string) => /^\d+$/.test(k) && Number(k) >= 1 && Number(k) <= plan.shots.length;
  const ids = plan.assets.map((a) => a.id);
  const keep = <T>(
    notesOf: Record<string, T> | undefined,
    what: string,
    known: (k: string) => boolean,
    empty: (v: T) => boolean,
  ): Record<string, T> => {
    const out: Record<string, T> = {};
    for (const [k, v] of Object.entries(notesOf ?? {})) {
      if (!known(k)) ignored.push(`${what} ${k}: not in the work plan.json`);
      else if (empty(v)) ignored.push(`${what} ${k}: empty note`);
      else out[k] = v;
    }
    return out;
  };
  return {
    notes: {
      lines: keep(notes.lines, 'lines of shot', isShot, (v) => v.length === 0),
      assets: keep(
        notes.assets,
        'asset',
        (k) => ids.includes(k),
        (v) => v.trim() === '',
      ),
      shots: keep(notes.shots, 'shot', isShot, (v) => v.trim() === ''),
    },
    ignored,
  };
}

function noteCount(notes: ReviewNotes): number {
  return (
    Object.keys(notes.lines ?? {}).length +
    Object.keys(notes.assets ?? {}).length +
    Object.keys(notes.shots ?? {}).length
  );
}

function noteList(notes: ReviewNotes): string[] {
  return [
    ...Object.keys(notes.lines ?? {}).map((k) => `lines of shot ${k}`),
    ...Object.keys(notes.assets ?? {}).map((k) => `asset ${k}`),
    ...Object.keys(notes.shots ?? {}).map((k) => `shot ${k}`),
  ];
}

/** The parts of the work folder a notes round can change: each shot's lines, and the code of each shot and asset. */
interface Snapshot {
  lines: string[];
  code: Map<string, string>;
}

async function snapshot(workDir: string): Promise<Snapshot> {
  const plan = await readWorkPlan(workDir);
  const code = new Map<string, string>();
  for (const name of (await readdir(workDir)).sort()) {
    if (/^(shot_\d+|asset_.+)\.js$/.test(name)) {
      code.set(name, sha256(await readFile(path.join(workDir, name))));
    }
  }
  return { lines: plan.shots.map((s) => JSON.stringify(s.lines)), code };
}

// A noted shot or asset whose redraw fails the engine's checks three times keeps its old code, and a line note
// naming no cast member is skipped: so what changed is read from the files, not assumed from the notes.
function compare(
  before: Snapshot,
  after: Snapshot,
  notes: ReviewNotes,
): { changed: NoteTargets; unchanged: NoteTargets } {
  const changed: NoteTargets = { lines: [], shots: [], assets: [] };
  after.lines.forEach((l, i) => {
    if (l !== before.lines[i]) changed.lines.push(i + 1);
  });
  for (const [name, sha] of after.code) {
    if (before.code.get(name) === sha) continue;
    const shot = /^shot_(\d+)\.js$/.exec(name)?.[1];
    if (shot !== undefined) changed.shots.push(Number(shot));
    else changed.assets.push(name.slice('asset_'.length, -'.js'.length));
  }
  changed.shots.sort((a, b) => a - b);
  return {
    changed,
    unchanged: {
      lines: Object.keys(notes.lines ?? {})
        .map(Number)
        .filter((k) => !changed.lines.includes(k)),
      shots: Object.keys(notes.shots ?? {})
        .map(Number)
        .filter((k) => !changed.shots.includes(k)),
      assets: Object.keys(notes.assets ?? {}).filter((id) => !changed.assets.includes(id)),
    },
  };
}

interface Round {
  record: FixRound;
  notes: ReviewNotes | null;
  patches: TemplatePatch[] | null;
  before: Snapshot | null;
}

interface RoundInput {
  n: number;
  job: string;
  request: string;
  kind: string;
  workingDir: string;
  runDir: string;
  workDir: string;
  cut: CutRecord;
  review: Review;
  voice: { from: string; to: string } | null;
  /** Notes rounds since the last template round: a template round's rerun drops their changes. */
  notesRounds: readonly number[];
  event: (stage: string, name: string, data: unknown) => Promise<void>;
}

/**
 * Round n after the review of cut n (design §6.1): a valid template patch makes a template round (patch, invalidate,
 * rerun with no notes); otherwise the notes make a notes round (notes-<n+1>.json for --apply-notes); a voice_pitch
 * switch alone makes a voice round. `none`: no valid fix (why), the loop stops.
 */
async function planRound(i: RoundInput): Promise<Round | { none: string }> {
  const record: FixRound = {
    n: i.n,
    cut: i.n + 1,
    kind: 'notes',
    notes_file: null,
    ignored_notes: [],
    patch: null,
    rejected_patches: [],
    drops_rounds: [],
    voice: i.voice,
    changed: null,
    unchanged: null,
  };
  const patches = i.review.template_patch ?? [];
  if (patches.length > 0) {
    const res = await applyPatches(i.workingDir, i.kind, patches, {
      job: i.job,
      cut: i.n,
      round: i.n,
      request: i.request,
      gates: i.cut.gates,
      scores: i.review.scores,
    });
    record.rejected_patches = res.rejected;
    for (const r of res.rejected) await i.event('round', 'patch.rejected', { round: i.n, ...r });
    if (res.k !== null) {
      const inv = await invalidateCheckpoints(i.workDir, res.sections);
      record.kind = 'template';
      record.patch = { k: res.k, from: inv.from, deleted: inv.deleted };
      record.drops_rounds = [...i.notesRounds];
      // a round is never both (§6.1): the patch makes the shots regenerate anyway
      record.ignored_notes = noteList(i.review.notes).map(
        (t) => `${t}: skipped by the template round`,
      );
      await i.event('round', 'patch.applied', {
        round: i.n,
        k: res.k,
        applied: res.applied,
        sections: res.sections,
        from: inv.from,
        deleted: inv.deleted,
      });
      if (record.drops_rounds.length > 0) {
        await i.event('round', 'patch.drops_notes', {
          round: i.n,
          rounds: record.drops_rounds,
          why: `checkpoints from ${inv.from} are rebuilt from the patched template, so the line changes and redraws of these notes rounds are gone`,
        });
      }
      if (record.ignored_notes.length > 0) {
        await i.event('round', 'notes.skipped', { round: i.n, notes: record.ignored_notes });
      }
      return { record, notes: null, patches: res.applied, before: null };
    }
  }

  const checked = checkNotes(i.review.notes, await readWorkPlan(i.workDir));
  record.ignored_notes = checked.ignored;
  if (checked.ignored.length > 0) {
    await i.event('round', 'notes.ignored', { round: i.n, notes: checked.ignored });
  }
  if (noteCount(checked.notes) > 0) {
    const before = await snapshot(i.workDir);
    const file = path.join(i.runDir, `notes-${String(i.n + 1)}.json`);
    // a JS string written as utf8 has no BOM, which the engine's JSON.parse would reject
    await writeFile(file, `${JSON.stringify(checked.notes, null, 2)}\n`, 'utf8');
    record.notes_file = file;
    await i.event('round', 'notes.written', { round: i.n, file, notes: checked.notes });
    return { record, notes: checked.notes, patches: null, before };
  }
  if (i.voice !== null) {
    record.kind = 'voice';
    return { record, notes: null, patches: null, before: null };
  }
  const why = [
    patches.length > 0
      ? `${String(record.rejected_patches.length)} patch(es) rejected`
      : 'no patch',
    checked.ignored.length > 0
      ? `${String(checked.ignored.length)} note(s) not usable`
      : 'no notes',
  ];
  return { none: why.join(', ') };
}

/**
 * One job (design §6.1): sync the templates, intake, then cut 1 and up to MAX_FIX_ROUNDS fix rounds, each cut gated and
 * reviewed; stop on an approved cut, on no valid fix, or when the rounds run out; select the best cut (§6.5); write
 * run.json, report.md and an index line. A failed job gets the same record and report, covering the cuts so far.
 * Returns the finished record; the job folder is `runDir(varDir, record.id)`.
 */
export async function runJob(options: JobOptions): Promise<RunRecord> {
  const { config, m3 } = options;
  const varDir = config.varDir;
  const originalsDir = options.originalsDir ?? path.join(repoRoot, 'templates');
  const workingDir = path.join(varDir, 'templates');
  const log = options.log ?? (() => undefined);
  const t0 = Date.now();
  const job = await createJob(varDir, options.request);
  const id = job.id;
  const dir = runDir(varDir, id);
  const started = (await setJobStatus(varDir, id, 'running', { stage: 'sync' })).started ?? '';
  const event = (stage: string, name: string, data: unknown = null): Promise<void> =>
    appendEvent(varDir, id, stage, name, data);
  const stage = async (s: string): Promise<void> => {
    await setJobStage(varDir, id, s);
  };

  const calls: HarnessCall[] = [];
  const counted = async (req: M3Request): Promise<M3Result> => {
    const res = await m3(req);
    calls.push({
      step: req.step,
      tokens_in: res.usage.input + res.usage.cached,
      tokens_out: res.usage.output,
      usd: res.usd,
    });
    return res;
  };

  let intake: Intake | null = null;
  const cuts: CutRecord[] = [];
  const rounds: FixRound[] = [];
  const switches: VoiceSwitch[] = [];
  let syncConflicts: string[] = [];
  let loopEnd: string;
  let error: string | null = null;
  // Spent by invocations of a cut that was never written (refused voices, a crash); counted in the totals.
  let pending: Spent | undefined;

  try {
    await event('sync', 'job.start', { request: options.request });
    const sync = await syncTemplates(originalsDir, workingDir);
    syncConflicts = sync.conflicts;
    for (const e of sync.events) await event('sync', `sync.${e.action}`, e);
    for (const c of sync.conflicts) log(`sync conflict: ${c}`);

    await stage('intake');
    const result = await runIntake({
      request: options.request.request,
      template: options.request.template,
      seconds: options.request.seconds,
      templatesDir: workingDir,
      m3: counted,
    });
    intake = result.intake;
    const kind = intake.template;
    const seconds = intake.seconds;
    const briefFile = path.join(dir, 'brief.txt');
    await writeFile(briefFile, result.brief);
    await event('intake', 'intake.done', intake);
    log(`intake: ${kind} (fit ${intake.fit}), ${String(seconds)} s`);
    // ## checks may not be patched (D16), so the setup holds for every cut; a bad gate line stops the job here,
    // before the engine spends anything
    const frames = frameSetup(await readFile(path.join(workingDir, `${kind}.md`), 'utf8'));
    await event('gates', 'gates.setup', frames);

    // design §6.7: only a refusal rules a model out (for this job); a voice_pitch switch moves on to a model no cut
    // has used yet, and the job fails only when every model is ruled out
    const refusals: Refusal[] = [];
    const ruledOut = new Set<VoiceModelKey>();
    const tried = new Set<VoiceModelKey>();
    let current: VoiceModelKey | undefined; // the model of the last cut made
    const untried = (): VoiceModelKey | undefined =>
      config.voiceModels.find((m) => !tried.has(m) && !ruledOut.has(m));
    const chooseVoice = (pitchSwitch: boolean): VoiceModelKey | undefined => {
      const first = config.voiceModels.find((m) => !ruledOut.has(m));
      if (pitchSwitch) return untried() ?? first;
      return current !== undefined && !ruledOut.has(current) ? current : first;
    };
    let made: Round | null = null; // the round that makes the next cut
    let notesRounds: number[] = [];
    for (let n = 1; ; n++) {
      await stage(`cut-${String(n)}`);
      // the working copy the engine reads for this cut
      const templateSha = sha256(await readFile(path.join(workingDir, `${kind}.md`)));
      const notesFile = made?.record.notes_file ?? undefined;
      const pitchSwitch = made !== null && made.record.voice !== null;

      // the voice fallback of design §6.7 (trigger 1: the engine's voice refusal; the same cut reruns, not a round)
      let written: { cut: CutResult; model: VoiceModelKey } | null = null;
      while (written === null) {
        const model = chooseVoice(pitchSwitch);
        if (model === undefined) {
          throw new Error(
            `every voice model was refused: ${refusals.map((r) => `${r.model} (HTTP ${String(r.status)}: ${r.message})`).join('; ')}`,
          );
        }
        await event('engine', 'engine.start', {
          cut: n,
          voice_model: model,
          notes: notesFile ?? null,
          template_sha: templateSha,
        });
        log(
          `engine: cut ${String(n)} with voice ${model}${notesFile === undefined ? '' : ', notes'}`,
        );
        const run = await runCut({
          config,
          runDir: dir,
          briefFile,
          template: kind,
          seconds,
          cut: n,
          voiceModel: model,
          ...(notesFile === undefined ? {} : { notesFile }),
          ...(pending === undefined ? {} : { earlier: pending }),
          env: { CUTROOM_TEMPLATE_DIR: workingDir, ...options.engineEnv },
        });
        if (run.kind === 'voice_refused') {
          refusals.push(run);
          ruledOut.add(model);
          pending = run.spent;
          const next = chooseVoice(pitchSwitch);
          await event('engine', 'voice.refused', { cut: n, ...run });
          if (next !== undefined) {
            const sw = {
              cut: n,
              from: model,
              to: next,
              reason: `HTTP ${String(run.status)}: ${run.message}`,
            };
            switches.push(sw);
            await event('engine', 'voice.switch', sw);
            log(`voice ${model} refused (HTTP ${String(run.status)}); trying ${next}`);
          }
          continue;
        }
        written = { cut: run, model };
      }
      const { cut, model: voiceKey } = written;
      pending = undefined;
      tried.add(voiceKey);
      current = voiceKey;
      await event('engine', 'engine.end', {
        cut: n,
        voice_model: voiceKey,
        voice_model_id: cut.voiceModelId,
        film_s: cut.filmS,
        wall_s: cut.wallS,
        usd: cut.totalUsd,
      });

      const record: CutRecord = {
        n,
        dir: cut.dir,
        template: kind,
        template_sha: templateSha,
        voice_model: `${voiceKey} (${cut.voiceModelId})`,
        film_s: cut.filmS,
        wall_s: cut.wallS,
        engine_cost: cut.cost,
        gates: [],
        review: null,
        notes_applied: made?.notes ?? null,
        patch_applied: made?.patches ?? null,
        engine_rejections: [
          ...cut.failingSteps.map((f) => `shipped failing: ${f.step}: ${f.reason}`),
          ...cut.rejections,
        ],
        credits: await readFile(cut.creditsPath, 'utf8'),
      };
      cuts.push(record);
      if (made !== null && made.before !== null && made.notes !== null) {
        const cmp = compare(made.before, await snapshot(cut.workDir), made.notes);
        made.record.changed = cmp.changed;
        made.record.unchanged = cmp.unchanged;
        await event('round', 'notes.result', { round: made.record.n, ...cmp });
      }

      await stage('gates');
      const measures = await measureFrames(cut.reelPath, frames.band);
      record.gates = [...(await basicGates(cut)), ...frameGates(measures, frames.settings)];
      await event('gates', 'gates.done', { cut: n, gates: record.gates, frames: measures });
      log(
        `gates: ${record.gates.map((g) => `${g.name} ${g.pass ? 'pass' : 'FAIL'}${g.mode === 'info' ? ' (info)' : ''}`).join(', ')}`,
      );

      await stage(`review-${String(n)}`);
      const reviewed = await reviewCut({
        cut,
        gates: record.gates,
        templatesDir: workingDir,
        template: kind,
        outDir: dir,
        m3: counted,
      });
      const review = reviewed.review;
      record.review = review;
      await event('review', 'review.done', {
        cut: n,
        approve: review.approve,
        reasked: reviewed.reasked,
        scores: review.scores,
        summary: review.summary,
      });
      log(`review ${String(n)}: ${review.approve ? 'approve' : 'fixes wanted'}`);
      const patched = made?.record.patch ?? null;
      if (patched !== null) {
        await recordNextCut(workingDir, kind, patched.k, {
          cut: n,
          gates: record.gates,
          scores: review.scores,
        });
        await event('round', 'patch.graded', { k: patched.k, cut: n });
      }

      if (isApproved(record)) {
        loopEnd = `cut ${String(n)} approved by the review with no blocking gate FAIL`;
        break;
      }
      if (n > MAX_FIX_ROUNDS) {
        loopEnd = `the ${String(MAX_FIX_ROUNDS)} fix rounds are used up; the fixes of cut ${String(n)} are recorded, not applied`;
        break;
      }

      await stage(`round-${String(n)}`);
      const pitch = record.gates.find((g) => g.name === 'voice_pitch');
      // the voice cannot be fixed by notes (§6.7 trigger 2): switch only to a model no cut has used and none refused
      const next = untried();
      const pitchFails = pitch !== undefined && pitch.mode === 'block' && !pitch.pass;
      if (pitchFails && next === undefined) {
        await event('round', 'voice.none_left', {
          cut: n,
          voice_model: voiceKey,
          tried: [...tried],
          ruled_out: [...ruledOut],
        });
      }
      const planned = await planRound({
        n,
        job: id,
        request: options.request.request,
        kind,
        workingDir,
        runDir: dir,
        workDir: cut.workDir,
        cut: record,
        review,
        voice: pitchFails && next !== undefined ? { from: voiceKey, to: next } : null,
        notesRounds,
        event,
      });
      if ('none' in planned) {
        loopEnd = `no valid fix after cut ${String(n)} (${planned.none})${reviewed.reasked ? '; the review was asked again after approving with a blocking gate FAIL' : ''}`;
        await event('round', 'round.none', { cut: n, why: planned.none });
        break;
      }
      made = planned;
      rounds.push(made.record);
      if (made.record.voice !== null && pitch !== undefined) {
        const sw = {
          cut: n + 1,
          from: made.record.voice.from,
          to: made.record.voice.to,
          reason: `voice_pitch FAIL on cut ${String(n)} (${gateValue(pitch.value)} st, needs >= ${String(pitch.threshold)})`,
        };
        switches.push(sw);
        await event('round', 'voice.switch', sw);
      }
      if (made.record.kind === 'notes') notesRounds.push(n);
      if (made.record.kind === 'template') notesRounds = [];
      await event('round', 'round.planned', made.record);
      log(
        `round ${String(n)}: ${made.record.kind}${made.record.voice === null ? '' : `, voice ${made.record.voice.from} -> ${made.record.voice.to}`}`,
      );
    }
  } catch (e) {
    error = describe(e);
    if (e instanceof EngineCrashError) pending = e.spent;
    loopEnd = `stopped by an error after ${String(cuts.length)} cut(s)`;
    await event('error', 'job.error', { error });
    log(`error: ${error}`);
  }
  await event('done', 'loop.end', { reason: loopEnd, cuts: cuts.length, rounds: rounds.length });

  const last = cuts.at(-1);
  const chosen = last !== undefined && isApproved(last) ? last : bestCut(cuts);
  const approved = chosen !== undefined && isApproved(chosen);
  const finished = new Date();
  const harnessUsd = calls.reduce((a, c) => a + c.usd, 0);
  const engineUsd =
    cuts.reduce((a, c) => a + Object.values(c.engine_cost).reduce((b, p) => b + p.usd, 0), 0) +
    (pending?.usd ?? 0);
  const run: RunRecord = {
    id,
    request: options.request,
    intake,
    git_commit: gitCommit(),
    sync_conflicts: syncConflicts,
    cuts,
    rounds,
    loop_end: loopEnd,
    voice_switches: switches,
    harness_calls: calls,
    selected:
      chosen === undefined
        ? null
        : { cut: chosen.n, why: selectionWhy(chosen, cuts.length, approved) },
    status: error === null ? 'done' : 'failed',
    error,
    approved,
    totals: {
      usd: engineUsd + harnessUsd,
      wall_s: (finished.getTime() - t0) / 1000,
      cuts: cuts.length,
      harness_calls: calls.length,
    },
    started,
    finished: finished.toISOString(),
  };
  await writeRunRecord(varDir, run);
  await writeReport(varDir, run);
  await appendIndex(varDir, run);
  await event('done', 'selection', run.selected);
  if (error === null) await setJobStatus(varDir, id, 'done', { stage: 'done' });
  else await setJobStatus(varDir, id, 'failed', { stage: 'failed', error });
  return run;
}

function selectionWhy(chosen: CutRecord, cuts: number, approved: boolean): string {
  if (approved) return 'approved by the review with no blocking gate FAIL';
  const fails = blockingFails(chosen);
  const sum = scoreSum(chosen);
  const review =
    chosen.review === null
      ? 'not reviewed'
      : chosen.review.approve
        ? 'review approve overruled by the gates'
        : 'review wants fixes';
  return `best of ${String(cuts)} cut(s) by fewest blocking gate FAILs, then highest score sum, then the later cut: ${String(fails)} blocking gate FAIL(s), score sum ${sum === null ? 'none' : String(sum)}, ${review}`;
}
