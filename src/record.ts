import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { renameRetry } from './proc.ts';

const NonNegative = z.number().nonnegative();

export const JobStatus = z.enum(['queued', 'running', 'done', 'failed']);
export type JobStatus = z.infer<typeof JobStatus>;

export const JobRequest = z.object({
  request: z.string().min(1),
  template: z.string().optional(),
  seconds: z.number().positive().optional(),
});
export type JobRequest = z.infer<typeof JobRequest>;

export const Job = z.object({
  id: z.string(),
  request: JobRequest,
  status: JobStatus,
  stage: z.string(),
  created: z.string(),
  updated: z.string(),
  started: z.string().nullable(),
  finished: z.string().nullable(),
  error: z.string().nullable(),
  /** The process running the job (design §8): another process resumes it only when this pid is dead. */
  owner: z.object({ pid: z.number().int() }).nullable().default(null),
});
export type Job = z.infer<typeof Job>;

export const RunEvent = z.object({
  t: z.string(),
  stage: z.string(),
  event: z.string(),
  data: z.unknown(),
});
export type RunEvent = z.infer<typeof RunEvent>;

export const Intake = z.object({
  template: z.string(),
  fit: z.enum(['good', 'partial', 'none']),
  reason: z.string(),
  audience: z.string(),
  goal: z.string(),
  tone: z.string(),
  seconds: z.number(),
  // the scope check of design §6.2; defaults keep run.json files written before it readable
  subject: z.string().default(''),
  subject_kind: z.string().default(''),
  /** Words of the template's about that cover the subject, copied by the model and found there by code. */
  covers: z.string().default(''),
  /** Words of the template's "Not for" the subject falls under (then fit is none). */
  excludes: z.string().default(''),
});
export type Intake = z.infer<typeof Intake>;

export const Gate = z.object({
  name: z.string(),
  value: z.union([z.number(), z.string(), z.boolean(), z.null(), z.record(z.string(), z.number())]),
  threshold: z.union([z.number(), z.string(), z.boolean(), z.null()]),
  pass: z.boolean(),
  mode: z.enum(['block', 'info']),
});
export type Gate = z.infer<typeof Gate>;

const Score = z.number().min(1).max(5);

export const ReviewScores = z.object({
  hook: Score,
  clarity: Score,
  visual: Score,
  pacing: Score,
  audio: Score,
  fit: Score,
});
export type ReviewScores = z.infer<typeof ReviewScores>;

export const TemplatePatch = z.object({
  section: z.string(),
  op: z.enum(['append', 'replace']),
  old: z.string().optional(),
  text: z.string(),
  reason: z.string(),
});
export type TemplatePatch = z.infer<typeof TemplatePatch>;

// Strict: a key outside the contract (design §6.4) is an error, not a note dropped in silence.
export const ReviewNotes = z.strictObject({
  lines: z
    .record(
      z.string(),
      z.array(z.object({ who: z.string(), text: z.string(), tone: z.string().optional() })),
    )
    .optional(),
  assets: z.record(z.string(), z.string()).optional(),
  shots: z.record(z.string(), z.string()).optional(),
});
export type ReviewNotes = z.infer<typeof ReviewNotes>;

export const Review = z.strictObject({
  approve: z.boolean(),
  summary: z.string(),
  scores: ReviewScores,
  notes: ReviewNotes,
  template_patch: z.array(TemplatePatch).optional(),
  /** Claims the cut says or shows that are false (design §6.5: a cut with one ranks after every cut without). */
  fact_errors: z.array(z.string()).optional(),
  /** Why the template cannot show the brief's subject at all (design §6.1: re-runs intake once per job). */
  wrong_template: z.string().optional(),
});
export type Review = z.infer<typeof Review>;

export const PhaseCost = z.object({
  usd: NonNegative,
  tokens_in: NonNegative,
  tokens_out: NonNegative,
});
export type PhaseCost = z.infer<typeof PhaseCost>;

/** A step (shot<n>, asset:<id>, kit) in a cut although it failed its validator, and the cut whose log said so. */
export const ShippedStep = z.object({
  step: z.string(),
  reason: z.string(),
  cut: z.number().int().positive(),
});
export type ShippedStep = z.infer<typeof ShippedStep>;

