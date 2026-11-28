// fastreel audio: voice, music bed and the mix, done the cutroom way (github.com/KnowScroll/cutroom-test-skill, rules/audio.md v1.5).
// Nothing here can hear: every decision is gated on MEASURED numbers, and the reel's summary carries them.
//   voice  ElevenLabs v4, direct when ELEVENLABS_API_KEY is set, else through OpenRouter (cutroom's 2026-11-16 bake-off: Kokoro measured pitch spread 3.1 semitones,
//          "not human enough"; brian/chris/george 4.1-4.5), a [tone] tag before each line, pitch spread measured on the narrator.
//          Spoken directly, each word's time comes from ElevenLabs' with-timestamps endpoint (wordTimes), for h.cue and the captions.
//   music  CC BY 4.0 library (Kevin MacLeod, incompetech) searched by feel, bpm and length; each candidate is FITTED to the reel
//          (start offset so the track builds into the payoff, peaks near it, has no limp intro); Lyria 3 if no library track fits;
//          the procedural synth only if both fail (offline).
//   mix    ffmpeg sidechain: the music ducks under the voice and comes back up in the pauses. Gate: voice 10-14 dB over the music
//          during speech, music +4..+10 dB in the gaps, -14 LUFS integrated, true peak <= -1 dBTP after the AAC encode.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { VAR, SR, run, log, loadKeys, music as synthMusic, writeWavStereo } from './lib.mjs';

const CACHE = path.join(VAR, 'cache');

