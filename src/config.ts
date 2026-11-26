import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// Engine --voice-model keys: VOICE_MODELS in fastreel engine/audio.mjs lines 19-33 (fastreel as of 2026-11-27).
// The orchestrator checks this list against the imported engine/audio.mjs (issue #2).
export const VOICE_MODEL_KEYS = [
  'eleven-v4',
  'eleven-v4-turbo',
  'eleven-v3',
  'minimax',
  'kokoro',
  'heygen',
  'heygen-paid',
  'gemini-tts',
] as const;
export type VoiceModelKey = (typeof VOICE_MODEL_KEYS)[number];

// design §6.7
export const DEFAULT_VOICE_MODELS: readonly VoiceModelKey[] = [
  'eleven-v4',
  'heygen-paid',
  'heygen',
  'minimax',
  'gemini-tts',
  'eleven-v4-turbo',
  'eleven-v3',
  'kokoro',
];

const repoRoot = path.resolve(import.meta.dirname, '..');

export interface Config {
  minimaxApiKey: string;
  openrouterApiKey: string | undefined;
  elevenlabsApiKey: string | undefined;
  apiToken: string | undefined;
  voiceModels: readonly VoiceModelKey[];
  varDir: string;
  engineEntry: string;
  host: string;
  port: number;
}

export type Env = Readonly<Record<string, string | undefined>>;

const voiceModelSchema = z.enum(VOICE_MODEL_KEYS);
const portSchema = z.coerce.number().int().min(1).max(65535);

function optional(env: Env, key: string): string | undefined {
  const v = env[key]?.trim();
  return v === undefined || v === '' ? undefined : v;
}

function parseVoiceModels(raw: string | undefined): readonly VoiceModelKey[] {
  if (raw === undefined) return DEFAULT_VOICE_MODELS;
  const out: VoiceModelKey[] = [];
  for (const item of raw.split(',')) {
    const key = item.trim();
    const parsed = voiceModelSchema.safeParse(key);
    if (!parsed.success) {
      throw new Error(
        `CUTROOM_VOICE_MODELS: unknown voice model "${key}" (known: ${VOICE_MODEL_KEYS.join(', ')})`,
      );
    }
    if (out.includes(parsed.data))
      throw new Error(`CUTROOM_VOICE_MODELS: "${key}" is listed twice`);
    out.push(parsed.data);
  }
  return out;
}

/** Parse an environment into a typed config. Errors name the key, never a value. */
export function parseConfig(env: Env): Config {
  const minimaxApiKey = optional(env, 'MINIMAX_API_KEY');
  if (minimaxApiKey === undefined) throw new Error('missing MINIMAX_API_KEY');

  const port = portSchema.safeParse(optional(env, 'CUTROOM_PORT') ?? '8080');
  if (!port.success) throw new Error('CUTROOM_PORT: must be an integer from 1 to 65535');

  return {
    minimaxApiKey,
    openrouterApiKey: optional(env, 'OPENROUTER_API_KEY'),
    elevenlabsApiKey: optional(env, 'ELEVENLABS_API_KEY'),
    apiToken: optional(env, 'CUTROOM_API_TOKEN'),
    voiceModels: parseVoiceModels(optional(env, 'CUTROOM_VOICE_MODELS')),
    varDir: path.resolve(optional(env, 'CUTROOM_VAR') ?? path.join(repoRoot, 'var')),
    engineEntry: path.resolve(
      optional(env, 'CUTROOM_ENGINE') ?? path.join(repoRoot, 'engine', 'asset_reel.mjs'),
    ),
    host: optional(env, 'CUTROOM_HOST') ?? '127.0.0.1',
    port: port.data,
  };
}

/** Load `CUTROOM_ENV_FILE`, else the repo root `.env`, into process.env (existing variables win), then parse. */
export function loadConfig(): Config {
  const explicit = process.env['CUTROOM_ENV_FILE'];
  const file = explicit !== undefined && explicit !== '' ? explicit : path.join(repoRoot, '.env');
  if (existsSync(file)) process.loadEnvFile(file);
  else if (explicit !== undefined && explicit !== '')
    throw new Error('CUTROOM_ENV_FILE: file not found');
  return parseConfig(process.env);
}

/** `serve` only: the bearer token for the HTTP API. */
export function requireApiToken(config: Config): string {
  if (config.apiToken === undefined) throw new Error('missing CUTROOM_API_TOKEN');
  return config.apiToken;
}
