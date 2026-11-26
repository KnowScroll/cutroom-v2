import { spawn, spawnSync } from 'node:child_process';
import { closeSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { Config, VoiceModelKey } from './config.ts';
import type { PhaseCost } from './record.ts';

export interface RunCutOptions {
  config: Pick<Config, 'varDir' | 'engineEntry'>;
  runDir: string;
  briefFile: string;
  template: string;
  seconds: number;
  cut: number;
  notesFile?: string;
  voiceModel: VoiceModelKey;
  /** Extra environment for the engine process (tests drive the fake engine with it). */
  env?: Readonly<Record<string, string>>;
}

export interface FailingStep {
  step: string;
  reason: string;
}

export interface CutResult {
  kind: 'cut';
  cut: number;
  dir: string;
  reelPath: string;
  workDir: string;
  logPath: string;
  summaryPath: string;
  creditsPath: string;
  /** Voice model id as the engine reports it (e.g. `heygen/heygen-voice-1-turbo:free`). */
  voiceModelId: string;
  filmS: number;
  wallS: number;
  minimaxCalls: number;
  tokens: { input: number; cached: number; output: number };
  totalUsd: number;
  /** Cost by top-level phase from reel-cost.txt, plus `voice` and `music` from the summary. */
  cost: Record<string, PhaseCost>;
  shots: { start: number; dur: number; background: string | undefined }[];
  audio: AudioNumbers;
  /** Log lines with `rejected:`, without the timestamp. */
  rejections: string[];
  /** Steps the engine shipped although no attempt passed every check ("using the last one that runs"). */
  failingSteps: FailingStep[];
}

export interface VoiceRefused {
  kind: 'voice_refused';
  model: VoiceModelKey;
  status: number;
  message: string;
}

export interface AudioNumbers {
  wordsPerS: number;
  pitchStSd: number;
  pitchRangeSt: number;
  loudRangeDb: number;
  musicSource: string;
  musicFitPass: boolean | null;
  voiceOverMusicDb: number | null;
  musicInGapsDb: number | null;
  integratedLufs: number | null;
  mixPass: boolean | null;
}

const Summary = z.object({
  film_s: z.number(),
  wall_s: z.number(),
  voice_model: z.string(),
  minimax_calls: z.number(),
  input_tokens: z.number(),
  cached_tokens: z.number(),
  output_tokens: z.number(),
  llm_usd: z.number(),
  speech_usd: z.number(),
  music_usd: z.number(),
});

const Timeline = z.object({
  total: z.number(),
  shots: z.array(
    z.object({ start: z.number(), dur: z.number(), background: z.string().optional() }),
  ),
});

const AudioJson = z.object({
  voice: z.object({
    words_per_s: z.number(),
    pitch_st_sd: z.number(),
    pitch_range_st: z.number(),
    loud_range_db: z.number(),
  }),
  music: z.object({
    source: z.string(),
    fit: z.object({ pass: z.boolean() }).nullish(),
  }),
  mix: z
    .object({
      voice_over_music_db: z.number().nullish(),
      music_in_gaps_db: z.number().nullish(),
      integrated_lufs: z.number().nullish(),
      pass: z.boolean().nullish(),
    })
    .nullish(),
});

const LockFile = z.object({
  harness_pid: z.number().int(),
  engine_pid: z.number().int().nullable(),
  started_at: z.string(),
});
type LockFile = z.infer<typeof LockFile>;

export class EngineBusyError extends Error {}
export class EngineCrashError extends Error {}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM: the process exists but is not ours.
    return e instanceof Error && 'code' in e && e.code === 'EPERM';
  }
}

/** Stop a process and everything it started (the engine starts Chrome). Only ever called with a pid we started or the lock recorded. */
export function killTree(pid: number): void {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    // The group is already gone (ESRCH); nothing left to stop.
  }
}

