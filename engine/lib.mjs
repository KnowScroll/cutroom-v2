// fastreel engine library: keys, MiniMax calls, Kokoro voice, headless-Chrome stage, video render, music and
// sound effects, small utilities. Imported by asset_reel.mjs and the engine tools; it has no CLI of its own.
// Keys are read at run time from the env file (never printed, never copied).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // repo root
const VAR = path.resolve(process.env.CUTROOM_VAR || path.join(HERE, 'var')); // runs/, cache/ live here
const TEMPLATE_DIR = path.resolve(process.env.CUTROOM_TEMPLATE_DIR || path.join(HERE, 'templates'));
const STAGE_URL = pathToFileURL(path.join(HERE, 'engine', 'stage_asset.html')).href;
const SR = 48000;
const PRICES = { // USD per million tokens (list prices, research 11)
  'MiniMax-M3.1-Flash': { in: 0.15, cached: 0.015, out: 0.60 },
  'MiniMax-M3': { in: 0.30, cached: 0.06, out: 1.20 },
};
const KOKORO_USD_PER_CHAR = 0.00000062; // DeepInfra via OpenRouter (spike V1)
const BANNED = /\b(Math\.random|Date|performance|document|window|globalThis|self|fetch|XMLHttpRequest|WebSocket|setTimeout|setInterval|requestAnimationFrame|eval|Function|import|localStorage|getImageData)\b/;
const T0 = performance.now();

// ---------------- small utilities ----------------
const log = (...a) => console.log(`[${((performance.now() - T0) / 1000).toFixed(1).padStart(6)}s]`, ...a);
const sha1 = s => crypto.createHash('sha1').update(s).digest('hex');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const str = (v, d = '') => (typeof v === 'string' ? v.trim() : v == null ? d : String(v).trim()) || d;
const slugify = s => str(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'reel';
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
function loadKeys() {
  const file = process.env.CUTROOM_ENV_FILE || path.join(HERE, '.env');
  const vars = {};
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      vars[m[1]] = v;
    }
  }
  return {
    minimax: process.env.MINIMAX_API_KEY || vars.MINIMAX_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY || vars.OPENROUTER_API_KEY,
    elevenlabs: process.env.ELEVENLABS_API_KEY || vars.ELEVENLABS_API_KEY,
  };
}

function run(cmd, args, { cwd, collect = false } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = [], err = [];
    p.stdout.on('data', d => { if (collect) out.push(d); });
    p.stderr.on('data', d => err.push(d));
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`${cmd} exited ${code}: ${Buffer.concat(err).toString().slice(-600)}`)));
  });
}

async function pool(tasks, n) {
  const results = []; let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, async () => {
    while (i < tasks.length) { const k = i++; results[k] = await tasks[k](); }
  }));
  return results;
}

async function withRetry(fn, tries = 3) {
  let last;
  for (let a = 0; a < tries; a++) {
    try { return await fn(); } catch (e) { last = e; if (e.noRetry) break; await new Promise(r => setTimeout(r, 1500 * (a + 1))); }
  }
  throw last;
}

function findChrome() {
  const c = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
  const hit = c.find(p => fs.existsSync(p));
  if (!hit) throw new Error('Chrome not found; set CHROME_PATH');
  return hit;
}

// Browser with every network request blocked except the local stage page and the files beside it: map data (world.js) and the 3D stages (three.js, stage3d.js, stage3d_lowpoly.js).
async function launchStage(STAGE_URL_ = STAGE_URL) {
  const STAGE_URL = STAGE_URL_, ALLOWED = new Set([STAGE_URL, ...['world.js', 'three.js', 'stage3d.js', 'stage3d_lowpoly.js'].map(f => new URL(f, STAGE_URL).href)]);
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--no-first-run', '--disable-extensions', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--force-device-scale-factor=1'] });
  // on Windows, puppeteer's close() can fail deleting its temp profile ("EBUSY ... lockfile") while another Chrome holds it;
  // the browser is already closed by then, so only the leftover temp folder remains: ignore that error
  const close0 = browser.close.bind(browser);
  browser.close = async () => { try { await close0(); } catch (e) { if (!/EBUSY|EPERM|ENOTEMPTY/.test(String(e && e.message))) throw e; } };
  const newPage = async () => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', r => (ALLOWED.has(r.url()) ? r.continue() : r.abort()));
    await page.goto(STAGE_URL);
    return page;
  };
  return { browser, newPage };
}