// ---------------- voice ----------------
export const VOICE_MODELS = {
  'eleven-v4': { id: 'elevenlabs/eleven-v4', family: 'eleven', usdPerChar: 0.00008 },
  'eleven-v4-turbo': { id: 'elevenlabs/eleven-v4-turbo', family: 'eleven', usdPerChar: 0.00004 },
  'eleven-v3': { id: 'elevenlabs/eleven-v3', family: 'eleven', usdPerChar: 0.00008 },
  minimax: { id: 'minimax/speech-2.8-turbo', family: 'minimax', usdPerChar: 0.00006 },
  kokoro: { id: 'hexgrad/kokoro-82m', family: 'kokoro', usdPerChar: 0.00000062, provider: { only: ['deepinfra'], allow_fallbacks: false } },
  // HeyGen Voice Turbo through OpenRouter (audio-realism rank 2 on its benchmark, 2026-11): answers raw 16-bit PCM only (44.1 kHz, mono),
  // wrapped into a WAV below. Measured on a reel's lines (2026-11-25): meredith pitch spread 4.6 st, sabrina 4.2, tabitha 4.1, about 3.1 words/s;
  // Kokoro af_sky 3.5, Fish S2.1 Pro 2.7. The free tier expires 2026-11-30; 'heygen-paid' is the same model billed to OpenRouter credits.
  heygen: { id: 'heygen/heygen-voice-1-turbo:free', family: 'heygen', usdPerChar: 0, format: 'pcm' },
  'heygen-paid': { id: 'heygen/heygen-voice-1-turbo', family: 'heygen', usdPerChar: 0.000004, format: 'pcm' },
  // Gemini 3.8 Flash TTS through OpenRouter (text-to-speech rank 1 on its benchmark): needs OpenRouter credits; cost per char estimated from
  // its audio-token price ($9 per million, about 25 tokens a second of speech). Not measured yet.
  'gemini-tts': { id: 'google/gemini-3.8-flash-tts', family: 'gemini', usdPerChar: 0.000016 },
  // Windows' built-in speech (System.Speech, offline, free): a stand-in so QC can run when no voice model answers (#85: heygen free
  // at its daily limit, no OpenRouter credit). David at rate 0 spoke 39 words in 12.6 s (3.1 words/s, 2026-11-28); SSML pitch x-low
  // and x-high move his median pitch from 98 to 87 and 110 Hz (about 2 semitones), so two voices make six. Windows only.
  local: { id: 'windows-sapi', family: 'local', usdPerChar: 0 },
};
const VOICES = {
  eleven: { george: 'warm British narrator', brian: 'deep American narrator', chris: 'casual American storyteller', daniel: 'authoritative British newsreader',
    callum: 'husky, intense man', charlie: 'casual Australian man', roger: 'laid-back, confident American man', eric: 'smooth American man',
    liam: 'young, energetic American man', will: 'friendly young American man', bill: 'old, wise American man', harry: 'fierce, anxious young man',
    adam: 'deep, dominant American man', alice: 'confident British woman', lily: 'warm British woman', sarah: 'soft young American woman',
    laura: 'upbeat, quirky American woman', jessica: 'playful, bright young American woman', matilda: 'warm, professional American woman',
    bella: 'warm American woman', river: 'relaxed, neutral voice' },
  kokoro: { bm_george: 'British narrator', bm_fable: 'British storyteller', bm_daniel: 'British man', bm_lewis: 'posh British man', am_puck: 'cheerful man',
    am_adam: 'American man', am_echo: 'American man', am_eric: 'American man', am_fenrir: 'gruff man', am_liam: 'young American man', am_michael: 'American man',
    am_onyx: 'deep man', af_heart: 'American woman', af_bella: 'American woman', af_nicole: 'soft American woman', af_sarah: 'American woman', af_sky: 'young American woman',
    bf_emma: 'British woman', bf_isabella: 'British woman' },
  minimax: { English_expressive_narrator: 'lively narrator (the liveliest pitch cutroom measured)', English_CaptivatingStoryteller: 'storyteller',
    English_magnetic_voiced_man: 'magnetic man', English_Trustworth_Man: 'trustworthy man', English_ManWithDeepVoice: 'deep-voiced man', English_Comedian: 'comedian',
    'English_Gentle-voiced_man': 'gentle man', English_radiant_girl: 'radiant young woman', English_Upbeat_Woman: 'upbeat woman', English_CalmWoman: 'calm woman',
    English_Wiselady: 'wise older woman', English_PlayfulGirl: 'playful girl', English_ConfidentWoman: 'confident woman' },
  // HeyGen's 10 default voices; gender and liveliness measured (median pitch, pitch spread in semitones) on the same 4 lines
  heygen: { meredith: 'woman, the liveliest (4.6 st)', sabrina: 'bright young woman (4.2 st)', tabitha: 'bright woman (4.1 st)', nadine: 'calm woman',
    noelle: 'soft woman', lucian: 'man, lively (4.2 st)', weston: 'man, lively (4.1 st)', gareth: 'man (4.1 st)', vincent: 'man, even', bram: 'deep, even man' },
  // Google's prebuilt Gemini TTS voices with Google's own one-word character
  gemini: { Zephyr: 'bright', Puck: 'upbeat', Charon: 'informative', Kore: 'firm', Fenrir: 'excitable', Leda: 'youthful', Orus: 'firm', Aoede: 'breezy',
    Callirrhoe: 'easy-going', Autonoe: 'bright', Enceladus: 'breathy', Iapetus: 'clear', Umbriel: 'easy-going', Algieba: 'smooth', Despina: 'smooth',
    Erinome: 'clear', Algenib: 'gravelly', Rasalgethi: 'informative', Laomedeia: 'upbeat', Achernar: 'soft', Alnilam: 'firm', Schedar: 'even',
    Gacrux: 'mature', Pulcherrima: 'forward', Achird: 'friendly', Zubenelgenubi: 'casual', Vindemiatrix: 'gentle', Sadachbia: 'lively',
    Sadaltager: 'knowledgeable', Sulafat: 'warm' },
  local: { zira: 'American woman', david: 'American man', david_deep: 'deeper American man', zira_bright: 'brighter American woman',
    david_bright: 'higher American man', zira_deep: 'lower American woman' },
};
// templates and old checkpoints name Kokoro voices: each maps to a distinct voice of the same kind in the other families
const FROM_KOKORO = {
  eleven: { bm_george: 'george', bm_daniel: 'daniel', bm_fable: 'callum', bm_lewis: 'charlie', am_puck: 'will', am_adam: 'adam', am_echo: 'chris', am_eric: 'eric',
    am_fenrir: 'harry', am_liam: 'liam', am_michael: 'roger', am_onyx: 'brian', af_heart: 'matilda', af_bella: 'bella', af_nicole: 'river', af_sarah: 'sarah',
    af_sky: 'jessica', bf_emma: 'alice', bf_isabella: 'lily' },
  minimax: { bm_george: 'English_expressive_narrator', bm_fable: 'English_CaptivatingStoryteller', bm_daniel: 'English_Trustworth_Man', bm_lewis: 'English_magnetic_voiced_man',
    am_puck: 'English_Comedian', am_adam: 'English_magnetic_voiced_man', am_echo: 'English_Gentle-voiced_man', am_eric: 'English_Trustworth_Man', am_fenrir: 'English_ManWithDeepVoice',
    am_liam: 'English_Gentle-voiced_man', am_michael: 'English_Trustworth_Man', am_onyx: 'English_ManWithDeepVoice', af_heart: 'English_Upbeat_Woman', af_bella: 'English_radiant_girl',
    af_nicole: 'English_CalmWoman', af_sarah: 'English_ConfidentWoman', af_sky: 'English_PlayfulGirl', bf_emma: 'English_Wiselady', bf_isabella: 'English_CalmWoman' },
  // am_onyx (the countryball narrator) is gareth, not bram: bram measured 3.39 st as a narrator in QC3 Norway, under the gate of 4
  heygen: { bm_george: 'lucian', bm_fable: 'weston', bm_daniel: 'gareth', bm_lewis: 'vincent', am_puck: 'weston', am_adam: 'gareth', am_echo: 'vincent', am_eric: 'lucian',
    am_fenrir: 'bram', am_liam: 'weston', am_michael: 'gareth', am_onyx: 'gareth', af_heart: 'sabrina', af_bella: 'tabitha', af_nicole: 'noelle', af_sarah: 'nadine',
    af_sky: 'meredith', bf_emma: 'nadine', bf_isabella: 'noelle' },
  gemini: { bm_george: 'Charon', bm_fable: 'Iapetus', bm_daniel: 'Rasalgethi', bm_lewis: 'Algieba', am_puck: 'Puck', am_adam: 'Orus', am_echo: 'Umbriel', am_eric: 'Achird',
    am_fenrir: 'Fenrir', am_liam: 'Zubenelgenubi', am_michael: 'Alnilam', am_onyx: 'Algenib', af_heart: 'Sulafat', af_bella: 'Aoede', af_nicole: 'Achernar', af_sarah: 'Kore',
    af_sky: 'Leda', bf_emma: 'Gacrux', bf_isabella: 'Vindemiatrix' },
  local: { bm_george: 'david', bm_fable: 'david_deep', bm_daniel: 'david', bm_lewis: 'david_deep', am_puck: 'david', am_adam: 'david', am_echo: 'david_deep', am_eric: 'david',
    am_fenrir: 'david_deep', am_liam: 'david', am_michael: 'david', am_onyx: 'david_deep', af_heart: 'zira', af_bella: 'zira_bright', af_nicole: 'zira', af_sarah: 'zira',
    af_sky: 'zira_bright', bf_emma: 'zira', bf_isabella: 'zira_bright' },
};
const NARRATOR = { eleven: 'george', kokoro: 'bm_george', minimax: 'English_expressive_narrator', heygen: 'meredith', gemini: 'Charon', local: 'zira' };
const OTHER = { eleven: 'chris', kokoro: 'am_adam', minimax: 'English_magnetic_voiced_man', heygen: 'lucian', gemini: 'Puck', local: 'david' };
// words per second per CLIP (each line trimmed of silence), used until a voice has 30 s measured in cache/voice/rates.json.
// Kokoro from past reels; eleven-v4 george measured 3.11 on 3 tagged lines (2026-11-19). cutroom's 2.2-2.4 for ElevenLabs are whole takes WITH pauses,
// so they would make a per-line reel about 30% short; MiniMax is unmeasured here.
const RATE = { kokoro: { bm_george: 2.05, bf_emma: 2.8, '*': 2.7 }, eleven: { george: 3.1, '*': 2.9 }, minimax: { '*': 2.8 }, heygen: { '*': 3.1 }, gemini: { '*': 2.9 }, local: { '*': 3.1 } };

