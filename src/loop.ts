import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { VOICE_MODEL_KEYS } from './config.ts';
import {
  CutRecord,
  FixRound,
  HarnessCall,
  Intake,
  ReviewNotes,
  TemplatePatch,
  VoiceSwitch,
} from './record.ts';

const Voice = z.enum(VOICE_MODEL_KEYS);

/**
 * What a restarted job needs to continue its fix loop (design §8). Written to `<run>/loop.json` after every step that
 * cannot be redone for free: intake, each cut (after the engine, again after gates and review), each planned round, a
 * voice refusal. The run record (run.json) is still written once, at the end.
 */
export const LoopState = z.object({
  intake: Intake,
  sync_conflicts: z.array(z.string()),
  /** Seconds the job has run so far, over all its starts. */
  elapsed_s: z.number().nonnegative(),
  cuts: z.array(CutRecord),
  rounds: z.array(FixRound),
  voice_switches: z.array(VoiceSwitch),
  harness_calls: z.array(HarnessCall),
  refusals: z.array(z.object({ model: Voice, status: z.number(), message: z.string() })),
  ruled_out: z.array(Voice),
  tried: z.array(Voice),
  current: Voice.nullable(),
  /** Spent by invocations of a cut that was never written (refused voices). */
  pending: z
    .object({
      usd: z.number(),
      tokensIn: z.number(),
      tokensOut: z.number(),
      wallS: z.number(),
    })
    .nullable(),
  notes_rounds: z.array(z.number().int().positive()),
  /** The planned round that makes (or made) the next cut; its record is the entry of `rounds` with the same n. */
  made: z
    .object({
      n: z.number().int().positive(),
      notes: ReviewNotes.nullable(),
      patches: z.array(TemplatePatch).nullable(),
      before: z
        .object({ lines: z.array(z.string()), code: z.record(z.string(), z.string()) })
        .nullable(),
    })
    .nullable(),
  /** The last review was asked again after approving with a blocking gate FAIL (for the loop_end text). */
  reasked: z.boolean(),
});
export type LoopState = z.infer<typeof LoopState>;

const loopFile = (runDir: string): string => path.join(runDir, 'loop.json');

/** null: the job never got past intake (it starts from the top). */
export async function readLoop(runDir: string): Promise<LoopState | null> {
  let text: string;
  try {
    text = await readFile(loopFile(runDir), 'utf8');
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') return null;
    throw e;
  }
  return LoopState.parse(JSON.parse(text));
}

export async function writeLoop(runDir: string, state: LoopState): Promise<void> {
  const tmp = `${loopFile(runDir)}.tmp`;
  await writeFile(tmp, `${JSON.stringify(LoopState.parse(state), null, 2)}\n`);
  await rename(tmp, loopFile(runDir));
}