// ---------------- MiniMax ----------------
async function callMiniMax(key, { model, effort, system, messages, maxTokens }) {
  const body = { model, max_tokens: maxTokens, system, messages };
  if (/flash/i.test(model)) body.output_config = { effort };
  const res = await fetch('https://api.minimax.io/anthropic/v1/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300000),
  });
  const txt = await res.text();
  if (!res.ok) { const e = new Error(`MiniMax HTTP ${res.status}: ${txt.slice(0, 300)}`); e.noRetry = res.status < 500 && res.status !== 429; throw e; }
  const j = JSON.parse(txt);
  const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return { text, usage: j.usage || {}, stop: j.stop_reason };
}

function llmCost(model, u) {
  const p = PRICES[model] || PRICES['MiniMax-M3'];
  return ((u.input_tokens || 0) * p.in + (u.cache_read_input_tokens || 0) * p.cached + (u.output_tokens || 0) * p.out) / 1e6;
}

function extractJson(text) {
  const t = str(text).replace(/^```(?:json)?/i, '').replace(/```$/, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no JSON object found in the reply');
  const j = t.slice(a, b + 1);
  try { return JSON.parse(j); } catch (e) {
    // a bare "position 2924" let M3 return the same broken JSON three times: show it the spot (usually a " inside a string)
    const m = String(e.message).match(/position (\d+)/), at = m ? +m[1] : -1;
    if (at < 0) throw e;
    throw new Error(`${e.message}. The JSON breaks here: «${j.slice(Math.max(0, at - 90), at)}⟨HERE⟩${j.slice(at, at + 40)}». A double quote inside a string value must be written \\" or replaced by single quotes; check every string for quotes, then return the complete JSON`);
  }
}

function extractCode(text) {
  const m = str(text).match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/i);
  return (m ? m[1] : str(text)).trim();
}

// ---------------- voice (Kokoro via OpenRouter) ----------------
async function tts(key, text, voice) {
  const res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'hexgrad/kokoro-82m', input: text, voice, response_format: 'mp3', provider: { only: ['deepinfra'], allow_fallbacks: false } }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) { const e = new Error(`OpenRouter speech HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`); e.noRetry = res.status < 500 && res.status !== 429; throw e; }
  return Buffer.from(await res.arrayBuffer());
}

async function decodeMono(file) {
  const buf = await run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { collect: true });
  const ab = new ArrayBuffer(buf.length); new Uint8Array(ab).set(buf);
  return new Float32Array(ab);
}

function trimSilence(pcm, thr = 0.012) {
  let a = 0, b = pcm.length - 1;
  while (a < pcm.length && Math.abs(pcm[a]) < thr) a++;
  while (b > a && Math.abs(pcm[b]) < thr) b--;
  return { start: Math.max(0, a - Math.round(0.03 * SR)), end: Math.min(pcm.length, b + Math.round(0.08 * SR)) };
}

