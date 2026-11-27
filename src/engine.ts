import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  closeSync,
  linkSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { Config, VoiceModelKey } from './config.ts';
import { PRICE } from './minimax.ts';
import { pidAlive, renameWithRetry } from './proc.ts';
import type { PhaseCost } from './record.ts';

const repoRoot = path.resolve(import.meta.dirname, '..');

export interface RunCutOptions {
  config: Pick<Config, 'varDir' | 'engineEntry'>;
  runDir: string;
  briefFile: string;
  template: string;
  seconds: number;
  cut: number;
  notesFile?: string;
  voiceModel: VoiceModelKey;
  /** What earlier invocations of this cut already spent (a refused voice); folded into the result. */
  earlier?: Spent;
  /** Extra environment for the engine process (tests drive the fake engine with it). */
  env?: Readonly<Record<string, string>>;
}

/** Cost and time of engine invocations that stopped before the cut was written (they paid for their steps). */
export interface Spent {
  usd: number;
  tokensIn: number;
  tokensOut: number;
  wallS: number;
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
  /** Log lines where a validator rejected something (`rejected:`, `craft pass rejected (`), without the timestamp. */
  rejections: string[];
  /** Steps the engine shipped although no attempt passed every check ("using the last one that runs"). */
  failingSteps: FailingStep[];
}

export interface VoiceRefused {
  kind: 'voice_refused';
  model: VoiceModelKey;
  status: number;
  message: string;
  /** Everything spent on this cut so far, this invocation included. */
  spent: Spent;
}

export interface AudioNumbers {
  wordsPerS: number | null;
  pitchStSd: number | null;
  pitchRangeSt: number | null;
  loudRangeDb: number | null;
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
  voice: z
    .object({
      words_per_s: z.number().nullish(),
      // null when the engine measured too little voiced audio; the voice_pitch gate fails it later.
      pitch_st_sd: z.number().nullish(),
      pitch_range_st: z.number().nullish(),
      loud_range_db: z.number().nullish(),
    })
    // null when the reel has no voiced lines; the gates fail it later.
    .nullish(),
  music: z.object({
    source: z.string(),
    fit: z.object({ pass: z.boolean().nullable() }).nullish(),
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
  token: z.string().optional(),
});
type LockFile = z.infer<typeof LockFile>;

export class EngineBusyError extends Error {}
/** Another live harness holds engine.lock: the caller waits and tries again (design §8). */
export class EngineLockedError extends EngineBusyError {
  holderPid: number;
  constructor(message: string, holderPid: number) {
    super(message);
    this.holderPid = holderPid;
  }
}
export class EngineCrashError extends Error {
  spent: Spent = { usd: 0, tokensIn: 0, tokensOut: 0, wallS: 0 };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function errCode(e: unknown): string | undefined {
  return e instanceof Error && 'code' in e && typeof e.code === 'string' ? e.code : undefined;
}

/**
 * Stop a process and everything it started. Only ever called with a pid we started or the lock recorded.
 * Linux: SIGTERM the engine's group first (the engine's handlers stop Chrome, which puppeteer launches in a group of
 * its own, so a SIGKILL to our group would leave it running), wait for the engine, then SIGKILL what is left.
 */
export async function killTree(pid: number): Promise<void> {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    return; // the group is already gone (ESRCH)
  }
  for (let i = 0; i < 60 && pidAlive(pid); i++) await sleep(50);
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    // Nothing left in the group.
  }
}

async function waitGone(pid: number): Promise<void> {
  for (let i = 0; i < 100 && pidAlive(pid); i++) await sleep(50);
  if (pidAlive(pid)) throw new Error(`engine pid ${String(pid)} did not stop`);
}

/**
 * Create the lock file only if absent. Not `link` + removing a temp file: on Windows a file made that way refuses a
 * rename over it (EPERM) for up to ~1.3 s (measured under load); a file written in place does not. The file is briefly
 * empty or partial, which `readLock` waits out.
 */
