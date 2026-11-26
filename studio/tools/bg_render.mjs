// Render a reel's style-kit background alone in the engine's own stage, to see what kit.bg really paints
// (it found the epoch-2 lowpoly bug: h.rng(seed) used as a number made every mountain NaN).
//   node studio/tools/bg_render.mjs var/runs/<slug>-work/kit.js out.png [background name] [lt seconds]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { launchStage } = await import(pathToFileURL(path.join(ROOT, 'engine', 'lib.mjs')).href);
const [kitFile, out, name = 'field', lt = '1'] = process.argv.slice(2);
const stage = await launchStage(pathToFileURL(path.join(ROOT, 'engine', 'stage_asset.html')).href + '?cpu');
const page = await stage.newPage();
const code = fs.readFileSync(kitFile, 'utf8');
const png = await page.evaluate((code, name, lt) => {
  // HK, ctx and cv are the stage's globals; the h helpers draw on the stage canvas
  const kit = new Function('h', `${code}\nreturn makeKit(h);`)(HK);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  kit.bg(ctx, lt, name);
  return cv.toDataURL('image/png');
}, code, name, +lt);
fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
console.log(out);
await stage.browser.close();
process.exit(0);