// ---------------- video (headless Chrome, parallel segments) ----------------
async function renderVideo(tl, outDir, opt) {
  const frames = Math.round(tl.total * tl.fps), W = Math.max(1, opt.workers), per = Math.ceil(frames / W);
  const segs = [];
  await Promise.all(Array.from({ length: W }, async (_, w) => {
    const a = w * per, b = Math.min(frames, (w + 1) * per);
    if (a >= b) return;
    const seg = path.join(outDir, `seg_${w}.mp4`); segs[w] = seg;
    const stage = await launchStage(opt.stageUrl || STAGE_URL);
    try {
      const page = await stage.newPage();
      await page.evaluate(t => window.setup(t), tl);
      const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(tl.fps), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-threads', '2', '-r', String(tl.fps), seg], { stdio: ['pipe', 'ignore', 'pipe'] });
      let ferr = ''; ff.stderr.on('data', d => { ferr += d; });
      const done = once(ff, 'close');
      for (let f = a; f < b; f++) {
        const d = await page.evaluate(t => window.frame(t), f / tl.fps);
        if (!ff.stdin.write(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'))) await once(ff.stdin, 'drain');
        if (w === 0 && (f - a) % 150 === 0) log(`render: worker 0 at ${f - a}/${b - a} frames`);
      }
      ff.stdin.end();
      const [code] = await done;
      if (code !== 0) throw new Error(`encoder exited ${code}: ${ferr.slice(-400)}`);
    } finally { await stage.browser.close(); }
  }));
  fs.writeFileSync(path.join(outDir, 'segments.txt'), segs.filter(Boolean).map(s => `file '${path.basename(s)}'`).join('\n'));
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', 'segments.txt', '-c', 'copy', 'video.mp4'], { cwd: outDir });
  return frames;
}

// ---------------- audio (procedural music + effects) ----------------
function noiseGen(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; }; }

function music(n, style) {
  const L = new Float32Array(n), R = new Float32Array(n), dur = n / SR, TAU = Math.PI * 2;
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  if (style === 'toon') { // bouncy pizzicato: plucked bass on every beat, chord stabs on off-beats, woodblock on 2 and 4
    const bpm = 116, beat = 60 / bpm, prog = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74], [67, 71, 74]], nz = noiseGen(9);
    const pluck = (s, f, len, amp, pan) => { for (let i = 0; i < len * SR && s + i < n; i++) { const tt = i / SR, v = (Math.sin(TAU * f * tt) + 0.3 * Math.sin(TAU * 2 * f * tt)) * Math.exp(-tt * 9) * amp * Math.min(1, tt / 0.003); L[s + i] += v * (1 - pan); R[s + i] += v * pan; } };
    for (let b = 0; b * beat < dur; b++) {
      const ch = prog[Math.floor(b / 4) % prog.length], s = Math.floor(b * beat * SR);
      pluck(s, midi(ch[0] - 24 + (b % 2 ? 7 : 0)), 0.35, 0.16, 0.5);
      const so = Math.floor((b + 0.5) * beat * SR); ch.forEach((m, k) => pluck(so, midi(m), 0.18, 0.045, 0.3 + 0.2 * k));
      if (b % 2 === 1) for (let i = 0; i < 0.05 * SR && s + i < n; i++) { const tt = i / SR, v = (Math.sin(TAU * 1250 * tt) * 0.5 + nz() * 0.2) * Math.exp(-tt * 90) * 0.12; L[s + i] += v; R[s + i] += v; }
      if (b % 8 === 6) [0, 0.25, 0.5].forEach((d, k) => pluck(Math.floor((b + d) * beat * SR), midi(ch[k % 3] + 12), 0.25, 0.05, 0.6));
    }
    for (let i = 0; i < n; i++) { const t = i / SR, g = clamp(t / 0.4) * clamp((dur - 0.2 - t) / 1.2); L[i] *= g; R[i] *= g; }
    return [L, R];
  }
  const bpm = style === 'epic' ? 84 : style === 'driving' ? 104 : 92, beat = 60 / bpm, chordLen = 8 * beat;
  const prog = style === 'calm' ? [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]] : [[57, 60, 64, 69], [53, 57, 60, 65], [50, 53, 57, 62], [52, 56, 59, 64]]; // Am F C G | Am F Dm E
  for (let c = 0; c < Math.ceil(dur / chordLen) + 1; c++) {
    const chord = prog[c % 4], t0 = c * chordLen, t1 = t0 + chordLen;
    const a = Math.max(0, Math.floor((t0 - 0.3) * SR)), b = Math.min(n, Math.floor((t1 + 1.2) * SR));
    for (let i = a; i < b; i++) {
      const t = i / SR, env = clamp((t - (t0 - 0.3)) / 0.9) * clamp(1 - (t - t1) / 1.2) * 0.05 * (1 + 0.12 * Math.sin(TAU * 0.25 * t));
      let l = 0, r = 0;
      for (let k = 0; k < 3; k++) { const f = midi(chord[k]); l += Math.sin(TAU * f * 0.9985 * t) + 0.25 * Math.sin(TAU * f * 2 * t); r += Math.sin(TAU * f * 1.0015 * t) + 0.25 * Math.sin(TAU * f * 2.003 * t); }
      const bass = (style === 'calm' ? 0.9 : 1.3) * Math.sin(TAU * midi(chord[0] - 24) * t);
      L[i] += env * (l + bass); R[i] += env * (r + bass);
    }
    const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
    for (let k = 0; k < 16; k++) {
      const f = midi(chord[pattern[k % 8]] + 12), s = Math.floor((t0 + k * beat / 2) * SR), e = Math.min(n, s + Math.floor(0.6 * SR)), pan = k % 2 ? 0.3 : 0.7;
      for (let i = s; i < e; i++) { const tt = (i - s) / SR, v = Math.sin(TAU * f * tt) * Math.exp(-tt * 7) * 0.05 * Math.min(1, tt / 0.004); L[i] += v * (1 - pan); R[i] += v * pan; }
    }
  }
  if (style !== 'calm') { // drums: kick, off-beat hats; epic adds a low tom on beat 3
    const nz = noiseGen(77), beats = Math.floor(dur / beat);
    for (let b = 2; b < beats; b++) { // start after the hook boom
      const s = Math.floor(b * beat * SR);
      const kick = style === 'driving' || b % 4 === 0 || b % 4 === 2;
      if (kick) { let ph = 0; for (let i = 0; i < 0.35 * SR && s + i < n; i++) { const tt = i / SR, f = 45 + 80 * Math.exp(-tt * 28); ph += TAU * f / SR; const v = Math.sin(ph) * Math.exp(-tt * 9) * 0.32; L[s + i] += v; R[s + i] += v; } }
      if (style === 'epic' && b % 4 === 2) { let ph = 0; for (let i = 0; i < 0.6 * SR && s + i < n; i++) { const tt = i / SR, f = 90 * Math.exp(-tt * 2); ph += TAU * f / SR; const v = Math.sin(ph) * Math.exp(-tt * 5) * 0.2; L[s + i] += v; R[s + i] += v; } }
      const hs = Math.floor((b + 0.5) * beat * SR); let lp = 0;
      for (let i = 0; i < 0.06 * SR && hs + i < n; i++) { const x = nz(); lp += 0.5 * (x - lp); const v = (x - lp) * Math.exp(-i / SR * 70) * 0.06; L[hs + i] += v * 0.8; R[hs + i] += v; }
    }
  }
  for (let i = 0; i < n; i++) { const t = i / SR, g = clamp(t / 1.5) * clamp((dur - 1 - t) / 2.5); L[i] *= g; R[i] *= g; }
  return [L, R];
}