async function waitGone(pid: number): Promise<void> {
  for (let i = 0; i < 100 && pidAlive(pid); i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (pidAlive(pid)) throw new Error(`engine pid ${String(pid)} did not stop`);
}

function readLock(file: string): LockFile | null {
  try {
    return LockFile.parse(JSON.parse(readFileSync(file, 'utf8')));
  } catch {
    return null;
  }
}

function removeLock(file: string): void {
  try {
    unlinkSync(file);
  } catch {
    // Already removed.
  }
}

/** Take var/engine.lock (design §8). Stale means the engine pid is gone; a live engine whose harness is dead is stopped first. */
async function acquireLock(file: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const mine: LockFile = {
    harness_pid: process.pid,
    engine_pid: null,
    started_at: new Date().toISOString(),
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      writeFileSync(file, JSON.stringify(mine), { flag: 'wx' });
      return;
    } catch (e) {
      if (!(e instanceof Error && 'code' in e && e.code === 'EEXIST')) throw e;
    }
    const held = readLock(file);
    if (held === null) {
      removeLock(file);
      continue;
    }
    const engineAlive = held.engine_pid !== null && pidAlive(held.engine_pid);
    const harnessAlive = held.harness_pid !== process.pid ? pidAlive(held.harness_pid) : true;
    if (held.engine_pid !== null && !engineAlive) {
      removeLock(file);
    } else if (held.engine_pid === null && !harnessAlive) {
      removeLock(file);
    } else if (held.engine_pid !== null && !harnessAlive) {
      killTree(held.engine_pid);
      await waitGone(held.engine_pid);
      removeLock(file);
    } else {
      throw new EngineBusyError(
        `engine busy: harness pid ${String(held.harness_pid)} since ${held.started_at}`,
      );
    }
  }
  throw new EngineBusyError('engine lock could not be taken');
}

function recordEnginePid(file: string, pid: number | null): void {
  const held = readLock(file);
  if (held === null || held.harness_pid !== process.pid) return;
  writeFileSync(file, JSON.stringify({ ...held, engine_pid: pid }));
}

interface Attempt {
  code: number | null;
}

function runEngineOnce(
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  logPath: string,
  lockFile: string,
): Promise<Attempt> {
  const fd = openSync(logPath, 'a');
  return new Promise<Attempt>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env,
      stdio: ['ignore', fd, fd],
      detached: process.platform !== 'win32',
      windowsHide: true,
    });
    const stop = (signal: NodeJS.Signals): void => {
      if (child.pid !== undefined) killTree(child.pid);
      removeLock(lockFile);
      process.exit(signal === 'SIGINT' ? 130 : 143);
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    const done = (): void => {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
      closeSync(fd);
    };
    child.once('error', (e) => {
      done();
      reject(e);
    });
    child.once('close', (code) => {
      recordEnginePid(lockFile, null);
      done();
      resolve({ code });
    });
    if (child.pid !== undefined) recordEnginePid(lockFile, child.pid);
  });
}

const REFUSAL =
  /FAILED: (?:Error: )?(?:OpenRouter|ElevenLabs) speech (\S+) HTTP (4\d\d)(?::[ \t]*([^\n]*))?/;

function stripStamp(line: string): string {
  return line.replace(/^\[\s*[\d.]+s\]\s*/, '');
}

function tail(text: string, n = 20): string {
  return text.trimEnd().split('\n').slice(-n).join('\n');
}

/** Phase rows of reel-cost.txt: unindented rows between the header and TOTAL. Tokens are the row's input and output columns. */
function parseCost(text: string): Record<string, PhaseCost> {
  const out: Record<string, PhaseCost> = {};
  for (const line of text.split('\n')) {
    if (line.startsWith('TOTAL')) break;
    const m =
      /^(\S.*?)\s{2,}\d+\s+([\d,]+)\s+[\d,]+\s+([\d,]+)\s+[\d,]+\s+\$([\d.]+)\s+\d+s\s*$/.exec(
        line,
      );
    const name = m?.[1];
    if (m === null || name === undefined || name === 'phase') continue;
    const num = (s: string | undefined): number => Number((s ?? '0').replaceAll(',', ''));
    out[name] = { usd: num(m[4]), tokens_in: num(m[2]), tokens_out: num(m[3]) };
  }
  return out;
}

export function parseLog(log: string): { rejections: string[]; failingSteps: FailingStep[] } {
  const rejections: string[] = [];
  const failingSteps: FailingStep[] = [];
  for (const raw of log.split('\n')) {
    const line = stripStamp(raw.trimEnd());
    const last =
      /^(\S+): no attempt passed every check; using the last one that runs \(it failed: (.*)\)$/.exec(
        line,
      );
    if (last?.[1] !== undefined && last[2] !== undefined) {
      failingSteps.push({ step: last[1], reason: last[2] });
    } else if (line.includes(': rejected:')) {
      rejections.push(line);
    }
  }
  return { rejections, failingSteps };
}

async function readJson<S extends z.ZodType>(file: string, schema: S): Promise<z.infer<S>> {
  const parsed = schema.safeParse(JSON.parse(await readFile(file, 'utf8')));
  if (!parsed.success) throw new Error(`${file}: ${parsed.error.message}`);
  return parsed.data;
}