export const voiceModel = key => VOICE_MODELS[key] || (() => { throw new Error(`unknown --voice-model "${key}": use ${Object.keys(VOICE_MODELS).join(', ')}`); })();
export function normVoice(modelKey, v, narrator) {
  const fam = voiceModel(modelKey).family, list = VOICES[fam];
  if (v && list[v]) return v;
  if (v && FROM_KOKORO[fam]?.[v]) return FROM_KOKORO[fam][v];
  const ci = v && Object.keys(list).find(k => k.toLowerCase() === String(v).toLowerCase());
  return ci || (narrator ? NARRATOR[fam] : OTHER[fam]);
}
// a cast's voices after that mapping, one voice per speaker: 19 Kokoro voices fall on 10 HeyGen ones, so two speakers could share
// one (QC3 Norway: the narrator and Sweden both spoke as bram, Norway and Carl as gareth). The narrator keeps its voice; a speaker
// whose voice is taken gets the next free one of the same sex (a Kokoro id's second letter), else any free one
const KOKORO_ID = /^[ab][fm]_/;
const sexOf = (fam, raw, v) => (KOKORO_ID.test(raw || '') ? raw[1] : KOKORO_ID.test(v) ? v[1] : Object.entries(FROM_KOKORO[fam] || {}).find(([, x]) => x === v)?.[0][1] || null);
export function castVoices(modelKey, cast) {
  const fam = voiceModel(modelKey).family, used = new Set(), out = {};
  const kin = sex => (fam === 'kokoro' ? Object.keys(VOICES.kokoro).filter(k => k[1] === sex) : Object.entries(FROM_KOKORO[fam]).filter(([k]) => k[1] === sex).map(([, x]) => x));
  for (const id of Object.keys(cast || {}).sort((a, b) => (b === 'narrator') - (a === 'narrator'))) {
    const raw = cast[id]?.voice; let v = normVoice(modelKey, raw, id === 'narrator');
    if (used.has(v)) { const sex = sexOf(fam, raw, v); v = [...(sex ? kin(sex) : []), ...Object.keys(VOICES[fam])].find(x => !used.has(x)) || v; }
    used.add(v); out[id] = v;
  }
  return out;
}
export function voiceGuide(modelKey) {
  const fam = voiceModel(modelKey).family;
  const ids = Object.entries(VOICES[fam]).map(([k, d]) => `${k} (${d})`).join(', ');
  const tone = fam === 'eleven'
    ? `Each line may carry "tone": 1 or 2 words describing the VOICE for that line, from: ${TONES.join(', ')}. It is sent as a [tag] before the line and changes the delivery; it is not spoken. Vary it with the story (a hook is curious or urgent, a reveal is grave or awed, a joke is wry or deadpan).`
    : 'Leave "tone" out: this voice engine reads punctuation only, so write short sentences and put commas where the breath goes.';
  return `Voices (${voiceModel(modelKey).id}): narrator usually ${NARRATOR[fam]}. All voices: ${ids}. A different voice per speaker; match the voice to the style and the tone of the reel. ${tone}`;
}
// voice-describing tags only: a tag that describes a SOUND (laughs, sighs) may be read aloud (cutroom: ElevenLabs docs); tags_heard must stay empty
const TONES = ['calm', 'curious', 'quietly', 'warm', 'wry', 'deadpan', 'grave', 'slow', 'serious', 'urgent', 'excited', 'fired up', 'building tension', 'tense',
  'playful', 'cheerful', 'hopeful', 'awed', 'surprised', 'sad', 'tired', 'nervous', 'angry', 'confident', 'dramatic', 'mysterious', 'gentle', 'matter-of-fact', 'shouting', 'whispering'];
export function cleanTone(t) {
  const parts = String(t || '').toLowerCase().split(/[,;/]+/).map(s => s.trim()).filter(s => TONES.includes(s));
  return parts.slice(0, 2).join(', ');
}

// ElevenLabs direct (ELEVENLABS_API_KEY in the env file): same models and premade voices as through OpenRouter, billed to the
// ElevenLabs account. The key may be scoped to text-to-speech only (no voices_read), so premade voice ids are listed here
// (each checked with a TTS call on 2026-11-20; "sarah" answered 404 and is left out, so it still goes through OpenRouter).
const ELEVEN_MODELS = { 'eleven-v4': 'eleven_v4', 'eleven-v3': 'eleven_v3' };
const ELEVEN_IDS = { george: 'JBFqnCBsd6RMkjVDRZzb', brian: 'nPczCjzI2devNBz1zQrb', chris: 'iP95p4xoKVk53GoZ742B', daniel: 'onwK4e9ZLuTAKqWW03F9',
  callum: 'N2lVS1w4EtoT3dr4eOWO', charlie: 'IKne3meq5aSn9XLyUdCD', roger: 'CwhRBWXzGAHq8TQ4Fs17', eric: 'cjVigY5qzO86Huf0OWal', liam: 'TX3LPaxmHKxFdv7VOQHJ',
  will: 'bIHbv24MWmeRgasZH58o', bill: 'pqHfZKP75CvOlQylNhV4', harry: 'SOYHLrjzK2X1ezoPC6cr', adam: 'pNInz6obpgDQGcFmaJgB', alice: 'Xb7hH8MSUJpSbSDYk0k2',
  lily: 'pFZP5JQG7iQjIQuC4Bku', laura: 'FGY2WhTYpPnrIDTdsKH5', jessica: 'cgSgspJ2msm6clMCkdW9', matilda: 'XrExE9yKIg1WjnnlVkGX', bella: 'hpp4J3VqNfWAUOO0d1Us',
  river: 'SAz9YHcvj6GT2YYXdXww' };