export const CutRecord = z.object({
  n: z.number().int().positive(),
  dir: z.string(),
  template: z.string(),
  template_sha: z.string(),
  voice_model: z.string(),
  film_s: NonNegative,
  wall_s: NonNegative,
  engine_cost: z.record(z.string(), PhaseCost),
  gates: z.array(Gate),
  review: Review.nullable(),
  notes_applied: ReviewNotes.nullable(),
  patch_applied: z.array(TemplatePatch).nullable(),
  engine_rejections: z.array(z.string()),
  /** What the shipped_failing gate counted: this cut's log, plus earlier failing steps whose code is unchanged. */
  shipped_failing: z.array(ShippedStep).default([]),
  credits: z.string(),
});
export type CutRecord = z.infer<typeof CutRecord>;

export const HarnessCall = z.object({
  step: z.string(),
  tokens_in: NonNegative,
  tokens_out: NonNegative,
  usd: NonNegative,
});
export type HarnessCall = z.infer<typeof HarnessCall>;

export const VoiceSwitch = z.object({
  cut: z.number().int().positive(),
  from: z.string(),
  to: z.string(),
  reason: z.string(),
});
export type VoiceSwitch = z.infer<typeof VoiceSwitch>;

const NoteTargets = z.object({
  lines: z.array(z.number().int().positive()),
  shots: z.array(z.number().int().positive()),
  assets: z.array(z.string()),
});
export type NoteTargets = z.infer<typeof NoteTargets>;

// One fix round (design §6.1, D20): round n follows the review of cut n and makes cut n + 1.
export const FixRound = z.object({
  n: z.number().int().positive(),
  cut: z.number().int().positive(),
  kind: z.enum(['notes', 'template', 'voice', 'intake']),
  /** Intake round: the new intake after the review's wrong_template verdict (the next cut is rebuilt from the facts). */
  intake: Intake.nullable().default(null),
  /** notes-<cut>.json, passed with --apply-notes (notes round). */
  notes_file: z.string().nullable(),
  /** Review notes not passed on: on a shot or asset the work plan.json lacks, or skipped by a template round. */
  ignored_notes: z.array(z.string()),
  /** The applied patch's history entry and the checkpoints it deleted (template round). */
  patch: z
    .object({
      k: z.number().int().positive(),
      from: z.string(),
      deleted: z.array(z.string()),
      /** Set when the next cut is reviewed: whether that cut ranks better than the one that asked for it. */
      kept: z.boolean().nullable().default(null),
      /** At the job's end the working copy went back to before the patch (not kept, or its cut never reviewed). */
      reverted: z.boolean().default(false),
    })
    .nullable(),
  rejected_patches: z.array(z.object({ patch: TemplatePatch, reason: z.string() })),
  /** Earlier notes rounds whose changes this template round's rerun drops (the plan and shots are rebuilt). */
  drops_rounds: z.array(z.number().int().positive()),
  /** The voice_pitch switch of design §6.7 (trigger 2). */
  voice: z.object({ from: z.string(), to: z.string() }).nullable(),
  /** What the engine changed in the checkpoints (notes round, compared before and after). */
  changed: NoteTargets.nullable(),
  /** Noted, but the checkpoint is unchanged (a redraw that failed its checks keeps the old code). */
  unchanged: NoteTargets.nullable(),
});
export type FixRound = z.infer<typeof FixRound>;

export const RunRecord = z.object({
  id: z.string(),
  request: JobRequest,
  intake: Intake.nullable(),
  git_commit: z.string(),
  sync_conflicts: z.array(z.string()),
  cuts: z.array(CutRecord),
  // defaults keep run.json files written before the fix loop readable
  rounds: z.array(FixRound).default([]),
  /** Why the loop stopped: approved, rounds used up, no valid fix, or an error. */
  loop_end: z.string().default(''),
  voice_switches: z.array(VoiceSwitch),
  harness_calls: z.array(HarnessCall),
  selected: z.object({ cut: z.number().int().positive(), why: z.string() }).nullable(),
  status: z.enum(['done', 'failed']),
  error: z.string().nullable(),
  approved: z.boolean(),
  totals: z.object({
    usd: NonNegative,
    wall_s: NonNegative,
    cuts: z.number().int().nonnegative(),
    harness_calls: z.number().int().nonnegative(),
  }),
  started: z.string(),
  finished: z.string(),
});
export type RunRecord = z.infer<typeof RunRecord>;