/** Read what the engine wrote for one cut. `summaryCopy` is where reel-summary.json is copied to. */
export async function parseOutputs(
  runDir: string,
  cut: number,
  logPath: string,
): Promise<CutResult> {
  const dir = path.join(runDir, `reel-v${String(cut)}`);
  const summarySrc = path.join(runDir, 'reel-summary.json');
  const summaryPath = path.join(runDir, `reel-summary-${String(cut)}.json`);
  await copyFile(summarySrc, summaryPath);
  const summary = await readJson(summaryPath, Summary);
  const timeline = await readJson(path.join(dir, 'timeline.json'), Timeline);
  const audio = await readJson(path.join(dir, 'audio.json'), AudioJson);
  const cost = parseCost(await readFile(path.join(runDir, 'reel-cost.txt'), 'utf8'));
  cost['voice'] = { usd: summary.speech_usd, tokens_in: 0, tokens_out: 0 };
  cost['music'] = { usd: summary.music_usd, tokens_in: 0, tokens_out: 0 };
  const { rejections, failingSteps } = parseLog(await readFile(logPath, 'utf8'));
  return {
    kind: 'cut',
    cut,
    dir,
    reelPath: path.join(dir, 'reel.mp4'),
    workDir: path.join(runDir, 'reel-work'),
    logPath,
    summaryPath,
    creditsPath: path.join(dir, 'CREDITS.md'),
    voiceModelId: summary.voice_model,
    filmS: timeline.total,
    wallS: summary.wall_s,
    minimaxCalls: summary.minimax_calls,
    tokens: {
      input: summary.input_tokens,
      cached: summary.cached_tokens,
      output: summary.output_tokens,
    },
    totalUsd: summary.llm_usd + summary.speech_usd + summary.music_usd,
    cost,
    shots: timeline.shots.map((s) => ({ start: s.start, dur: s.dur, background: s.background })),
    audio: {
      wordsPerS: audio.voice.words_per_s,
      pitchStSd: audio.voice.pitch_st_sd,
      pitchRangeSt: audio.voice.pitch_range_st,
      loudRangeDb: audio.voice.loud_range_db,
      musicSource: audio.music.source,
      musicFitPass: audio.music.fit?.pass ?? null,
      voiceOverMusicDb: audio.mix?.voice_over_music_db ?? null,
      musicInGapsDb: audio.mix?.music_in_gaps_db ?? null,
      integratedLufs: audio.mix?.integrated_lufs ?? null,
      mixPass: audio.mix?.pass ?? null,
    },
    rejections,
    failingSteps,
  };
}

/**
 * Run the engine for one cut under var/engine.lock. A voice refusal returns `VoiceRefused` (no rerun); any other
 * non-zero exit reruns the same command once (the engine resumes); a second failure throws with the log tail.
 */
export async function runCut(opts: RunCutOptions): Promise<CutResult | VoiceRefused> {
  const { config, runDir, cut } = opts;
  const lockFile = path.join(config.varDir, 'engine.lock');
  const logPath = path.join(runDir, `engine-${String(cut)}.log`);
  const args = [
    config.engineEntry,
    '--brief-file',
    opts.briefFile,
    '--template',
    opts.template,
    '--seconds',
    String(opts.seconds),
    '--rounds',
    '0',
    '--out',
    path.join(runDir, 'reel'),
    '--voice-model',
    opts.voiceModel,
  ];
  // Until #9 lands the engine has no --cut / --apply-notes; cut 1 is its default.
  if (cut !== 1) args.push('--cut', String(cut));
  if (opts.notesFile !== undefined) args.push('--apply-notes', opts.notesFile);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CUTROOM_VAR: config.varDir,
    CUTROOM_TEMPLATE_DIR: path.join(config.varDir, 'templates'),
    ...opts.env,
  };

  await mkdir(runDir, { recursive: true });
  await acquireLock(lockFile);
  try {
    for (let attempt = 1; ; attempt++) {
      const before = (() => {
        try {
          return statSync(logPath).size;
        } catch {
          return 0;
        }
      })();
      const { code } = await runEngineOnce(args, env, logPath, lockFile);
      const thisRun = readFileSync(logPath, 'utf8').slice(before);
      if (code === 0) return await parseOutputs(runDir, cut, logPath);
      const refusal = REFUSAL.exec(thisRun);
      if (refusal?.[2] !== undefined) {
        return {
          kind: 'voice_refused',
          model: opts.voiceModel,
          status: Number(refusal[2]),
          message: (refusal[3] ?? '').trim(),
        };
      }
      if (attempt === 2) {
        throw new EngineCrashError(
          `engine exited with code ${String(code)} twice; log tail of ${logPath}:\n${tail(thisRun)}`,
        );
      }
    }
  } finally {
    removeLock(lockFile);
  }
}