let ELEVEN_KEY;
const elevenKey = () => (ELEVEN_KEY === undefined ? (ELEVEN_KEY = loadKeys().elevenlabs || null) : ELEVEN_KEY);

// ElevenLabs direct: the with-timestamps endpoint returns the same audio plus each character's start and end time, so the
// shots and captions can land on the spoken word (h.cue). If the endpoint refuses (4xx other than 429), plain speech from then on.
let TIMESTAMPS = true;
export async function speak(key, modelKey, text, voice, tone) {
  const m = voiceModel(modelKey), tag = m.family === 'eleven' ? cleanTone(tone) : '';
  const input = tag ? `[${tag}] ${text}` : text;
  const ek = m.family === 'eleven' && ELEVEN_MODELS[modelKey] && ELEVEN_IDS[voice] ? elevenKey() : null;
  if (ek) {
    const ts = TIMESTAMPS;
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_IDS[voice]}${ts ? '/with-timestamps' : ''}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': ek, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: input, model_id: ELEVEN_MODELS[modelKey] }), signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) {
      const msg = (await res.text()).slice(0, 300);
      if (ts && [400, 404, 405, 422].includes(res.status) && !/quota|credit|voice_not_found|unauthori|invalid_api_key|authentication/i.test(msg)) { TIMESTAMPS = false; log(`ElevenLabs with-timestamps refused (HTTP ${res.status}: ${msg.slice(0, 120)}); plain speech, word times by letter share`); return speak(key, modelKey, text, voice, tone); }
      const e = new Error(`ElevenLabs speech ${ELEVEN_MODELS[modelKey]} HTTP ${res.status}: ${msg}`); e.noRetry = res.status < 500 && res.status !== 429; throw e;
    }
    if (ts) { const j = await res.json(); return { buf: Buffer.from(j.audio_base64, 'base64'), usd: input.length * m.usdPerChar, input, align: j.alignment || j.normalized_alignment || null }; }
    return { buf: Buffer.from(await res.arrayBuffer()), usd: input.length * m.usdPerChar, input };
  }
  if (m.family === 'local') return { buf: await sapi(text, voice), usd: 0, input };
  const body = { model: m.id, input, voice, response_format: m.format || 'mp3', ...(m.provider ? { provider: m.provider } : {}) };
  const res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) { const e = new Error(`OpenRouter speech ${m.id} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`); e.noRetry = res.status < 500 && res.status !== 429; throw e; }
  // raw PCM answers (HeyGen: "audio/pcm;rate=44100;channels=1") get a WAV header, so ffmpeg decodes the cached clip like any other
  const ct = res.headers.get('content-type') || '', raw = Buffer.from(await res.arrayBuffer());
  const pcm = /audio\/(l16|pcm)/i.test(ct), rate = +(ct.match(/rate=(\d+)/) || [])[1] || 24000, ch = +(ct.match(/channels=(\d+)/) || [])[1] || 1;
  return { buf: pcm ? pcmToWav(raw, rate, ch) : raw, usd: input.length * m.usdPerChar, input };
}
// Windows PowerShell's System.Speech; the line goes in as base64, so nothing in it is read as a command
const SAPI = { zira: ['Microsoft Zira Desktop', 'medium'], david: ['Microsoft David Desktop', 'medium'], david_deep: ['Microsoft David Desktop', 'x-low'], zira_bright: ['Microsoft Zira Desktop', 'x-high'],
  david_bright: ['Microsoft David Desktop', 'x-high'], zira_deep: ['Microsoft Zira Desktop', 'x-low'] };
