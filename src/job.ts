import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Config, VoiceModelKey } from './config.ts';
import { runCut, type CutResult } from './engine.ts';
import { basicGates } from './gates/basic.ts';
import { runIntake } from './intake.ts';
import type { M3Request, M3Result } from './minimax.ts';
import {
  appendEvent,
  appendIndex,
  createJob,
  runDir,
  setJobStage,
  setJobStatus,
  writeReport,
  writeRunRecord,
  type CutRecord,
  type HarnessCall,
  type Intake,
  type JobRequest,
  type RunRecord,
  type VoiceSwitch,
} from './record.ts';
import { reviewCut } from './review.ts';

const repoRoot = path.resolve(import.meta.dirname, '..');

export interface JobOptions {
  config: Config;
  request: JobRequest;
  m3: (req: M3Request) => Promise<M3Result>;
  /** Template folder for the engine, intake and review. Until #11 it is `templates/`. */
  templatesDir?: string;
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

function blockingFails(cut: CutRecord): number {
  return cut.gates.filter((g) => g.mode === 'block' && !g.pass).length;
}

/** Approved means the review approved and no blocking gate FAILs (design §6.5); a re-asked approve is not enough. */
function isApproved(cut: CutRecord): boolean {
  return cut.review?.approve === true && blockingFails(cut) === 0;
}

function describe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * One job with a single cut and no fix loop (design §6.1): intake, cut 1 (voice fallback on a refusal), gates,
 * review, selection, then run.json, report.md and an index line. A failed job gets the same record and report.
 * Returns the finished record; the job folder is `runDir(varDir, record.id)`.
 */
export async function runJob(options: JobOptions): Promise<RunRecord> {
  const { config, m3 } = options;
  const varDir = config.varDir;
  const templatesDir = options.templatesDir ?? path.join(repoRoot, 'templates');
  const log = options.log ?? (() => undefined);
  const t0 = Date.now();
  const job = await createJob(varDir, options.request);
  const id = job.id;
  const dir = runDir(varDir, id);
  const started = (await setJobStatus(varDir, id, 'running', { stage: 'intake' })).started ?? '';
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
  const switches: VoiceSwitch[] = [];
  let error: string | null = null;

  try {
    await event('intake', 'job.start', { request: options.request });
    const result = await runIntake({
      request: options.request.request,
      template: options.request.template,
      seconds: options.request.seconds,
      templatesDir,
      m3: counted,
    });
    intake = result.intake;
    const briefFile = path.join(dir, 'brief.txt');
    await writeFile(briefFile, result.brief);
    await event('intake', 'intake.done', intake);
    log(`intake: ${intake.template} (fit ${intake.fit}), ${String(intake.seconds)} s`);

    const templateFile = path.join(templatesDir, `${intake.template}.md`);
    const templateSha = createHash('sha256')
      .update(await readFile(templateFile))
      .digest('hex');

    // cut 1, with the voice fallback of design §6.7 (trigger 1: the engine's voice refusal; not a fix round)
    await stage('cut-1');
    const refusals: Refusal[] = [];
    let cut: CutResult | null = null;
    let voice = 0;
    while (cut === null) {
      const model = config.voiceModels[voice];
      if (model === undefined) {
        throw new Error(
          `every voice model was refused: ${refusals.map((r) => `${r.model} (HTTP ${String(r.status)}: ${r.message})`).join('; ')}`,
        );
      }
      await event('engine', 'engine.start', { cut: 1, voice_model: model });
      log(`engine: cut 1 with voice ${model}`);
      const run = await runCut({
        config,
        runDir: dir,
        briefFile,
        template: intake.template,
        seconds: intake.seconds,
        cut: 1,
        voiceModel: model,
        env: { CUTROOM_TEMPLATE_DIR: templatesDir, ...options.engineEnv },
      });
      if (run.kind === 'voice_refused') {
        refusals.push(run);
        const next = config.voiceModels[voice + 1];
        await event('engine', 'voice.refused', run);
        if (next !== undefined) {
          const sw = {
            cut: 1,
            from: model,
            to: next,
            reason: `HTTP ${String(run.status)}: ${run.message}`,
          };
          switches.push(sw);
          await event('engine', 'voice.switch', sw);
          log(`voice ${model} refused (HTTP ${String(run.status)}); trying ${next}`);
        }
        voice++;
        continue;
      }
      cut = run;
    }
    const voiceKey = config.voiceModels[voice];
    await event('engine', 'engine.end', {
      cut: 1,
      voice_model: voiceKey,
      voice_model_id: cut.voiceModelId,
      film_s: cut.filmS,
      wall_s: cut.wallS,
      usd: cut.totalUsd,
    });

    const record: CutRecord = {
      n: 1,
      dir: cut.dir,
      template: intake.template,
      template_sha: templateSha,
      voice_model: `${voiceKey ?? 'unknown'} (${cut.voiceModelId})`,
      film_s: cut.filmS,
      wall_s: cut.wallS,
      engine_cost: cut.cost,
      gates: [],
      review: null,
      notes_applied: null,
      patch_applied: null,
      engine_rejections: [
        ...cut.failingSteps.map((f) => `shipped failing: ${f.step}: ${f.reason}`),
        ...cut.rejections,
      ],
      credits: await readFile(cut.creditsPath, 'utf8'),
    };
    cuts.push(record);

    await stage('gates');
    record.gates = await basicGates(cut);
    await event('gates', 'gates.done', record.gates);
    log(`gates: ${record.gates.map((g) => `${g.name} ${g.pass ? 'pass' : 'FAIL'}`).join(', ')}`);

    await stage('review-1');
    const reviewed = await reviewCut({
      cut,
      gates: record.gates,
      templatesDir,
      template: intake.template,
      outDir: dir,
      m3: counted,
    });
    record.review = reviewed.review;
    await event('review', 'review.done', {
      cut: 1,
      approve: reviewed.review.approve,
      reasked: reviewed.reasked,
      scores: reviewed.review.scores,
      summary: reviewed.review.summary,
    });
    log(`review: ${reviewed.review.approve ? 'approve' : 'fixes wanted'}`);
  } catch (e) {
    error = describe(e);
    await event('error', 'job.error', { error });
    log(`error: ${error}`);
  }

  // One cut, so it is the selection when it exists (§6.5); the fix loop (#11) will rank several.
  const chosen = cuts[0];
  const approved = chosen !== undefined && isApproved(chosen);
  const fails = chosen === undefined ? 0 : blockingFails(chosen);
  const finished = new Date();
  const harnessUsd = calls.reduce((a, c) => a + c.usd, 0);
  const engineUsd = cuts.reduce(
    (a, c) => a + Object.values(c.engine_cost).reduce((b, p) => b + p.usd, 0),
    0,
  );
  const run: RunRecord = {
    id,
    request: options.request,
    intake,
    git_commit: gitCommit(),
    sync_conflicts: [],
    cuts,
    voice_switches: switches,
    harness_calls: calls,
    selected:
      chosen === undefined
        ? null
        : {
            cut: chosen.n,
            why: approved
              ? 'approved by the review with no blocking gate FAIL'
              : `the only cut (no fix loop yet): ${fails === 0 ? 'no blocking gate FAIL' : `${String(fails)} blocking gate FAIL(s)`}, ${chosen.review === null ? 'not reviewed' : chosen.review.approve ? 'review approve overruled by the gates' : 'review wants fixes'}`,
          },
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