function addSfx(L, R, at, kind, seed, o = {}) {
  const nz = noiseGen(seed), TAU = Math.PI * 2, gain = o.gain ?? 1;
  const put = (i, l, r) => { if (i >= 0 && i < L.length) { L[i] += l; R[i] += r; } };
  if (kind === 'whoosh') {
    const a = Math.floor((at - 0.28) * SR), len = Math.floor(0.5 * SR); let y = 0;
    for (let i = 0; i < len; i++) { const u = i / len, bell = Math.sin(Math.PI * u) ** 2; y += (0.02 + 0.22 * bell) * (nz() - y); const v = y * bell * 0.22 * gain; put(a + i, v * (1 - u * 0.6), v * (0.4 + u * 0.6)); }
  } else if (kind === 'riser') {
    const len = Math.floor((o.len || 1.2) * SR), a = Math.floor(at * SR); let y = 0, ph = 0;
    for (let i = 0; i < len; i++) { const u = i / len; y += (0.01 + 0.3 * u * u) * (nz() - y); ph += TAU * (180 + 900 * u * u) / SR; const v = (y * 0.35 + Math.sin(ph) * 0.05) * u * u * gain; put(a + i, v, v); }
  } else if (kind === 'boom' || kind === 'blast') {
    const big = kind === 'blast', len = Math.floor((big ? 2.2 : 1.3) * SR), a = Math.floor(at * SR); let ph = 0, y = 0;
    for (let i = 0; i < len; i++) {
      const tt = i / SR, f = 32 + 60 * Math.exp(-tt * 6); ph += TAU * f / SR;
      y += (big ? 0.12 : 0.06) * Math.exp(-tt * 3) * (nz() - y);
      const v = (Math.sin(ph) * 0.55 * Math.exp(-tt * (big ? 1.6 : 2.6)) + y * (big ? 1.2 : 0.7) * Math.exp(-tt * 2.5)) * gain;
      put(a + i, v, v);
    }
    if (big) addSfx(L, R, at + 0.25, 'whoosh', seed + 1, { gain: 1.4 });
  } else if (kind === 'pop') { // short punchy hit
    const a = Math.floor(at * SR); let ph = 0;
    for (let i = 0; i < 0.25 * SR; i++) { const tt = i / SR, f = 60 + 160 * Math.exp(-tt * 30); ph += TAU * f / SR; const v = (Math.sin(ph) * Math.exp(-tt * 14) * 0.6 + nz() * Math.exp(-tt * 60) * 0.25) * gain; put(a + i, v, v); }
  } else if (kind === 'zap') { // beam fire: falling buzzy sweep
    const a = Math.floor(at * SR), len = Math.floor(0.45 * SR); let ph = 0;
    for (let i = 0; i < len; i++) { const u = i / len, f = 900 * Math.pow(0.3, u); ph += TAU * f / SR; const v = (Math.sin(ph) + 0.4 * Math.sin(ph * 2.01) + 0.2 * Math.sign(Math.sin(ph * 0.5))) * 0.09 * (1 - u) * gain; put(a + i, v, v * 0.9); }
  } else if (kind === 'knock') { // wooden hammer knock
    const a = Math.floor(at * SR); let ph = 0;
    for (let i = 0; i < 0.12 * SR; i++) { const tt = i / SR; ph += TAU * (420 + 300 * Math.exp(-tt * 80)) / SR; const v = (Math.sin(ph) * 0.5 + nz() * 0.3 * Math.exp(-tt * 200)) * Math.exp(-tt * 40) * gain; put(a + i, v, v); }
  } else if (kind === 'splash') {
    const a = Math.floor(at * SR), len = Math.floor(0.9 * SR); let y = 0;
    for (let i = 0; i < len; i++) { const u = i / len; y += (0.35 - 0.3 * u) * (nz() - y); const v = y * Math.exp(-u * 4) * clamp(i / (0.01 * SR)) * 0.5 * gain; put(a + i, v * 0.9, v); }
  } else if (kind === 'thunder') {
    const a = Math.floor(at * SR), len = Math.floor(2.2 * SR); let y = 0, y2 = 0;
    for (let i = 0; i < len; i++) { const u = i / len; y += 0.04 * (nz() - y); y2 += 0.2 * (nz() - y2); const crack = i < 0.08 * SR ? y2 * 0.6 : 0; const v = (y * 3.2 * (1 - u) * (1 + 0.5 * Math.sin(u * 40)) + crack) * gain; put(a + i, v, v); }
  } else if (kind === 'hum') { // sustained beam hum
    const a = Math.floor(at * SR), len = Math.floor((o.len || 1) * SR); let ph = 0;
    for (let i = 0; i < len; i++) { const u = i / len, tt = i / SR; ph += TAU * (70 + 8 * Math.sin(tt * 9)) / SR; const env = clamp(tt / 0.15) * clamp((len - i) / (0.1 * SR)); const v = (Math.sin(ph) + 0.5 * Math.sin(ph * 2) + 0.3 * Math.sin(ph * 3.02)) * 0.07 * env * (1 + 0.3 * Math.sin(tt * 31)) * (0.8 + 0.4 * u) * gain; put(a + i, v, v); }
  }
}

function writeWavStereo(file, L, R) {
  const n = L.length, data = Buffer.alloc(n * 8), h = Buffer.alloc(44);
  for (let i = 0; i < n; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

export { callMiniMax, extractJson, extractCode, llmCost, launchStage, BANNED };
export { HERE, VAR, TEMPLATE_DIR, SR, KOKORO_USD_PER_CHAR, log, sha1, clamp, slugify, stamp, run, pool, withRetry, loadKeys, tts, decodeMono, trimSilence, renderVideo, music, addSfx, writeWavStereo };