export const IndexLine = z.object({
  id: z.string(),
  date: z.string(),
  template: z.string().nullable(),
  sha: z.string().nullable(),
  fit: z.string().nullable(),
  cuts: z.number().int(),
  selected: z.number().int().nullable(),
  approved: z.boolean(),
  blocking_fails: z.number().int().nullable(),
  cost_usd: z.number(),
  wall_s: z.number(),
});
export type IndexLine = z.infer<typeof IndexLine>;

const transitions: Record<JobStatus, readonly JobStatus[]> = {
  queued: ['running'],
  running: ['done', 'failed'],
  done: [],
  failed: [],
};

export function runDir(varDir: string, id: string): string {
  return join(varDir, 'runs', id);
}

function slugOf(request: string): string {
  const slug = request
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return slug === '' ? 'reel' : slug;
}

function stamp(now: Date): string {
  const iso = now.toISOString(); // UTC, so ids sort the same on every machine
  return `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}-${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}`;
}

function hasCode(err: unknown, code: string): boolean {
  return err instanceof Error && 'code' in err && err.code === code;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  const tmp = `${path}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`);
  await renameRetry(tmp, path);
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown; // untyped JSON; every caller parses it with zod
}

/**
 * Creates the run folder and a queued job.json. The folder is made with a non-recursive
 * mkdir, which fails if it exists, so two jobs in the same second with the same slug get
 * `-2`, `-3` ... and never share a folder.
 */
export async function createJob(
  varDir: string,
  request: JobRequest,
  now = new Date(),
): Promise<Job> {
  const parsed = JobRequest.parse(request);
  const base = `${stamp(now)}-${slugOf(parsed.request)}`;
  await mkdir(join(varDir, 'runs'), { recursive: true });
  for (let n = 1; ; n++) {
    const id = n === 1 ? base : `${base}-${String(n)}`;
    try {
      await mkdir(runDir(varDir, id));
    } catch (err) {
      if (hasCode(err, 'EEXIST')) continue;
      throw err;
    }
    const t = now.toISOString();
    const job: Job = {
      id,
      request: parsed,
      status: 'queued',
      stage: 'queued',
      created: t,
      updated: t,
      started: null,
      finished: null,
      error: null,
      owner: null,
    };
    await writeJson(join(runDir(varDir, id), 'job.json'), job);
    return job;
  }
}

export async function readJob(varDir: string, id: string): Promise<Job> {
  return Job.parse(await readJson(join(runDir(varDir, id), 'job.json')));
}

/** Moves a job to a new status (queued -> running -> done | failed); any other move throws. */
export async function setJobStatus(
  varDir: string,
  id: string,
  status: JobStatus,
  opts: { stage?: string; error?: string; now?: Date } = {},
): Promise<Job> {
  const job = await readJob(varDir, id);
  if (!transitions[job.status].includes(status)) {
    throw new Error(`job ${id}: cannot move from ${job.status} to ${status}`);
  }
  if (status === 'failed' && (opts.error ?? '') === '') {
    throw new Error(`job ${id}: a failed job needs an error`);
  }
  const t = (opts.now ?? new Date()).toISOString();
  const next: Job = {
    ...job,
    status,
    stage: opts.stage ?? status,
    updated: t,
    started: status === 'running' ? t : job.started,
    finished: status === 'done' || status === 'failed' ? t : null,
    error: status === 'failed' ? (opts.error ?? null) : null,
    owner: status === 'running' ? { pid: process.pid } : job.owner,
  };
  await writeJson(join(runDir(varDir, id), 'job.json'), next);
  return next;
}

/** Makes this process the owner of a running job (a resume after its last owner died). */
export async function claimJob(varDir: string, id: string): Promise<Job> {
  const job = await readJob(varDir, id);
  if (job.status !== 'running')
    throw new Error(`job ${id}: only a running job is claimed, not ${job.status}`);
  const next: Job = { ...job, owner: { pid: process.pid }, updated: new Date().toISOString() };
  await writeJson(join(runDir(varDir, id), 'job.json'), next);
  return next;
}

/** Records the stage of a running job. */
export async function setJobStage(
  varDir: string,
  id: string,
  stage: string,
  now = new Date(),
): Promise<Job> {
  const job = await readJob(varDir, id);
  if (job.status !== 'running') {
    throw new Error(`job ${id}: stage can only change while running, not ${job.status}`);
  }
  const next: Job = { ...job, stage, updated: now.toISOString() };
  await writeJson(join(runDir(varDir, id), 'job.json'), next);
  return next;
}

