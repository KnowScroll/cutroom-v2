#!/usr/bin/env node
// Validate a checkpoint folder of the asset pipeline (plan.json, kit.js, asset_<id>.js, shot_<n>.js) with the same
// validators asset_reel.mjs uses, using real voice timings, and write preview images to <work>/review/.
//   node engine/check_work.mjs reels/<name>-work [--only kit|assets|shots|asset:<id>|shot:<n>]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { HERE, VAR, SR, sha1, pool, withRetry, loadKeys, tts, decodeMono, trimSilence, launchStage } from './lib.mjs';

const work = path.resolve(process.argv[2] || 'reels/f1-m3assets-work'), only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const rd = f => { const p = path.join(work, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };
const plan = JSON.parse(rd('plan.json')), kit = rd('kit.js'), rev = path.join(work, 'review'); fs.mkdirSync(rev, { recursive: true });
const want = k => !only || only === k || only.startsWith(k.split(':')[0] + ':') && only === k || (only === 'assets' && k.startsWith('asset:')) || (only === 'shots' && k.startsWith('shot:'));
const saveImg = (name, dataUrl) => dataUrl && fs.writeFileSync(path.join(rev, name), Buffer.from(dataUrl.split(',')[1], 'base64'));

function mouthEnv(pcm) {
  const hop = Math.round(SR / 30), n = Math.ceil(pcm.length / hop), rms = new Float32Array(n);
  for (let f = 0; f < n; f++) { let s = 0, c = 0; for (let i = f * hop; i < Math.min(pcm.length, (f + 1) * hop); i++) { s += pcm[i] * pcm[i]; c++; } rms[f] = Math.sqrt(s / Math.max(1, c)); }
  const mx = Math.max(...rms) || 1, env = []; let open = 0;
  for (let f = 0; f < n; f++) { const v = rms[f] / mx; open = open ? (v > 0.12 ? 1 : 0) : (v > 0.2 ? 1 : 0); env.push(open); }
  return env;
}

const key = loadKeys(), cacheDir = path.join(VAR, 'cache', 'voice'); fs.mkdirSync(cacheDir, { recursive: true });
const all = plan.shots.flatMap(s => s.lines);
const clips = await pool(all.map(ln => async () => {
  const voice = plan.cast[ln.who]?.voice || 'bm_george', file = path.join(cacheDir, `${sha1(`kokoro-82m|mp3|${voice}|${ln.text}`)}.mp3`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, await withRetry(() => tts(key.openrouter, ln.text, voice)));
  const pcm = await decodeMono(file), { start, end } = trimSilence(pcm), cut = pcm.subarray(start, end);
  return { dur: cut.length / SR, env: mouthEnv(cut) };
}), 3);
let k = 0, t = 0;
const shots = plan.shots.map((s, i) => { let lt = 0.35; const lines = s.lines.map((l, j) => { lt += j ? (l.gap_before ?? 0.22) : (+l.gap_before || 0); const c = clips[k++], o = { who: l.who, text: l.text, start: +lt.toFixed(3), end: +(lt + c.dur).toFixed(3), env: c.env }; lt += c.dur; return o; }); const o = { start: +t.toFixed(3), dur: +(lt + 0.6 + Math.max(0, Math.min(2, +s.hold || 0))).toFixed(3), lines, background: s.background }; t += o.dur; return o; }); // same timing as asset_reel.mjs timeline() (word times by letter share)
const assets = plan.assets.map(a => ({ ...a, code: rd(`asset_${a.id}.js`) }));
const tl = { W: 1080, H: 1920, fps: 30, total: t, kit, assets: assets.map(a => ({ id: a.id, w: a.w, h: a.h, code: a.code })), shots: [] };
console.log(`film length with real voices: ${t.toFixed(1)} s; shot lengths: ${shots.map(s => s.dur.toFixed(1)).join(', ')}`);

const stage = await launchStage(pathToFileURL(path.join(HERE, 'engine', 'stage_asset.html')).href);
const report = [];
try {
  const page = await stage.newPage();
  if (want('kit')) { if (!kit) report.push(['kit', false, ['kit.js missing']]); else { const r = await page.evaluate((c, st) => window.validateKit(c, st), kit, plan.style); saveImg('kit.jpg', r.preview); report.push(['kit', r.ok, r.errors]); } }
  for (const a of assets) if (want(`asset:${a.id}`)) {
    if (!a.code) { report.push([`asset:${a.id}`, false, ['file missing']]); continue; }
    const r = await page.evaluate((c, spec, kc) => window.validateAsset(c, spec, kc), a.code, a, kit);
    saveImg(`asset_${a.id}.jpg`, r.preview); if (r.ok && r.preview) fs.writeFileSync(path.join(work, `asset_${a.id}.preview`), r.preview);
    report.push([`asset:${a.id}`, r.ok, r.errors]);
  }
  for (const [i, s] of shots.entries()) if (want(`shot:${i + 1}`)) {
    const code = rd(`shot_${i + 1}.js`);
    if (!code) { report.push([`shot:${i + 1}`, false, ['file missing']]); continue; }
    const r = await page.evaluate((c, shot, tl2) => window.validateShot(c, shot, tl2), code, { ...s, code: null }, tl);
    saveImg(`shot_${i + 1}.jpg`, r.preview); report.push([`shot:${i + 1}`, r.ok, r.errors]);
  }
} finally { await stage.browser.close(); }
for (const [name, ok, errs] of report) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ': ' + errs.join(' | ')}`);
console.log(`previews: ${rev}`);
process.exit(report.every(r => r[1]) ? 0 : 1);