let sapiN = 0;
function sapi(text, voice) {
  if (process.platform !== 'win32') return Promise.reject(Object.assign(new Error('--voice-model local is Windows speech (System.Speech): it runs on Windows only'), { noRetry: true }));
  const [name, pitch] = SAPI[voice] || SAPI.zira, out = path.join(CACHE, 'voice', `sapi-${process.pid}-${sapiN++}.wav`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const ps = `Add-Type -AssemblyName System.Speech; $t = [Security.SecurityElement]::Escape([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(text, 'utf8').toString('base64')}'))); `
    + `$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('${name}'); $s.SetOutputToWaveFile('${out}'); `
    + `$s.SpeakSsml("<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><prosody pitch='${pitch}'>$t</prosody></speak>"); $s.Dispose()`;
  return new Promise((resolve, reject) => {
    const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; p.stderr.on('data', d => { err += d; });
    p.on('error', reject);
    p.on('close', code => {
      try { if (code || !fs.existsSync(out)) throw Object.assign(new Error(`Windows speech (${name}) exit ${code}: ${err.slice(0, 300)}`), { noRetry: true }); resolve(fs.readFileSync(out)); }
      catch (e) { reject(e); } finally { fs.rmSync(out, { force: true }); }
    });
  });
}
function pcmToWav(pcm, rate, ch) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * ch * 2, 28); h.writeUInt16LE(ch * 2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
// each whitespace-separated word of a line with its start and end in the trimmed clip (seconds): from ElevenLabs' character
// timings when the line has them (offset = the silence trimmed off the front), else by each word's share of the line's letters.
// Returns { words: [[word, start, end], ...], measured }.
export function wordTimes(text, align, offset, dur) {
  const toks = String(text).split(/\s+/).filter(Boolean), r3 = x => +Math.max(0, Math.min(dur, x)).toFixed(3);
  const ch = align?.characters, st = align?.character_start_times_seconds, en = align?.character_end_times_seconds;
  const S = Array.isArray(ch) && ch.every(c => typeof c === 'string' && c.length === 1) ? ch.join('') : null;
  const base = S && st?.length === ch.length && en?.length === ch.length ? S.lastIndexOf(String(text).trim()) : -1;
  if (base >= 0) {
    const t = String(text).trim(); let p = 0;
    const words = toks.map(w => { const k = t.indexOf(w, p); p = k + w.length; const a = st[base + k] - offset, b = en[base + k + w.length - 1] - offset; return [w, r3(a), r3(Math.max(a, b))]; });
    if (words.every((w, i) => !i || w[1] >= words[i - 1][1])) return { words, measured: true };
  }
  const tot = toks.reduce((a, w) => a + w.length + 1, 0) || 1; let acc = 0;
  return { words: toks.map(w => { const a = dur * acc / tot; acc += w.length + 1; return [w, r3(a), r3(dur * (acc - 1) / tot)]; }), measured: false };
}
// the cache key keeps the old Kokoro form, so cached Kokoro lines are reused
export const voiceCacheKey = (modelKey, voice, tone, text) => modelKey === 'kokoro' ? `kokoro-82m|mp3|${voice}|${text}` : `${voiceModel(modelKey).id}|mp3|${voice}|${cleanTone(tone)}|${text}`;

// measured speaking rate per voice, kept across reels (cache/voice/rates.json); the word budget follows it
const RATES = path.join(CACHE, 'voice', 'rates.json');
const readRates = () => { try { return JSON.parse(fs.readFileSync(RATES, 'utf8')); } catch { return {}; } };
export function voiceRate(modelKey, voice) {
  const fam = voiceModel(modelKey).family, r = readRates()[`${voiceModel(modelKey).id}|${voice}`];
  return r && r.secs >= 30 ? +(r.words / r.secs).toFixed(2) : (RATE[fam][voice] || RATE[fam]['*']);
}
export function recordRate(modelKey, voice, words, secs) {
  if (!words || !secs) return;
  const all = readRates(), k = `${voiceModel(modelKey).id}|${voice}`, r = all[k] || { words: 0, secs: 0 };
  // a running total over the last ~10 minutes of speech, so a voice's rate tracks its recent takes
  const keep = Math.min(1, 600 / Math.max(1, r.secs + secs));
  all[k] = { words: Math.round((r.words + words) * keep), secs: +((r.secs + secs) * keep).toFixed(1) };
  fs.mkdirSync(path.dirname(RATES), { recursive: true }); fs.writeFileSync(RATES, JSON.stringify(all, null, 1));
}

// how alive a take sounds (cutroom voice_check.py): pitch spread in semitones over voiced 40 ms frames, loudness range.
// Gate (cutroom): pitch_st_sd >= 4 (3.5 only for a deliberately calm style). A proxy, not a listening test.
export function voiceCheck(pcm48) {
  const sr = 16000, n = Math.floor(pcm48.length / 3), x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = (pcm48[3 * i] + pcm48[3 * i + 1] + pcm48[3 * i + 2]) / 3;
  const N = 640, hop = 160, frames = Math.max(0, Math.floor((n - N) / hop) + 1), rms = new Float32Array(frames);
  for (let f = 0; f < frames; f++) { let s = 0; for (let i = 0; i < N; i++) { const v = x[f * hop + i]; s += v * v; } rms[f] = Math.sqrt(s / N) + 1e-9; }
  const sorted = Float32Array.from(rms).sort(), gate = (sorted[Math.floor(0.6 * (frames - 1))] || 0) * 0.35;
  const lo = Math.floor(sr / 300), hi = Math.floor(sr / 60), f0 = [], lv = [], fr = new Float32Array(N);
  for (let f = 0; f < frames; f++) {
    if (rms[f] <= gate) continue;
    let mean = 0; for (let i = 0; i < N; i++) mean += x[f * hop + i]; mean /= N;
    for (let i = 0; i < N; i++) fr[i] = x[f * hop + i] - mean;
    let ac0 = 0; for (let i = 0; i < N; i++) ac0 += fr[i] * fr[i];
    if (ac0 <= 0) continue;
    let best = -Infinity, lag = lo;
    for (let L = lo; L < hi; L++) { let s = 0; for (let i = 0; i + L < N; i++) s += fr[i] * fr[i + L]; if (s > best) { best = s; lag = L; } }
    if (best / ac0 > 0.45) { f0.push(sr / lag); lv.push(20 * Math.log10(rms[f])); }
  }
  if (f0.length < 20) return { pitch_st_sd: null, note: 'too little voiced audio to measure' };
  const pct = (a, p) => { const s = [...a].sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.max(0, Math.round(p / 100 * (s.length - 1))))]; };
  const med = pct(f0, 50), st = f0.map(f => 12 * Math.log2(f / med)).filter(v => Math.abs(v) < 12);
  const m = st.reduce((a, b) => a + b, 0) / st.length, sd = Math.sqrt(st.reduce((a, b) => a + (b - m) ** 2, 0) / st.length);
  return { seconds: +(pcm48.length / SR).toFixed(2), median_f0_hz: +med.toFixed(1), pitch_st_sd: +sd.toFixed(2), pitch_range_st: +(pct(st, 95) - pct(st, 5)).toFixed(1), loud_range_db: +(pct(lv, 95) - pct(lv, 10)).toFixed(1) };
}

// ---------------- music: CC BY library ----------------
const FEELS = ['Dark', 'Grooving', 'Relaxed', 'Bright', 'Calming', 'Bouncy', 'Driving', 'Mysterious', 'Intense', 'Eerie', 'Unnerving', 'Somber', 'Mystical', 'Uplifting', 'Humorous', 'Epic', 'Action', 'Suspenseful', 'Aggressive'];
// old plans name one of the synth styles: map each to library feels and a bpm band
const STYLE_FEEL = { calm: { feel: 'Calming Relaxed Bright', bpm: '70-100' }, driving: { feel: 'Driving Bright Uplifting', bpm: '90-115' },
  epic: { feel: 'Epic Driving Intense', bpm: '80-130' }, toon: { feel: 'Humorous Bouncy', bpm: '100-140' } };
