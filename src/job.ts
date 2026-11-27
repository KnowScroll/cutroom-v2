import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { Config, VoiceModelKey } from './config.ts';
import {
  EngineCrashError,
  EngineLockedError,
  parseOutputs,
  runCut,
  type CutResult,
  type RunCutOptions,
  type Spent,
  type VoiceRefused,
} from './engine.ts';
import { basicGates, shippedFailing } from './gates/basic.ts';
import {
  frameGates,
  frameSetup,
  measureFrames,
  readShots,
  type FrameSetup,
} from './gates/frames.ts';
import { runIntake } from './intake.ts';
import type { M3Request, M3Result } from './minimax.ts';
import {
  appendEvent,
  appendIndex,
  blockingFails,
  claimJob,
  createJob,
  factErrors,
  gateValue,
  intakeOf,
  isApproved,
  readJob,
  runDir,
  scoreSum,
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
import { readLoop, writeLoop, type LoopState } from './loop.ts';
import {
  PATCHABLE_SECTIONS,
  RERUN_FROM,
  applyPatches,
  findAppliedPatch,
  invalidateCheckpoints,
  recordNextCut,
  revertPatch,
  syncTemplates,
  type PatchResult,
  type PatchableSection,
  type RejectedPatch,
} from './templates.ts';

const repoRoot = path.resolve(import.meta.dirname, '..');

/** D20: the first cut plus at most this many fix rounds (at most 4 cuts per job). */
export const MAX_FIX_ROUNDS = 3;

export interface JobOptions {
  config: Config;
  request: JobRequest;
  m3: (req: M3Request) => Promise<M3Result>;
  /** The template originals, synced into `<var>/templates` at job start (design §5.2). Default `<repo>/templates`. */
  originalsDir?: string;
  /** An existing job folder (queued, or running when a restart resumes it) instead of a new one; `request` is its request. */
  jobId?: string;
  /** Extra environment for the engine process. */
  engineEnv?: Readonly<Record<string, string>>;
  /** Milliseconds between tries while another process holds the engine lock (default 2000). */
  lockPollMs?: number;
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

/**
 * Design §6.5, below 0 when `a` ranks before `b`: approved first, then no fact error (a factual error blocks like a
 * gate, and a wrong cut never beats a correct one), then fewest blocking FAILs, then the highest score sum (an
 * unreviewed cut has none).
 */
function compareCuts(a: CutRecord, b: CutRecord): number {
  const keys = (c: CutRecord): number[] => [
    isApproved(c) ? 0 : 1,
    factErrors(c).length > 0 ? 1 : 0,
    blockingFails(c),
    -(scoreSum(c) ?? 0),
  ];
  const ka = keys(a);
  const kb = keys(b);
  for (let i = 0; i < ka.length; i++) {
    const d = (ka[i] ?? 0) - (kb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Design §6.5: the order of compareCuts, then the later cut. */
export function bestCut(cuts: readonly CutRecord[]): CutRecord | undefined {
  let best: CutRecord | undefined;
  for (const c of cuts) {
    if (best === undefined) {
      best = c;
      continue;
    }
    const d = compareCuts(c, best);
    if (d < 0 || (d === 0 && c.n > best.n)) best = c;
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

// Resume helpers (design §8): the planned round and the job's own start.
/** Waits ms; a SIGINT/SIGTERM meanwhile exits at once (the job stays running and resumes at the next start). */
async function sleepOrExit(ms: number): Promise<void> {
  const bye = (signal: NodeJS.Signals): void => {
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  process.on('SIGINT', bye);
  process.on('SIGTERM', bye);
  try {
    await new Promise((r) => setTimeout(r, ms));
  } finally {
    process.off('SIGINT', bye);
    process.off('SIGTERM', bye);
  }
}

function snapshotToJson(s: Snapshot): { lines: string[]; code: Record<string, string> } {
  return { lines: s.lines, code: Object.fromEntries(s.code) };
}

/** The planned round a loop state holds; its record is the one in `rounds`, so later updates reach both. */
function restoreRound(state: LoopState): Round | null {
  if (state.made === null) return null;
  const { n, notes, patches, before } = state.made;
  const record = state.rounds.find((r) => r.n === n);
  if (record === undefined) throw new Error(`loop state: no record of round ${String(n)}`);
  return {
    record,
    notes,
    patches,
    before:
      before === null ? null : { lines: before.lines, code: new Map(Object.entries(before.code)) },
  };
}

/**
 * Design §5.3 when a job ends: every patch it applied whose next cut was not better, or was never reviewed (the job
 * failed first), goes out of the working copy, latest first so each finds its own result there. Not sooner: the job's
 * later cuts resume from checkpoints built with the patch. A patch that a kept later patch builds on stays (logged).
 */
async function revertUnkept(
  workingDir: string,
  cuts: readonly CutRecord[],
  rounds: readonly FixRound[],
  event: (stage: string, name: string, data: unknown) => Promise<void>,
  log: (line: string) => void,
): Promise<void> {
  for (const r of [...rounds].reverse()) {
    const p = r.patch;
    if (p === null || p.kept === true) continue;
    // round n patches the template cut n was made with
    const kind = cuts.find((c) => c.n === r.n)?.template;
    if (kind === undefined) throw new Error(`round ${String(r.n)} has no cut ${String(r.n)}`);
    const res = await revertPatch(workingDir, kind, p.k);
    p.reverted = res !== 'changed';
    const why =
      p.kept === false
        ? `cut ${String(r.cut)} was not better than cut ${String(r.n)}`
        : `cut ${String(r.cut)} was never reviewed`;
    await event('round', p.reverted ? 'patch.reverted' : 'patch.not_reverted', {
      k: p.k,
      round: r.n,
      why: p.reverted ? why : `${why}, but a later patch builds on it; left in the working copy`,
    });
    if (p.reverted) log(`template patch ${String(p.k)} reverted: ${why}`);
  }
}

/** A new job, or the queued / running job `options.jobId` names (a running one is a resume). */
async function openJob(
  varDir: string,
  options: JobOptions,
): Promise<{ id: string; started: string }> {
  let id: string;
  if (options.jobId === undefined) {
    id = (await createJob(varDir, options.request)).id;
  } else {
    id = options.jobId;
    const job = await readJob(varDir, id);
    if (job.status === 'running') {
      await claimJob(varDir, id);
      return { id, started: job.started ?? '' };
    }
  }
  const running = await setJobStatus(varDir, id, 'running', { stage: 'sync' });
  return { id, started: running.started ?? '' };
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
  /** The intake fit of the template cut n was made with: a patch may not widen a template to a request it does not fit. */
  fit: Intake['fit'];
  /** Notes rounds since the last template round: a template round's rerun drops their changes. */
  notesRounds: readonly number[];
  event: (stage: string, name: string, data: unknown) => Promise<void>;
}

const isPatchable = (s: string): s is PatchableSection =>
  (PATCHABLE_SECTIONS as readonly string[]).includes(s);

function newRound(i: RoundInput): FixRound {
  return {
    n: i.n,
    cut: i.n + 1,
    kind: 'notes',
    intake: null,
    notes_file: null,
    ignored_notes: [],
    patch: null,
    rejected_patches: [],
    drops_rounds: [],
    voice: i.voice,
    changed: null,
    unchanged: null,
  };
}

/**
 * Design §5.3 round rules for a review's patches, before any is applied: none when the template does not fit the
 * request or the review calls it the wrong template (a patch would widen what it is for); and a look/shots patch must
 * not re-roll the writer, so writer-section patches (story, plan, sound) wait when production patches come with them.
 */
function screenPatches(
  patches: readonly TemplatePatch[],
  i: RoundInput,
): { keep: TemplatePatch[]; rejected: RejectedPatch[] } {
  if (i.review.wrong_template !== undefined || i.fit !== 'good') {
    const why =
      i.review.wrong_template !== undefined
        ? 'the review found the template wrong for this request'
        : `the intake fit is "${i.fit}"`;
    return {
      keep: [],
      rejected: patches.map((patch) => ({
        patch,
        reason: `${why}: a patch may not widen what the template is for`,
      })),
    };
  }
  const section = (p: TemplatePatch): string => p.section.trim().toLowerCase();
  const rerunFrom = (p: TemplatePatch): string | undefined => {
    const s = section(p);
    return isPatchable(s) ? RERUN_FROM[s] : undefined;
  };
  // sections read before the production plan (design §5.4): their checkpoints are the writer's
  const writer = (p: TemplatePatch): boolean => {
    const from = rerunFrom(p);
    return from !== undefined && from !== 'plan.json';
  };
  if (!patches.some((p) => rerunFrom(p) === 'plan.json')) {
    return { keep: [...patches], rejected: [] };
  }
  return {
    keep: patches.filter((p) => !writer(p)),
    rejected: patches.filter(writer).map((patch) => ({
      patch,
      reason: `a look/shots patch must not re-roll the writer: the ${section(patch)} patch waits for a round of its own`,
    })),
  };
}

/**
 * Resume (design §8): a patch this job already applied for this round (history entry, working copy at its result) is
 * taken as it is, never applied twice; the caller still invalidates the checkpoints, which finishes a round that
 * stopped between the patch and the deletion.
 */
async function appliedOrApply(
  i: RoundInput,
  patches: readonly TemplatePatch[],
): Promise<PatchResult> {
  const prior = await findAppliedPatch(i.workingDir, i.kind, i.job, i.n);
  if (prior !== null) {
    const sections = prior.patches.map((p) => p.section.trim().toLowerCase()).filter(isPatchable);
    return { k: prior.k, applied: prior.patches, rejected: prior.rejected, sections };
  }
  return applyPatches(i.workingDir, i.kind, patches, {
    job: i.job,
    cut: i.n,
    round: i.n,
    request: i.request,
    gates: i.cut.gates,
    scores: i.review.scores,
  });
}

/**
 * Round n after a review that found the template cannot show the subject (design §6.1, once per job): intake again
 * without that template, a new brief.txt, and every checkpoint from the facts on deleted, so the next cut is made from
 * the start with the new template. The review's notes and patches were for the old template: none is passed on.
 */
async function planIntakeRound(
  i: RoundInput,
  why: string,
  intakeOpts: { seconds: number | undefined; m3: (req: M3Request) => Promise<M3Result> },
): Promise<Round> {
  const record = newRound(i);
  record.kind = 'intake';
  const result = await runIntake({
    request: i.request,
    seconds: intakeOpts.seconds,
    exclude: { template: i.kind, why },
    templatesDir: i.workingDir,
    m3: intakeOpts.m3,
  });
  record.intake = result.intake;
  await writeFile(path.join(i.runDir, 'brief.txt'), result.brief);
  const inv = await invalidateCheckpoints(i.workDir, ['story']);
  record.drops_rounds = [...i.notesRounds];
  record.ignored_notes = noteList(i.review.notes).map((t) => `${t}: skipped by the intake round`);
  record.rejected_patches = screenPatches(i.review.template_patch ?? [], i).rejected;
  await i.event('round', 'intake.again', {
    round: i.n,
    from: i.kind,
    why,
    intake: result.intake,
    deleted: inv.deleted,
  });
  return { record, notes: null, patches: null, before: null };
}

/**
 * Round n after the review of cut n (design §6.1): a valid template patch makes a template round (patch, invalidate,
 * rerun with no notes); otherwise the notes make a notes round (notes-<n+1>.json for --apply-notes); a voice_pitch
 * switch alone makes a voice round. `none`: no valid fix (why), the loop stops.
 */
async function planRound(i: RoundInput): Promise<Round | { none: string }> {
  const record = newRound(i);
  const patches = i.review.template_patch ?? [];
  if (patches.length > 0) {
    const screened = screenPatches(patches, i);
    const res: PatchResult =
      screened.keep.length > 0
        ? await appliedOrApply(i, screened.keep)
        : { k: null, applied: [], rejected: [], sections: [] };
    record.rejected_patches = [...screened.rejected, ...res.rejected];
    for (const r of record.rejected_patches) {
      await i.event('round', 'patch.rejected', { round: i.n, ...r });
    }
    if (res.k !== null) {
      const inv = await invalidateCheckpoints(i.workDir, res.sections);
      record.kind = 'template';
      record.patch = {
        k: res.k,
        from: inv.from,
        deleted: inv.deleted,
        kept: null,
        reverted: false,
      };
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
  // Durations come from the monotonic clock: WSL steps its wall clock by seconds, also backwards (#38).
  const t0 = performance.now();
  const { id, started } = await openJob(varDir, options);
  const dir = runDir(varDir, id);
  let earlierS = 0; // seconds of the starts before this one (resume)
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

  // design §8: a busy engine lock means wait, not fail; the job stays running and nothing is spent
  const runWaiting = async (opts: RunCutOptions): Promise<CutResult | VoiceRefused> => {
    let waited = false;
    for (;;) {
      try {
        return await runCut(opts);
      } catch (e) {
        if (!(e instanceof EngineLockedError)) throw e;
        if (!waited) {
          waited = true;
          await event('engine', 'engine.wait', { cut: opts.cut, holder_pid: e.holderPid });
          log(`waiting for the engine lock (pid ${String(e.holderPid)})`);
        }
        await sleepOrExit(options.lockPollMs ?? 2000);
      }
    }
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

  // design §6.7: only a refusal rules a model out (for this job); a voice_pitch switch moves on to a model no cut
  // has used yet, and the job fails only when every model is ruled out
  const refusals: Refusal[] = [];
  const ruledOut = new Set<VoiceModelKey>();
  const tried = new Set<VoiceModelKey>();
  let current: VoiceModelKey | undefined; // the model of the last cut made
  let made: Round | null = null; // the round that makes the next cut
  let notesRounds: number[] = [];
  let reasked = false;
  // Resume (design §8): what a restarted job keeps is written after each step that cannot be redone for free.
  const save = async (): Promise<void> => {
    if (intake === null) throw new Error('loop state saved before intake');
    await writeLoop(dir, {
      intake,
      sync_conflicts: syncConflicts,
      elapsed_s: earlierS + (performance.now() - t0) / 1000,
      cuts,
      rounds,
      voice_switches: switches,
      harness_calls: calls,
      refusals,
      ruled_out: [...ruledOut],
      tried: [...tried],
      current: current ?? null,
      pending: pending ?? null,
      notes_rounds: notesRounds,
      made:
        made === null
          ? null
          : {
              n: made.record.n,
              notes: made.notes,
              patches: made.patches,
              before: made.before === null ? null : snapshotToJson(made.before),
            },
      reasked,
    });
  };

  try {
    const state = await readLoop(dir);
    if (state === null) {
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
      await writeFile(path.join(dir, 'brief.txt'), result.brief);
      await event('intake', 'intake.done', intake);
      log(`intake: ${intake.template} (fit ${intake.fit}), ${String(intake.seconds)} s`);
      await save();
    } else {
      ({ intake, sync_conflicts: syncConflicts } = state);
      earlierS = state.elapsed_s;
      cuts.push(...state.cuts);
      rounds.push(...state.rounds);
      switches.push(...state.voice_switches);
      calls.push(...state.harness_calls);
      refusals.push(...state.refusals);
      state.ruled_out.forEach((m) => ruledOut.add(m));
      state.tried.forEach((m) => tried.add(m));
      current = state.current ?? undefined;
      pending = state.pending ?? undefined;
      notesRounds = state.notes_rounds;
      reasked = state.reasked;
      made = restoreRound(state);
      await event('sync', 'job.resume', { cuts: cuts.length, rounds: rounds.length });
      log(`resuming after ${String(cuts.length)} cut(s)`);
    }
    const firstIntake = intake;
    const briefFile = path.join(dir, 'brief.txt');
    // ## checks may not be patched (D16), so a template's setup holds for every cut made with it (recomputed on resume
    // and after an intake round); a bad gate line stops the job before the engine spends anything on that template
    const setups = new Map<string, FrameSetup>();
    const framesFor = async (k: string): Promise<FrameSetup> => {
      const known = setups.get(k);
      if (known !== undefined) return known;
      const s = frameSetup(await readFile(path.join(workingDir, `${k}.md`), 'utf8'));
      setups.set(k, s);
      await event('gates', 'gates.setup', s);
      return s;
    };
    // one intake round per job (design §6.1), and none when the caller named the template
    const reintakeLeft = (): boolean =>
      options.request.template === undefined && !rounds.some((r) => r.kind === 'intake');

    const untried = (): VoiceModelKey | undefined =>
      config.voiceModels.find((m) => !tried.has(m) && !ruledOut.has(m));
    const chooseVoice = (pitchSwitch: boolean): VoiceModelKey | undefined => {
      const first = config.voiceModels.find((m) => !ruledOut.has(m));
      if (pitchSwitch) return untried() ?? first;
      return current !== undefined && !ruledOut.has(current) ? current : first;
    };
    // Resume: a cut without a review goes on with its gates and review; a finished cut with the next round planned
    // goes to the engine; a finished cut alone goes on with the end check and the round.
    const last = cuts.at(-1);
    const startN =
      last === undefined
        ? 1
        : last.review === null || made === null || made.record.cut !== last.n + 1
          ? last.n
          : last.n + 1;
    const workDir = path.join(dir, 'reel-work');
    for (let n = startN; ; n++) {
      await stage(`cut-${String(n)}`);
      const cutIntake = intakeOf({ intake: firstIntake, rounds }, n) ?? firstIntake;
      const kind = cutIntake.template;
      const seconds = cutIntake.seconds;
      const frames = await framesFor(kind);
      const resumed = cuts.find((c) => c.n === n);
      let record: CutRecord;
      let cut: CutResult | undefined;
      let voiceKey: VoiceModelKey;
      if (resumed !== undefined) {
        if (current === undefined) throw new Error(`cut ${String(n)} resumed with no voice model`);
        record = resumed;
        voiceKey = current;
      } else {
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
          const run = await runWaiting({
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
            await save();
            continue;
          }
          written = { cut: run, model };
        }
        cut = written.cut;
        voiceKey = written.model;
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

        record = {
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
          shipped_failing: [],
          credits: await readFile(cut.creditsPath, 'utf8'),
        };
        cuts.push(record);
        if (made !== null && made.before !== null && made.notes !== null) {
          const cmp = compare(made.before, await snapshot(workDir), made.notes);
          made.record.changed = cmp.changed;
          made.record.unchanged = cmp.unchanged;
          await event('round', 'notes.result', { round: made.record.n, ...cmp });
        }
        await save();
      }

      let review: Review;
      if (record.review !== null) {
        review = record.review;
      } else {
        // a cut resumed before its review: its outputs are on disk
        cut ??= await parseOutputs(dir, n, path.join(dir, `engine-${String(n)}.log`));
        await stage('gates');
        const measures = await measureFrames(cut.reelPath, frames.band, await readShots(cut.dir));
        const prev = cuts.find((c) => c.n === n - 1);
        record.shipped_failing = await shippedFailing(
          cut,
          prev === undefined ? null : { dir: prev.dir, failing: prev.shipped_failing },
        );
        record.gates = [
          ...(await basicGates(cut, record.shipped_failing)),
          ...frameGates(measures, frames.settings),
        ];
        await event('gates', 'gates.done', { cut: n, gates: record.gates, frames: measures });
        log(
          `gates: ${record.gates.map((g) => `${g.name} ${g.pass ? 'pass' : 'FAIL'}${g.mode === 'info' ? ' (info)' : ''}`).join(', ')}`,
        );

        await stage(`review-${String(n)}`);
        const reviewed = await reviewCut({
          cut,
          failing: record.shipped_failing,
          gates: record.gates,
          templatesDir: workingDir,
          template: kind,
          outDir: dir,
          m3: counted,
        });
        review = reviewed.review;
        record.review = review;
        reasked = reviewed.reasked;
        await save();
        await event('review', 'review.done', {
          cut: n,
          approve: review.approve,
          reasked: reviewed.reasked,
          scores: review.scores,
          summary: review.summary,
        });
        log(`review ${String(n)}: ${review.approve ? 'approve' : 'fixes wanted'}`);
      }
      // recordNextCut rewrites the entry's `next`, so a resume may repeat it
      const patched = made?.record.patch ?? null;
      const asked = cuts.find((c) => c.n === made?.record.n);
      if (patched !== null && asked !== undefined) {
        await recordNextCut(workingDir, kind, patched.k, {
          cut: n,
          gates: record.gates,
          scores: review.scores,
        });
        // design §5.3: a patch stays only if the cut it made ranks better than the cut that asked for it; one that
        // does not is undone when the job ends (revertUnkept), since this job's later cuts resume from its checkpoints
        patched.kept = compareCuts(record, asked) < 0;
        await event('round', 'patch.graded', {
          k: patched.k,
          cut: n,
          than: asked.n,
          better: patched.kept,
        });
        await save();
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
      const roundInput: RoundInput = {
        n,
        job: id,
        request: options.request.request,
        kind,
        workingDir,
        runDir: dir,
        workDir,
        cut: record,
        review,
        voice: pitchFails && next !== undefined ? { from: voiceKey, to: next } : null,
        fit: cutIntake.fit,
        notesRounds,
        event,
      };
      const wrongTemplate = review.wrong_template;
      if (wrongTemplate !== undefined && !reintakeLeft()) {
        await event('round', 'intake.not_again', {
          cut: n,
          why: wrongTemplate,
          because:
            options.request.template === undefined
              ? 'this job already had its intake round'
              : 'the caller named the template',
        });
      }
      const planned =
        wrongTemplate !== undefined && reintakeLeft()
          ? await planIntakeRound(roundInput, wrongTemplate, {
              seconds: options.request.seconds,
              m3: counted,
            })
          : await planRound(roundInput);
      if ('none' in planned) {
        loopEnd = `no valid fix after cut ${String(n)} (${planned.none})${reasked ? '; the review was asked again after approving with a blocking gate FAIL' : ''}`;
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
      if (made.record.kind === 'template' || made.record.kind === 'intake') notesRounds = [];
      await save();
      await event('round', 'round.planned', made.record);
      const to = made.record.intake === null ? '' : ` -> ${made.record.intake.template}`;
      log(
        `round ${String(n)}: ${made.record.kind}${to}${made.record.voice === null ? '' : `, voice ${made.record.voice.from} -> ${made.record.voice.to}`}`,
      );
    }
  } catch (e) {
    error = describe(e);
    if (e instanceof EngineCrashError) pending = e.spent;
    loopEnd = `stopped by an error after ${String(cuts.length)} cut(s)`;
    await event('error', 'job.error', { error });
    log(`error: ${error}`);
  }
  try {
    await revertUnkept(workingDir, cuts, rounds, event, log);
  } catch (e) {
    const why = `template patch revert failed: ${describe(e)}`;
    error ??= why;
    await event('error', 'job.error', { error: why });
    log(`error: ${why}`);
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
      wall_s: earlierS + (performance.now() - t0) / 1000,
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
  const wrong = factErrors(chosen).length;
  const sum = scoreSum(chosen);
  const review =
    chosen.review === null
      ? 'not reviewed'
      : chosen.review.approve
        ? 'review approve overruled by the gates or its fact errors'
        : 'review wants fixes';
  return `best of ${String(cuts)} cut(s) by no fact error, then fewest blocking gate FAILs, then highest score sum, then the later cut: ${String(wrong)} fact error(s), ${String(fails)} blocking gate FAIL(s), score sum ${sum === null ? 'none' : String(sum)}, ${review}`;
}
