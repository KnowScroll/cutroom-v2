import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { CutResult } from '../engine.ts';
import type { Gate } from '../record.ts';

export const MIN_PITCH_ST = 4;
export const MIN_VOICE_OVER_MUSIC_DB = 10;
export const MAX_VOICE_OVER_MUSIC_DB = 14;
const DURATION_TOLERANCE_S = 0.1;

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
  const threshold = `1080x1920, 30 fps, audio stream, duration = timeline total +-${String(DURATION_TOLERANCE_S)} s`;
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

/** The block gates of design §6.3 that need no frames: format, shipped_failing, voice_pitch, music_fit, voice_over_music. A null measurement fails. */
export async function basicGates(cut: CutResult): Promise<Gate[]> {
  const a = cut.audio;
  const shipped = cut.failingSteps.map((f) => f.step);
  return [
    await formatGate(cut),
    {
      name: 'shipped_failing',
      value: shipped.length === 0 ? 'none' : shipped.join(', '),
      threshold: 'none',
      pass: shipped.length === 0,
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
