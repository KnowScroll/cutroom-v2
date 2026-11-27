import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { CutResult } from '../engine.ts';
import type { Gate, ShippedStep } from '../record.ts';

export const MIN_PITCH_ST = 4;
export const MIN_VOICE_OVER_MUSIC_DB = 10;
export const MAX_VOICE_OVER_MUSIC_DB = 14;
const DURATION_TOLERANCE_S = 0.1;
const FORMAT_THRESHOLD = `1080x1920, 30 fps, audio stream, duration = timeline total +-${String(DURATION_TOLERANCE_S)} s`;

const Probe = z.object({
  streams: z.array(
    z.object({
      codec_type: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      r_frame_rate: z.string().optional(),
    }),
  ),
  format: z.object({ duration: z.string().optional() }),
});

const Timeline = z.object({ total: z.number() });

function ffprobe(file: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const p = spawn(
      'ffprobe',
      ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file],
      { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
    );
    let out = '';
    let err = '';
    p.stdout.setEncoding('utf8');
    p.stderr.setEncoding('utf8');
    p.stdout.on('data', (d: string) => (out += d));
    p.stderr.on('data', (d: string) => (err += d));
    p.once('error', reject);
    p.once('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with ${String(code)}: ${err.trim()}`));
        return;
      }
      try {
        resolve(JSON.parse(out));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  });
}

function fps(rate: string | undefined): number | null {
  const m = /^(\d+)\/(\d+)$/.exec(rate ?? '');
  const num = Number(m?.[1]);
  const den = Number(m?.[2]);
  return m === null || den === 0 ? null : num / den;
}

/** design §6.3 `format`: ffprobe says 1080x1920, 30 fps, an audio stream, a duration within 0.1 s of the timeline. */
async function formatGate(cut: CutResult): Promise<Gate> {
  const threshold = FORMAT_THRESHOLD;
  const probe = Probe.parse(await ffprobe(cut.reelPath));
  const timeline = Timeline.parse(
    JSON.parse(await readFile(path.join(cut.dir, 'timeline.json'), 'utf8')),
  );
  const video = probe.streams.find((s) => s.codec_type === 'video');
  const audio = probe.streams.some((s) => s.codec_type === 'audio');
  const duration = probe.format.duration === undefined ? null : Number(probe.format.duration);
  const rate = fps(video?.r_frame_rate);
  const pass =
    video?.width === 1080 &&
    video.height === 1920 &&
    rate === 30 &&
    audio &&
    duration !== null &&
    Math.abs(duration - timeline.total) <= DURATION_TOLERANCE_S;
  const size = `${String(video?.width)}x${String(video?.height)}`;
  const value = `${size}, ${rate === null ? 'no' : String(rate)} fps, ${audio ? 'audio' : 'no audio'}, ${duration === null ? 'no duration' : `${duration.toFixed(2)} s`} (timeline ${timeline.total.toFixed(2)} s)`;
  return { name: 'format', value, threshold, pass, mode: 'block' };
}

// The code of every step a cut ships, as the engine writes it into reel-v<n>/plan.json.
const ShippedCode = z.object({
  kit: z.string().nullish(),
  assets: z.array(z.object({ id: z.string(), code: z.string().nullish() })),
  shots: z.array(z.object({ code: z.string().nullish() })),
});
type ShippedCode = z.infer<typeof ShippedCode>;

