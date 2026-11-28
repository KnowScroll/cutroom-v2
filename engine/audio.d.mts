// Types for what test/ imports from engine/audio.mjs (engine/ is plain JavaScript and tsconfig has no allowJs).

export const VOICE_MODELS: Record<string, { id: string; family: string; usdPerChar: number }>;
// a voice name (the model family's own, a Kokoro id a template names, or none) as one of the model family's voices
export function normVoice(modelKey: string, v: string | null | undefined, narrator: boolean): string;
// each cast id's voice after that mapping, one distinct voice per speaker; the narrator keeps its own
export function castVoices(
  modelKey: string,
  cast: Record<string, { voice?: string | null | undefined } | null | undefined> | null | undefined,
): Record<string, string>;
// the voice list the script prompt shows: "<id> (<description>)" per voice
export function voiceGuide(modelKey: string): string;