function createExclusive(file: string, content: string): void {
  writeFileSync(file, content, { flag: 'wx' });
}

/** Write a temp file, then publish it whole: `link` creates the target only if absent, `rename` replaces it. */
function publish(
  file: string,
  content: string,
  mode: 'link' | 'rename',
  owned?: () => boolean,
): void {
  const tmp = `${file}.${String(process.pid)}.${randomUUID()}.tmp`;
  writeFileSync(tmp, content);
  try {
    if (mode === 'link') linkSync(tmp, file);
    else
      renameWithRetry(tmp, file, () => {
        if (owned !== undefined && !owned()) throw new EngineBusyError('engine lock lost');
      });
  } finally {
    rmSync(tmp, { force: true });
  }
}

function safeText(file: string): string {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** null: no lock. An unreadable lock is never deleted automatically. */
function readLock(file: string): LockFile | null {
  let parsed: ReturnType<typeof LockFile.safeParse> | undefined;
  // A lock being created is empty or partial for an instant; only a lock that stays bad is unreadable.
  for (let i = 0; i < 20 && parsed?.success !== true; i++) {
    if (i > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    try {
      parsed = LockFile.safeParse(safeJson(readFileSync(file, 'utf8')));
    } catch (e) {
      if (errCode(e) === 'ENOENT') return null;
      throw e;
    }
  }
  if (parsed?.success !== true) {
    throw new EngineBusyError(`${file} is unreadable; check it and remove it by hand`);
  }
  return parsed.data;
}

interface Held {
  file: string;
  token: string;
}

/** Only the owner (matching token) releases its lock. */
function release(held: Held): void {
  heldHere.delete(held.token);
  try {
    if (readLock(held.file)?.token === held.token) rmSync(held.file, { force: true });
  } catch {
    // Unreadable or gone: not ours to delete.
  }
}

function recordEnginePid(held: Held, pid: number | null): void {
  const owned = (): boolean => readLock(held.file)?.token === held.token;
  const lock = readLock(held.file);
  if (lock?.token !== held.token) throw new EngineBusyError('engine lock lost');
  publish(held.file, JSON.stringify({ ...lock, engine_pid: pid }), 'rename', owned);
}

// Tokens of the locks this process holds. A lock naming our own pid under another token is a dead process's (pid reuse).
const heldHere = new Set<string>();

/** busy: a live harness holds it, whatever the engine pid says. Else orphan (a live engine) or stale (nothing runs). */
function judge(lock: LockFile): 'busy' | 'stale' | 'orphan' {
  const alive =
    lock.harness_pid === process.pid
      ? lock.token !== undefined && heldHere.has(lock.token)
      : pidAlive(lock.harness_pid);
  if (alive) return 'busy';
  return lock.engine_pid !== null && pidAlive(lock.engine_pid) ? 'orphan' : 'stale';
}

/**
 * Replace a stale or orphaned lock. Only one process at a time does this (a mutex file created with `link`), and
 * staleness is checked again while holding it. Returns true when we now hold the lock.
 */
async function takeOver(file: string, mineJson: string): Promise<boolean> {
  const mutex = `${file}.takeover`;
  try {
    publish(mutex, String(process.pid), 'link');
  } catch (e) {
    if (errCode(e) !== 'EEXIST') throw e;
    const owner = Number(safeText(mutex));
    if (owner !== process.pid && !pidAlive(owner)) {
      // Its owner died; moving it aside is atomic, so only one waiter clears it.
      try {
        renameSync(mutex, `${mutex}.dead.${randomUUID()}`);
      } catch {
        // Another waiter got there first.
      }
    }
    return false;
  }
  try {
    const held = readLock(file);
    if (held !== null) {
      const verdict = judge(held);
      if (verdict === 'busy') return false;
      if (verdict === 'orphan' && held.engine_pid !== null) {
        await killTree(held.engine_pid);
        await waitGone(held.engine_pid);
      }
      if (readLock(file)?.token !== held.token) return false;
      rmSync(file, { force: true });
    }
    createExclusive(file, mineJson);
    return true;
  } catch (e) {
    if (errCode(e) === 'EEXIST') return false;
    throw e;
  } finally {
    rmSync(mutex, { force: true });
  }
}

/** Take var/engine.lock (design §8): never two holders, readers never see partial content. */
async function acquireLock(file: string): Promise<Held> {
  await mkdir(path.dirname(file), { recursive: true });
  const held: Held = { file, token: randomUUID() };
  heldHere.add(held.token);
  const mine = JSON.stringify({
    harness_pid: process.pid,
    engine_pid: null,
    started_at: new Date().toISOString(),
    token: held.token,
  } satisfies LockFile);
  for (let i = 0; i < 200; i++) {
    try {
      createExclusive(file, mine);
      return held;
    } catch (e) {
      if (errCode(e) !== 'EEXIST') throw e;
    }
    const lock = readLock(file);
    if (lock === null) continue;
    if (judge(lock) === 'busy') {
      heldHere.delete(held.token);
      throw new EngineLockedError(
        `engine busy: harness pid ${String(lock.harness_pid)} since ${lock.started_at}`,
        lock.harness_pid,
      );
    }
    if (await takeOver(file, mine)) return held;
    await sleep(50);
  }
  heldHere.delete(held.token);
  throw new EngineBusyError('engine lock could not be taken');
}

interface Attempt {
  code: number | null;
}

function toError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}

interface RunState {
  stopping: boolean;
  childPid: number | undefined;
}

function runEngineOnce(
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  logPath: string,
  held: Held,
  state: RunState,
): Promise<Attempt> {
  const fd = openSync(logPath, 'a');
  return new Promise<Attempt>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env,
      stdio: ['ignore', fd, fd],
      detached: process.platform !== 'win32',
      windowsHide: true,
    });
    state.childPid = child.pid;
    let settled = false;
    const finish = (settle: () => void): void => {
      if (settled) return;
      settled = true;
      state.childPid = undefined;
      closeSync(fd);
      settle();
    };
    child.once('error', (e) => {
      finish(() => {
        reject(toError(e));
      });
    });
    child.once('close', (code) => {
      try {
        if (!state.stopping) recordEnginePid(held, null);
      } catch (e) {
        finish(() => {
          reject(toError(e));
        });
        return;
      }
      finish(() => {
        resolve({ code });
      });
    });
    if (child.pid === undefined) return;
    try {
      recordEnginePid(held, child.pid);
    } catch (e) {
      void killTree(child.pid).finally(() => {
        finish(() => {
          reject(toError(e));
        });
      });
    }
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
    } else if (/\brejected(?::| \()/.test(line)) {
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
      wordsPerS: audio.voice?.words_per_s ?? null,
      pitchStSd: audio.voice?.pitch_st_sd ?? null,
      pitchRangeSt: audio.voice?.pitch_range_st ?? null,
      loudRangeDb: audio.voice?.loud_range_db ?? null,
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

const CallsFile = z.object({
  calls: z.array(
    z.object({
      input_tokens: z.number(),
      cached: z.number(),
      output_tokens: z.number(),
    }),
  ),
});

/** Moves reel-work/calls.json to `<runDir>/<name>` and returns its text, or null when there is none. */
async function setAsideCalls(runDir: string, name: string): Promise<string | null> {
  const file = path.join(runDir, 'reel-work', 'calls.json');
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (e) {
    if (errCode(e) === 'ENOENT') return null;
    throw e;
  }
  await rename(file, path.join(runDir, name));
  return text;
}

/**
 * An invocation that stopped early leaves its model calls in reel-work/calls.json, and the next invocation overwrites
 * the file. Move it aside as calls-<cut>-<k>.json and price it (engine prices, design §6.6).
 */
async function harvestCalls(runDir: string, cut: number): Promise<Spent> {
  const spent: Spent = { usd: 0, tokensIn: 0, tokensOut: 0, wallS: 0 };
  const prefix = `calls-${String(cut)}-`;
  const k = (await readdir(runDir)).filter((f) => f.startsWith(prefix)).length + 1;
  const text = await setAsideCalls(runDir, `${prefix}${String(k)}.json`);
  if (text === null) return spent;
  for (const c of CallsFile.parse(JSON.parse(text)).calls) {
    spent.usd +=
      (c.input_tokens * PRICE.in + c.cached * PRICE.cached + c.output_tokens * PRICE.out) / 1e6;
    spent.tokensIn += c.input_tokens + c.cached;
    spent.tokensOut += c.output_tokens;
  }
  return spent;
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
    CUTROOM_ENV_FILE: process.env['CUTROOM_ENV_FILE'] ?? path.join(repoRoot, '.env'),
    ...opts.env,
  };

  await mkdir(runDir, { recursive: true });
  const held = await acquireLock(lockFile);
  const state: RunState = { stopping: false, childPid: undefined };
  // On SIGINT/SIGTERM: no rerun and no new spawn; stop the current engine's tree, release the lock, then exit.
  const stop = (signal: NodeJS.Signals): void => {
    if (state.stopping) return;
    state.stopping = true;
    const stopped = state.childPid === undefined ? Promise.resolve() : killTree(state.childPid);
    void stopped.finally(() => {
      release(held);
      process.exit(signal === 'SIGINT' ? 130 : 143);
    });
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  const stopping = (): boolean => state.stopping;
  const earlier: Spent = { ...(opts.earlier ?? { usd: 0, tokensIn: 0, tokensOut: 0, wallS: 0 }) };
  const untilExit = new Promise<never>(() => undefined);
  try {
    // a calls.json already here is from an invocation that was interrupted (finished ones are moved aside): price it
    const interrupted = await harvestCalls(runDir, cut);
    earlier.usd += interrupted.usd;
    earlier.tokensIn += interrupted.tokensIn;
    earlier.tokensOut += interrupted.tokensOut;
    for (let attempt = 1; ; attempt++) {
      if (stopping()) return await untilExit;
      if (readLock(lockFile)?.token !== held.token) throw new EngineBusyError('engine lock lost');
      const before = (() => {
        try {
          return statSync(logPath).size;
        } catch {
          return 0;
        }
      })();
      const startedAt = performance.now(); // monotonic: the wall clock can step back (#38)
      const { code } = await runEngineOnce(args, env, logPath, held, state);
      if (stopping()) return await untilExit;
      const thisRun = readFileSync(logPath, 'utf8').slice(before);
      if (code === 0) {
        const result = await parseOutputs(runDir, cut, logPath);
        // The summary already counts these calls. Left in place, the next invocation would re-count them as lost
        // if it stopped before its first model call (the engine rewrites the file only on a call).
        await setAsideCalls(runDir, `calls-${String(cut)}.json`);
        if (earlier.usd > 0 || earlier.wallS > 0) {
          result.cost['earlier attempts'] = {
            usd: earlier.usd,
            tokens_in: earlier.tokensIn,
            tokens_out: earlier.tokensOut,
          };
          result.totalUsd += earlier.usd;
          result.wallS += earlier.wallS;
        }
        return result;
      }
      const lost = await harvestCalls(runDir, cut);
      earlier.usd += lost.usd;
      earlier.tokensIn += lost.tokensIn;
      earlier.tokensOut += lost.tokensOut;
      earlier.wallS += (performance.now() - startedAt) / 1000;
      const refusal = REFUSAL.exec(thisRun);
      if (refusal?.[2] !== undefined) {
        return {
          kind: 'voice_refused',
          model: opts.voiceModel,
          status: Number(refusal[2]),
          message: (refusal[3] ?? '').trim(),
          spent: { ...earlier },
        };
      }
      if (attempt === 2) {
        const crash = new EngineCrashError(
          `engine exited with code ${String(code)} twice; log tail of ${logPath}:\n${tail(thisRun)}`,
        );
        crash.spent = { ...earlier };
        throw crash;
      }
    }
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    release(held);
  }
}