async function shippedCode(dir: string): Promise<ShippedCode> {
  const file = path.join(dir, 'plan.json');
  const parsed = ShippedCode.safeParse(JSON.parse(await readFile(file, 'utf8')));
  if (!parsed.success) throw new Error(`${file}: ${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

/** The code of an engine step label (asset_reel.mjs make(): shot<n>, asset:<id>, their -rev and -poses, kit). */
function codeOf(plan: ShippedCode, step: string): string | null | undefined {
  const shot = /^shot(\d+)(?:-rev)?$/.exec(step)?.[1];
  if (shot !== undefined) return plan.shots[Number(shot) - 1]?.code;
  const asset = /^asset:(.+?)(?:-poses|-rev)?$/.exec(step)?.[1];
  if (asset !== undefined) return plan.assets.find((a) => a.id === asset)?.code;
  return step === 'kit' ? plan.kit : undefined;
}

/** The code a step label stands for: shot<n> and asset:<id> are one step with their -rev and -poses labels. */
const slot = (step: string): string =>
  step.replace(/^(shot\d+)-rev$/, '$1').replace(/^(asset:.+?)(?:-poses|-rev)$/, '$1');

/**
 * The steps cut n ships failing (design §6.3): those its own log names, and those of the previous cut whose code is
 * unchanged (a restored checkpoint, or a redraw that failed and kept the old code, is logged by no later run), unless
 * this cut's log says that kept code passed its validator again (its lines changed).
 */
export async function shippedFailing(
  cut: Pick<CutResult, 'cut' | 'dir' | 'failingSteps' | 'passingSteps'>,
  previous: { dir: string; failing: readonly ShippedStep[] } | null,
): Promise<ShippedStep[]> {
  const own: ShippedStep[] = cut.failingSteps.map((f) => ({ ...f, cut: cut.cut }));
  if (previous === null || previous.failing.length === 0) return own;
  const before = await shippedCode(previous.dir);
  const now = await shippedCode(cut.dir);
  const named = new Set([...own.map((o) => o.step), ...cut.passingSteps].map(slot));
  const carried = previous.failing.filter(
    (f) => !named.has(slot(f.step)) && codeOf(before, f.step) === codeOf(now, f.step),
  );
  return [...own, ...carried];
}

/**
 * The block gates of design §6.3 that need no frames: format, shipped_failing, voice_pitch, music_fit, voice_over_music.
 * A null measurement fails. `shipped` defaults to the steps the cut's own log names.
 */
export async function basicGates(
  cut: CutResult,
  shipped: readonly ShippedStep[] = cut.failingSteps.map((f) => ({ ...f, cut: cut.cut })),
): Promise<Gate[]> {
  const a = cut.audio;
  const steps = shipped.map((f) =>
    f.cut === cut.cut ? f.step : `${f.step} (from cut ${String(f.cut)})`,
  );
  // A reel that cannot be probed or has no readable timeline is a failed format gate, not a thrown error.
  const format: Gate = await formatGate(cut).catch((e: unknown) => ({
    name: 'format',
    value: `unreadable: ${e instanceof Error ? e.message : String(e)}`,
    threshold: FORMAT_THRESHOLD,
    pass: false,
    mode: 'block' as const,
  }));
  return [
    format,
    {
      name: 'shipped_failing',
      value: steps.length === 0 ? 'none' : steps.join(', '),
      threshold: 'none',
      pass: steps.length === 0,
      mode: 'block',
    },
    {
      name: 'voice_pitch',
      value: a.pitchStSd,
      threshold: MIN_PITCH_ST,
      pass: a.pitchStSd !== null && a.pitchStSd >= MIN_PITCH_ST,
      mode: 'block',
    },
    {
      name: 'music_fit',
      value: a.musicFitPass,
      threshold: true,
      pass: a.musicFitPass === true,
      mode: 'block',
    },
    {
      name: 'voice_over_music',
      value: a.voiceOverMusicDb,
      threshold: `${String(MIN_VOICE_OVER_MUSIC_DB)}-${String(MAX_VOICE_OVER_MUSIC_DB)}`,
      pass:
        a.voiceOverMusicDb !== null &&
        a.voiceOverMusicDb >= MIN_VOICE_OVER_MUSIC_DB &&
        a.voiceOverMusicDb <= MAX_VOICE_OVER_MUSIC_DB,
      mode: 'block',
    },
  ];
}