export async function appendEvent(
  varDir: string,
  id: string,
  stage: string,
  event: string,
  data: unknown = null,
  now = new Date(),
): Promise<void> {
  const line: RunEvent = { t: now.toISOString(), stage, event, data };
  await appendFile(join(runDir(varDir, id), 'events.jsonl'), `${JSON.stringify(line)}\n`);
}

export async function readEvents(varDir: string, id: string): Promise<RunEvent[]> {
  const text = await readFile(join(runDir(varDir, id), 'events.jsonl'), 'utf8');
  return text
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => RunEvent.parse(JSON.parse(l)));
}

// prettifyError names the failing fields; a thrown ZodError's message is a lazy getter, which node:test reports as ''.
export async function writeRunRecord(varDir: string, run: RunRecord): Promise<void> {
  const file = join(runDir(varDir, run.id), 'run.json');
  const parsed = RunRecord.safeParse(run);
  if (!parsed.success) {
    throw new Error(`run record not written to ${file}: ${z.prettifyError(parsed.error)}`);
  }
  await writeJson(file, parsed.data);
}

export async function readRunRecord(varDir: string, id: string): Promise<RunRecord> {
  const file = join(runDir(varDir, id), 'run.json');
  const parsed = RunRecord.safeParse(await readJson(file));
  if (!parsed.success) throw new Error(`${file}: ${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

export function blockingFails(cut: CutRecord): number {
  return cut.gates.filter((g) => g.mode === 'block' && !g.pass).length;
}

/** The false claims the cut's review found (none for an unreviewed cut). */
export function factErrors(cut: CutRecord): readonly string[] {
  return cut.review?.fact_errors ?? [];
}

/** Approved means the review approved, no blocking gate FAILs and no fact error (design §6.5); a re-asked approve is not enough. */
export function isApproved(cut: CutRecord): boolean {
  return cut.review?.approve === true && blockingFails(cut) === 0 && factErrors(cut).length === 0;
}

export function scoreSum(cut: CutRecord): number | null {
  return cut.review === null ? null : Object.values(cut.review.scores).reduce((a, b) => a + b, 0);
}

function engineUsd(cut: CutRecord): number {
  return Object.values(cut.engine_cost).reduce((a, p) => a + p.usd, 0);
}

function money(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

function secs(s: number): string {
  return `${s.toFixed(0)} s`;
}

export function gateValue(v: Gate['value']): string {
  if (v !== null && typeof v === 'object') {
    return Object.entries(v)
      .map(([k, n]) => `${k} ${String(n)}`)
      .join(', ');
  }
  return String(v);
}

function targets(t: NoteTargets): string {
  const parts = [
    t.lines.length > 0 ? `lines of shot ${t.lines.join(', ')}` : '',
    t.shots.length > 0 ? `shot ${t.shots.join(', ')}` : '',
    t.assets.length > 0 ? `asset ${t.assets.join(', ')}` : '',
  ].filter((p) => p !== '');
  return parts.length > 0 ? parts.join('; ') : 'nothing';
}

function roundLine(r: FixRound): string {
  const parts = [`round ${String(r.n)} -> cut ${String(r.cut)}: ${r.kind}`];
  if (r.intake !== null) {
    parts.push(`intake again: template ${r.intake.template}, fit ${r.intake.fit}`);
  }
  if (r.patch !== null) {
    parts.push(
      `template patch (history ${String(r.patch.k)}), checkpoints from ${r.patch.from} deleted (${String(r.patch.deleted.length)} files)`,
    );
    if (r.patch.reverted) {
      parts.push(
        `patch reverted: ${r.patch.kept === false ? 'the next cut was not better' : 'the next cut was never reviewed'}`,
      );
    } else if (r.patch.kept === false) {
      parts.push('the next cut was not better, but a later patch builds on this one: not reverted');
    }
  }
  if (r.drops_rounds.length > 0) {
    parts.push(`drops the changes of round ${r.drops_rounds.join(', ')}`);
  }
  for (const p of r.rejected_patches) parts.push(`patch rejected (${p.reason})`);
  if (r.changed !== null) parts.push(`changed: ${targets(r.changed)}`);
  if (r.unchanged !== null && targets(r.unchanged) !== 'nothing') {
    parts.push(`noted but unchanged: ${targets(r.unchanged)}`);
  }
  if (r.ignored_notes.length > 0) parts.push(`notes not passed on: ${r.ignored_notes.join(', ')}`);
  if (r.voice !== null) parts.push(`voice ${r.voice.from} -> ${r.voice.to}`);
  return parts.join('; ');
}

/** Renders the human summary of run.json. */
export function renderReport(run: RunRecord): string {
  const out: string[] = [];
  const selected = run.cuts.find((c) => c.n === run.selected?.cut);
  out.push(`# Report ${run.id}`, '', `Request: ${run.request.request}`, '');

  const flags: string[] = [];
  if (run.intake?.fit === 'none') flags.push(`fit: none (${run.intake.reason})`);
  for (const c of run.cuts) {
    const why = c.review?.wrong_template;
    if (why !== undefined)
      flags.push(`wrong template ${c.template} (review of cut ${String(c.n)}): ${why}`);
  }
  for (const r of run.rounds) {
    if (r.intake?.fit === 'none')
      flags.push(`fit: none after intake round ${String(r.n)} (${r.intake.reason})`);
  }
  for (const c of run.sync_conflicts) flags.push(`sync conflict: ${c}`);
  if (run.status === 'failed') flags.push(`job failed: ${run.error ?? 'no error recorded'}`);
  if (run.selected === null) flags.push('no cut was produced');
  else if (!run.approved) flags.push('not approved');
  if (flags.length > 0) out.push('## Flags', '', ...flags.map((f) => `- ${f}`), '');

  out.push('## Selected cut', '');
  if (run.selected === null || selected === undefined) {
    out.push('None.', '');
  } else {
    out.push(
      `Cut ${String(selected.n)} of ${String(run.cuts.length)} (${run.approved ? 'approved' : 'not approved'}).`,
      `Why: ${run.selected.why}`,
      `Template: ${selected.template} @ ${selected.template_sha}, voice: ${selected.voice_model}, film ${secs(selected.film_s)}.`,
      `Folder: ${selected.dir}`,
      '',
    );
    if (selected.review !== null) out.push(`Review: ${selected.review.summary}`, '');
  }
  if (run.loop_end !== '') out.push(`Loop: ${run.loop_end}`, '');

  if (run.intake !== null) {
    const i = run.intake;
    // the model's sentences usually end in a period already
    const bare = (t: string): string => t.replace(/\.$/, '');
    const subject = i.subject === '' ? '' : ` Subject: ${bare(i.subject)} (${i.subject_kind}).`;
    out.push(
      '## Intake',
      '',
      `Template ${i.template}, fit ${i.fit} (${bare(i.reason)}).${subject} Audience: ${bare(i.audience)}. Goal: ${bare(i.goal)}. Tone: ${bare(i.tone)}. Target ${String(i.seconds)} s.`,
      '',
    );
  }

  out.push(
    '## Cuts',
    '',
    '| cut | template | voice | score | blocking FAILs | fact errors | approved | film | wall | cost |',
    '|---|---|---|---|---|---|---|---|---|---|',
  );
  for (const c of run.cuts) {
    const sum = scoreSum(c);
    const approved = c.review === null ? '-' : isApproved(c) ? 'yes' : 'no';
    out.push(
      `| ${String(c.n)} | ${c.template} | ${c.voice_model} | ${sum === null ? '-' : String(sum)} | ${String(blockingFails(c))} | ${c.review === null ? '-' : String(factErrors(c).length)} | ${approved} | ${secs(c.film_s)} | ${secs(c.wall_s)} | ${money(engineUsd(c))} |`,
    );
  }
  out.push('');

  if (run.rounds.length > 0) {
    out.push('## Fix rounds', '', ...run.rounds.map((r) => `- ${roundLine(r)}`), '');
  }

  const wrong: string[] = [];
  if (run.status === 'failed') wrong.push(`job failed: ${run.error ?? 'no error recorded'}`);
  if (selected !== undefined) {
    if (selected.review !== null) {
      const s = selected.review.scores;
      out.push(
        '## Scores (selected cut)',
        '',
        `hook ${String(s.hook)}, clarity ${String(s.clarity)}, visual ${String(s.visual)}, pacing ${String(s.pacing)}, audio ${String(s.audio)}, fit ${String(s.fit)}`,
        '',
      );
    }
    out.push('## Gates (selected cut)', '');
    for (const g of selected.gates) {
      out.push(
        `- ${g.pass ? 'PASS' : 'FAIL'} ${g.name} [${g.mode}]: ${gateValue(g.value)} (threshold ${String(g.threshold)})`,
      );
    }
    out.push('');

    for (const g of selected.gates) if (!g.pass) wrong.push(`gate ${g.name} fails (${g.mode})`);
    for (const f of factErrors(selected)) wrong.push(`fact error: ${f}`);
    // Rejections the engine later fixed are not wrong any more; only steps it shipped failing are (all stay in run.json).
    for (const s of selected.shipped_failing) {
      const since = s.cut === selected.n ? '' : ` (unchanged since cut ${String(s.cut)})`;
      wrong.push(`shipped failing: ${s.step}: ${s.reason}${since}`);
    }
    if (selected.review !== null && !run.approved) {
      const n = selected.review.notes;
      for (const [shot, text] of Object.entries(n.shots ?? {})) wrong.push(`shot ${shot}: ${text}`);
      for (const [id, text] of Object.entries(n.assets ?? {})) wrong.push(`asset ${id}: ${text}`);
      for (const shot of Object.keys(n.lines ?? {})) wrong.push(`shot ${shot}: lines to change`);
      for (const p of selected.review.template_patch ?? []) {
        wrong.push(`template ${p.section} (${p.op}): ${p.reason}`);
      }
    }
  }
  out.push(
    '## Still wrong',
    '',
    ...(wrong.length > 0 ? wrong.map((w) => `- ${w}`) : ['Nothing recorded.']),
    '',
  );
  if (selected !== undefined) {
    out.push(
      `The engine's validators rejected ${String(selected.engine_rejections.filter((r) => !r.startsWith('shipped failing:')).length)} attempt(s) while building this cut; the list is in run.json.`,
      '',
    );
  }

  if (run.voice_switches.length > 0) {
    out.push(
      '## Voice switches',
      '',
      ...run.voice_switches.map(
        (v) => `- cut ${String(v.cut)}: ${v.from} -> ${v.to} (${v.reason})`,
      ),
      '',
    );
  }

  if (selected !== undefined && selected.credits.trim() !== '') {
    out.push('## Credits', '', selected.credits.trim(), '');
  }

  const engine = run.cuts.reduce((a, c) => a + engineUsd(c), 0);
  const harness = run.harness_calls.reduce((a, h) => a + h.usd, 0);
  out.push(
    '## Cost and time',
    '',
    `Total ${money(run.totals.usd)} (engine ${money(engine)}, harness ${money(harness)}), wall ${secs(run.totals.wall_s)}.`,
    `${String(run.totals.cuts)} cut(s), ${String(run.totals.harness_calls)} harness call(s), git ${run.git_commit}.`,
    '',
  );
  return out.join('\n');
}

export async function writeReport(varDir: string, run: RunRecord): Promise<string> {
  const text = renderReport(run);
  await writeFile(join(runDir(varDir, run.id), 'report.md'), text);
  return text;
}

/** The intake cut n was made under: the last intake round before it, else the job's intake. */
export function intakeOf(run: Pick<RunRecord, 'intake' | 'rounds'>, n: number): Intake | null {
  return run.rounds.filter((r) => r.intake !== null && r.cut <= n).at(-1)?.intake ?? run.intake;
}

export function indexLineOf(run: RunRecord): IndexLine {
  const selected = run.cuts.find((c) => c.n === run.selected?.cut);
  // an intake round can change the template: the line names the selected cut's
  const intake = selected === undefined ? run.intake : intakeOf(run, selected.n);
  return {
    id: run.id,
    date: run.finished,
    template: intake?.template ?? null,
    sha: selected?.template_sha ?? null,
    fit: intake?.fit ?? null,
    cuts: run.cuts.length,
    selected: run.selected?.cut ?? null,
    approved: run.approved,
    blocking_fails: selected === undefined ? null : blockingFails(selected),
    cost_usd: run.totals.usd,
    wall_s: run.totals.wall_s,
  };
}

/** Appends the finished job to `runs/index.jsonl` unless its id is already there; returns whether a line was added. */
export async function appendIndex(varDir: string, run: RunRecord): Promise<boolean> {
  const path = join(varDir, 'runs', 'index.jsonl');
  let existing = '';
  try {
    existing = await readFile(path, 'utf8');
  } catch (err) {
    if (!hasCode(err, 'ENOENT')) throw err;
  }
  const seen = existing
    .split('\n')
    .filter((l) => l !== '')
    .some((l) => IndexLine.parse(JSON.parse(l)).id === run.id);
  if (seen) return false;
  await appendFile(path, `${JSON.stringify(indexLineOf(run))}\n`);
  return true;
}