export const MUSIC_FEELS = FEELS.join(', ');
export function musicSpec(m) {
  const o = typeof m === 'string' ? (STYLE_FEEL[m] || STYLE_FEEL.driving) : { ...STYLE_FEEL.driving, ...(m || {}) };
  const feels = String(o.feel || '').split(/[\s,]+/).map(w => FEELS.find(f => f.toLowerCase() === w.toLowerCase())).filter(Boolean);
  const b = String(o.bpm || '').match(/(\d+)\s*-\s*(\d+)/);
  return { feels: feels.length ? feels : ['Driving', 'Bright'], bpm: b ? [+b[1], +b[2]] : [0, 1e9], synth: typeof m === 'string' && STYLE_FEEL[m] ? m : 'driving', payoffShot: +o.payoff_shot || 0 };
}
const secsOf = s => { const p = String(s || '0:0').split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0); };
async function catalogue() {
  const f = path.join(CACHE, 'incompetech_pieces.json');
  if (!fs.existsSync(f) || Date.now() - fs.statSync(f).mtimeMs > 30 * 86400e3) {
    const r = await fetch('https://incompetech.com/music/royalty-free/pieces.json', { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
    if (!r.ok) throw new Error(`incompetech catalogue HTTP ${r.status}`);
    fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
// a track scores one point per matching feel; ties go to the closer bpm, then the newer upload (cutroom music_find.py)
export async function findMusic(spec, minLen, n = 8) {
  const want = new Set(spec.feels.map(f => f.toLowerCase())), [blo, bhi] = spec.bpm, mid = bhi < 1e9 ? (blo + bhi) / 2 : null;
  const rows = [];
  for (const p of await catalogue()) {
    const L = secsOf(p.length), b = +p.bpm || 0;
    if (L < minLen || b < blo || b > bhi) continue;
    const score = (p.feel || '').split(',').map(s => s.trim().toLowerCase()).filter(s => want.has(s)).length;
    if (!score) continue;
    rows.push({ score, d: mid == null ? 0 : Math.abs(b - mid), y: +(String(p.uploaded || '0').slice(0, 4)) || 0, p, L });
  }
  rows.sort((a, b) => b.score - a.score || a.d - b.d || b.y - a.y);
  return rows.slice(0, n).map(({ p, L }) => ({ title: p.title, feel: p.feel, bpm: +p.bpm, length_s: L, isrc: p.isrc, url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/' + encodeURIComponent(p.filename) }));
}
// downloads go through a shared cache (a track is fetched once per machine) with a 150 s deadline each
export async function downloadTrack(t) {
  const dir = path.join(CACHE, 'music'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, t.title.replace(/[^\w .()'-]+/g, '_') + '.mp3');
  if (fs.existsSync(f)) return f;
  const r = await fetch(t.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(150000) });
  if (!r.ok) throw new Error(`download HTTP ${r.status}`);
  fs.writeFileSync(f + '.part', Buffer.from(await r.arrayBuffer())); fs.renameSync(f + '.part', f);
  return f;
}
export const creditLine = t => `"${t.title}" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0, https://creativecommons.org/licenses/by/4.0/`;

// ---------------- music: Lyria 3 (OpenRouter) ----------------
export async function lyria(key, out, secs, mood) {
  const model = secs <= 30 ? 'google/lyria-3-clip-preview' : 'google/lyria-3-pro-preview';
  const prompt = `Instrumental only, no vocals, no singing, no spoken words. About ${Math.round(secs)} seconds long. ${mood} Clean ending on a held chord (no fade-out needed). Leave room in the mid frequencies for a narrator's voice.`;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(600000),
    body: JSON.stringify({ model, modalities: ['text', 'audio'], audio: { format: 'mp3' }, stream: true, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Lyria HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const chunks = []; let usd = null, buf = '';
  for await (const part of res.body) {
    buf += Buffer.from(part).toString('utf8');
    let i; while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
      const j = JSON.parse(line.slice(6));
      if (j.error) throw new Error('Lyria: ' + JSON.stringify(j.error).slice(0, 300));
      for (const c of j.choices || []) if (c.delta?.audio?.data) chunks.push(c.delta.audio.data);
      if (j.usage) usd = j.usage.cost ?? usd;
    }
  }
  if (!chunks.length) throw new Error('Lyria returned no audio');
  fs.writeFileSync(out, Buffer.from(chunks.join(''), 'base64'));
  return { file: out, model, usd: usd || (model.includes('clip') ? 0.04 : 0.08), prompt };
}

// ---------------- fit the track to the reel (cutroom music_fit.py) ----------------
async function envDb(file) {
  const sr = 8000, raw = await run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(sr), '-'], { collect: true });
  const x = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + Math.floor(raw.length / 4) * 4)), hop = sr / 2, n = Math.floor(x.length / hop), db = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < hop; k++) { const v = x[i * hop + k]; s += v * v; } db[i] = 20 * Math.log10(Math.sqrt(s / hop + 1e-10)); }
  return { sm: smooth(db, 6), length: n * 0.5 };
}
const smooth = (a, k) => Float64Array.from(a, (_, i) => { let s = 0, c = 0; for (let j = i - Math.floor(k / 2); j < i - Math.floor(k / 2) + k; j++) if (j >= 0 && j < a.length) { s += a[j]; c++; } return s / c; });
const pmean = a => 10 * Math.log10(a.reduce((s, v) => s + 10 ** (v / 10), 0) / Math.max(1, a.length) + 1e-12);
// for every start offset (0.5 s steps), over the reel window:
//   rise_db    loudness around the payoff (payoff-2 .. payoff+3 s) minus that of the first third   GATE -1..10 dB
//   peak_gap_s distance from the payoff to the window's loudest moment                              GATE <= 6 s
//   quiet_s    seconds before the music first comes within 6 dB of its loudest 3 s                   GATE <= 4 s
//   covers     the track lasts the whole reel from that start                                        GATE true
// Calibrated by cutroom 2026-11-16: their "great" motivation reel passes as made; every eval reel failed as made and passed with a fitted start.
export async function fitTrack(file, dur, payoff) {
  const { sm, length } = await envDb(file), hop = 0.5, need = Math.ceil(dur / hop);
  const starts = []; if (length >= dur) for (let s = 0; s <= length - dur + 1e-6; s += hop) starts.push(s); else starts.push(0);
  let best = null;
  for (const s of starts) {
    const i0 = Math.round(s / hop), w = sm.slice(i0, i0 + need);
    if (w.length < 4) continue;
    const third = pmean(Array.from(w.slice(0, Math.max(1, Math.floor(w.length / 3)))));
    const a = Math.floor(Math.max(0, payoff - 2) / hop), b = Math.floor(Math.min(dur, payoff + 3) / hop) + 1;
    const near = b > a ? pmean(Array.from(w.slice(a, b))) : pmean(Array.from(w));
    const loud = smooth(w, 6), top = Math.max(...loud), q = loud.findIndex(v => v >= top - 6) * hop;
    let am = 0; for (let i = 1; i < w.length; i++) if (w[i] > w[am]) am = i;
    const gap = Math.abs(am * hop - payoff), rise = near - third;
    const score = Math.min(rise, 6) - Math.max(0, -1 - rise) * 2 - Math.max(0, rise - 10) * 2 - Math.max(0, q - 4) - 0.4 * Math.max(0, gap - 2);
    const r = { file, start: +s.toFixed(1), rise_db: +rise.toFixed(1), peak_gap_s: +gap.toFixed(1), quiet_s: +q.toFixed(1), covers: length - s >= dur - 0.05, track_s: +length.toFixed(1), score: +score.toFixed(2) };
    if (!best || r.score > best.score) best = r;
  }
  best.pass = best.rise_db >= -1 && best.rise_db <= 10 && best.peak_gap_s <= 6 && best.quiet_s <= 4 && best.covers;
  return best;
}

// choose the bed: library candidates fitted 3 at a time, then Lyria, then the synth. The choice is kept in <work>/music.json,
// so a resumed run or a director round reuses the same track (refitted to the new length).
export async function pickMusic({ key, plan, dur, payoff, workDir, source = 'library' }) {
  const spec = musicSpec(plan.music), saved = path.join(workDir, 'music.json');
  const synth = () => {
    const n = Math.ceil(dur * SR), [L, R] = synthMusic(n, spec.synth), f = path.join(workDir, 'music_synth.wav');
    writeWavStereo(f, L, R);
    return { source: 'synth', file: f, title: `procedural (${spec.synth})`, credit: null, fit: { start: 0, pass: null }, usd: 0 };
  };
  if (source === 'synth') return synth();
  const prev = fs.existsSync(saved) ? JSON.parse(fs.readFileSync(saved, 'utf8')) : null;
  if (prev && prev.source !== 'synth' && fs.existsSync(prev.file)) {
    const fit = await fitTrack(prev.file, dur, payoff);
    return { ...prev, fit, usd: 0 };
  }
  const tried = []; let usd = 0;
  if (source === 'library') {
    let cands = [];
    try { cands = await findMusic(spec, dur + 5, 9); } catch (e) { log(`music: library search failed (${e.message.slice(0, 80)})`); }
    if (!cands.length) log(`music: no library track for feel "${spec.feels.join(' ')}" bpm ${spec.bpm.join('-')} at least ${Math.ceil(dur + 5)} s`);
    for (let i = 0; i < cands.length && !tried.some(t => t.fit.pass); i += 3) {
      const batch = await Promise.all(cands.slice(i, i + 3).map(async t => {
        try { const file = await downloadTrack(t); return { source: 'library', ...t, file, credit: creditLine(t), fit: await fitTrack(file, dur, payoff) }; }
        catch (e) { log(`music: ${t.title} skipped (${e.message.slice(0, 60)})`); return null; }
      }));
      tried.push(...batch.filter(Boolean));
    }
  }
  if (!tried.some(t => t.fit.pass) && key) { // cutroom source 2: say the energy at second 1 explicitly ("soft intro" prompts gave a 16.5 s quiet intro)
    try {
      const mood = `${spec.feels.join(', ')} instrumental bed${spec.bpm[1] < 1e9 ? `, ${spec.bpm[0]}-${spec.bpm[1]} BPM` : ''}. Energetic from the very first second, no slow or quiet intro; builds steadily to its peak at about ${Math.round(payoff)} seconds.`;
      const g = await lyria(key, path.join(workDir, 'music_lyria.mp3'), dur + 10, mood); usd += g.usd;
      tried.push({ source: 'lyria', title: `Lyria 3 (${g.model})`, file: g.file, credit: null, prompt: g.prompt, fit: await fitTrack(g.file, dur, payoff) });
    } catch (e) { log(`music: Lyria failed (${e.message.slice(0, 80)})`); }
  }
  if (!tried.length) { log('music: no track available; using the procedural synth'); return synth(); }
  tried.sort((a, b) => (b.fit.pass - a.fit.pass) || (b.fit.score - a.fit.score));
  for (const t of tried) log(`music candidate: ${t.title} from ${t.fit.start}s rise ${t.fit.rise_db} dB, peak ${t.fit.peak_gap_s}s from payoff, quiet ${t.fit.quiet_s}s, covers ${t.fit.covers} -> ${t.fit.pass ? 'PASS' : 'fail'}`);
  const pick = { ...tried[0], usd, candidates: tried.map(t => ({ title: t.title, ...t.fit, file: undefined })) };
  fs.writeFileSync(saved, JSON.stringify({ ...pick, usd: undefined }, null, 2));
  return pick;
}

// ---------------- mix (cutroom mix.py) ----------------
async function lufsOf(file) {
  const e = await new Promise(res => { const p = spawn('ffmpeg', ['-v', 'info', '-i', file, '-af', 'ebur128', '-f', 'null', '-']); let s = ''; p.stderr.on('data', d => { s += d; }); p.on('close', () => res(s)); });
  const m = [...e.matchAll(/^\s*I:\s*(-?[\d.]+|-inf)\s*LUFS/gm)].pop();
  return m && m[1] !== '-inf' ? +m[1] : null;
}
async function pcm16(file) {
  const raw = await run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], { collect: true });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + Math.floor(raw.length / 4) * 4));
}
const rmsDb = (x, mask) => { let s = 0, c = 0; for (let i = 0; i < x.length; i++) if (mask[i]) { s += x[i] * x[i]; c++; } return c ? 20 * Math.log10(Math.sqrt(s / c) + 1e-9) : null; };

