import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

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
});
export type Review = z.infer<typeof Review>;

export const PhaseCost = z.object({
  usd: NonNegative,
  tokens_in: NonNegative,
  tokens_out: NonNegative,
});
export type PhaseCost = z.infer<typeof PhaseCost>;

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

export const RunRecord = z.object({
  id: z.string(),
  request: JobRequest,
  intake: Intake.nullable(),
  git_commit: z.string(),
  sync_conflicts: z.array(z.string()),
  cuts: z.array(CutRecord),
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
  await rename(tmp, path);
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
  };
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

export async function writeRunRecord(varDir: string, run: RunRecord): Promise<void> {
  await writeJson(join(runDir(varDir, run.id), 'run.json'), RunRecord.parse(run));
}

export async function readRunRecord(varDir: string, id: string): Promise<RunRecord> {
  return RunRecord.parse(await readJson(join(runDir(varDir, id), 'run.json')));
}

function blockingFails(cut: CutRecord): number {
  return cut.gates.filter((g) => g.mode === 'block' && !g.pass).length;
}

function scoreSum(cut: CutRecord): number | null {
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

/** Renders the human summary of run.json. */
export function renderReport(run: RunRecord): string {
  const out: string[] = [];
  const selected = run.cuts.find((c) => c.n === run.selected?.cut);
  out.push(`# Report ${run.id}`, '', `Request: ${run.request.request}`, '');

  const flags: string[] = [];
  if (run.intake?.fit === 'none') flags.push(`fit: none (${run.intake.reason})`);
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

  if (run.intake !== null) {
    const i = run.intake;
    out.push(
      '## Intake',
      '',
      `Template ${i.template}, fit ${i.fit} (${i.reason}). Audience: ${i.audience}. Goal: ${i.goal}. Tone: ${i.tone}. Target ${String(i.seconds)} s.`,
      '',
    );
  }

  out.push(
    '## Cuts',
    '',
    '| cut | voice | score | blocking FAILs | approved | film | wall | cost |',
    '|---|---|---|---|---|---|---|---|',
  );
  for (const c of run.cuts) {
    const sum = scoreSum(c);
    const approved = c.review === null ? '-' : c.review.approve ? 'yes' : 'no';
    out.push(
      `| ${String(c.n)} | ${c.voice_model} | ${sum === null ? '-' : String(sum)} | ${String(blockingFails(c))} | ${approved} | ${secs(c.film_s)} | ${secs(c.wall_s)} | ${money(engineUsd(c))} |`,
    );
  }
  out.push('');

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
    for (const r of selected.engine_rejections) wrong.push(`engine rejection: ${r}`);
    if (selected.review !== null && !selected.review.approve) {
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

export function indexLineOf(run: RunRecord): IndexLine {
  const selected = run.cuts.find((c) => c.n === run.selected?.cut);
  return {
    id: run.id,
    date: run.finished,
    template: run.intake?.template ?? null,
    sha: selected?.template_sha ?? null,
    fit: run.intake?.fit ?? null,
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