// voice.wav / sfx.wav are mono or stereo float WAVs at reel length; the voice is set to -16 LUFS by a LINEAR gain (the same gain goes on the
// effects, so their balance against the voice is kept and word times never move). speech = [[start, end], ...] in reel seconds.
// bed: the music's loudness before the duck. cutroom's -15 put our music only ~6.6 dB under the voice (first test), so start at -20; it is corrected from the measurement anyway.
export async function mixReel({ voiceWav, sfxWav, musicFile, musicStart = 0, dur, speech, swells = [], out, bed = -20, ratio = 2.5 }) {
  const vI = await lufsOf(voiceWav), g = vI == null ? 0 : -16 - vI;
  const n = Math.ceil(dur * 16000), mask = new Uint8Array(n);
  for (const [a, b] of speech) for (let i = Math.max(0, Math.floor(a * 16000)); i < Math.min(n, Math.ceil(b * 16000)); i++) mask[i] = 1;
  const gap = Uint8Array.from(mask, (v, i) => (!v && i > 0.3 * 16000 ? 1 : 0));
  const vdb = rmsDb(await pcm16(voiceWav), mask) + g;
  const ducked = out.replace(/\.wav$/, '') + '.ducked_music.wav';
  const attempt = async bedL => {
    const sw = swells.map(t => `,volume=enable='between(t,${t.toFixed(2)},${(t + 1.2).toFixed(2)})':volume=1.58`).join('');
    const fc = `[0:a]volume=${g.toFixed(2)}dB,aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${dur},atrim=end=${dur},asplit=2[v][key];`
      + `[1:a]atrim=start=${musicStart},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=${bedL}:TP=-3:LRA=14,aresample=48000,asetpts=N/SR/TB,`
      + `afade=t=in:d=0.4,afade=t=out:st=${Math.max(0, dur - 1.8).toFixed(2)}:d=1.8${sw},apad=whole_dur=${dur},atrim=end=${dur}[m];`
      + `[m][key]sidechaincompress=threshold=0.03:ratio=${ratio}:attack=30:release=500:makeup=1[duck];[duck]asplit=2[d1][d2];`
      + `[2:a]volume=${g.toFixed(2)}dB,aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${dur},atrim=end=${dur}[s];`
      + `[v][d1][s]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.75:level=0,aresample=48000,asetpts=N/SR/TB,apad=whole_dur=${dur},atrim=end=${dur}[o];`
      + `[d2]atrim=end=${dur}[dm]`;
    await run('ffmpeg', ['-v', 'error', '-y', '-i', voiceWav, '-i', musicFile, '-i', sfxWav, '-filter_complex', fc,
      '-map', '[o]', '-ar', '48000', '-c:a', 'pcm_s16le', out, '-map', '[dm]', '-c:a', 'pcm_s16le', ducked]);
    const m = await pcm16(ducked), mdb = rmsDb(m, mask), gdb = rmsDb(m, gap);
    return { bed_lufs: bedL, voice_over_music_db: +(vdb - mdb).toFixed(1), music_in_gaps_db: gdb == null ? null : +(gdb - mdb).toFixed(1) };
  };
  // the duck is not linear, so the bed is corrected from the measured gap and re-mixed (at most 3 mixes; the closest to 12 dB is kept)
  let r = await attempt(bed), best = r;
  for (let k = 0; k < 2 && (r.voice_over_music_db < 10 || r.voice_over_music_db > 14); k++) {
    r = await attempt(+(r.bed_lufs + (r.voice_over_music_db - 12)).toFixed(1));
    if (Math.abs(r.voice_over_music_db - 12) < Math.abs(best.voice_over_music_db - 12)) best = r;
  }
  if (best !== r) best = await attempt(best.bed_lufs);
  fs.rmSync(ducked, { force: true });
  // single-pass loudnorm lands about 1 LU off on a sparse mix (measured -12.9 for -14): trim it linearly, the limiter keeps the peak
  let I = await lufsOf(out);
  if (I != null && Math.abs(I + 14) > 0.5) {
    const tmp = out.replace(/\.wav$/, '') + '.trim.wav';
    await run('ffmpeg', ['-v', 'error', '-y', '-i', out, '-af', `volume=${(-14 - I).toFixed(2)}dB,alimiter=limit=0.75:level=0`, '-ar', '48000', '-c:a', 'pcm_s16le', tmp]);
    fs.renameSync(tmp, out); I = await lufsOf(out);
  }
  const pass = best.voice_over_music_db >= 10 && best.voice_over_music_db <= 14;
  return { ...best, ratio, voice_gain_db: +g.toFixed(1), music_start: musicStart, swells, integrated_lufs: I, pass };
}
