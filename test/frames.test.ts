import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { frameGates, measureFrames, type CaptionBand } from '../src/gates/frames.ts';
import type { Gate } from '../src/record.ts';

const CUTROOM_BAND: CaptionBand = { top: 1090, bottom: 1340 };

async function scratch(t: TestContext): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cutroom-frames-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

// A small lavfi video (270x480, 10 fps, lossless) so the frames are exactly what the graph draws.
async function video(t: TestContext, graph: string): Promise<string> {
  const out = join(await scratch(t), 'video.mkv');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', graph, '-c:v', 'ffv1', out], {
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  return out;
}

const grid = (seconds: number, size = '270x480'): string =>
  `color=c=gray:s=${size}:r=10:d=${String(seconds)},drawgrid=w=8:h=8:t=2:c=white`;

function gate(gates: readonly Gate[], name: string): Gate {
  const g = gates.find((x) => x.name === name);
  assert.ok(g, `no ${name} gate`);
  return g;
}

await test('a solid colour fails blank, flat and frame0; every gate is info', async (t) => {
  const path = await video(t, 'color=c=0x2a6f97:s=270x480:r=10:d=3');
  const m = await measureFrames(path, CUTROOM_BAND);
  const gates = frameGates(m);
  assert.deepEqual(
    gates.map((g) => g.name),
    ['same_view', 'frame0', 'blank', 'balance', 'flat', 'static_band', 'alive'],
  );
  assert.ok(gates.every((g) => g.mode === 'info'));
  assert.deepEqual(m.blankAt, [0, 1, 2]);
  assert.equal(gate(gates, 'blank').pass, false);
  assert.equal(gate(gates, 'flat').pass, false);
  assert.equal(gate(gates, 'flat').value, 1);
  assert.equal(gate(gates, 'frame0').pass, false);
  assert.equal(gate(gates, 'frame0').value, 0);
});

await test('a moving test pattern passes alive', async (t) => {
  const m = await measureFrames(await video(t, 'testsrc=s=270x480:r=10:d=5'), CUTROOM_BAND);
  const gates = frameGates(m);
  assert.equal(gate(gates, 'alive').pass, true);
  assert.deepEqual(m.alive.stillStretches, []);
  assert.equal(gate(gates, 'frame0').pass, true);
  assert.equal(gate(gates, 'blank').pass, true);
});

await test('a static top band over moving content fails static_band', async (t) => {
  const graph = `testsrc=s=270x480:r=10:d=16[bg];${grid(16, '270x140')}[top];[bg][top]overlay=0:0`;
  const m = await measureFrames(await video(t, graph), CUTROOM_BAND);
  assert.deepEqual(m.staticBand.top, { seconds: 16, fromS: 0 });
  assert.ok(m.staticBand.bottom.seconds <= 14);
  const band = gate(frameGates(m), 'static_band');
  assert.equal(band.pass, false);
  assert.equal(band.value, 16);
  assert.equal(gate(frameGates(m), 'alive').pass, true);
});

await test('a 20 s still fails same_view', async (t) => {
  const m = await measureFrames(await video(t, grid(20)), CUTROOM_BAND);
  assert.deepEqual(m.sameViewRuns, [[0, 20]]);
  const same = gate(frameGates(m), 'same_view');
  assert.equal(same.pass, false);
  assert.equal(same.value, 20);
});

await test('the caption band is left out of the picture', async (t) => {
  // A still grid whose only motion is a box flashing inside cutroom's caption band (y 1104-1328).
  const path = await video(
    t,
    `${grid(5)},drawbox=x=0:y=276:w=270:h=56:c=black:t=fill:enable='mod(n,2)'`,
  );
  const inBand = frameGates(await measureFrames(path, CUTROOM_BAND));
  assert.equal(gate(inBand, 'alive').pass, false);
  const elsewhere = frameGates(await measureFrames(path, { top: 300, bottom: 420 }));
  assert.equal(gate(elsewhere, 'alive').pass, true);
});

await test('a bad caption band or an unreadable video is an error', async (t) => {
  const missing = join(await scratch(t), 'none.mkv');
  await assert.rejects(measureFrames(missing, { top: 1340, bottom: 1090 }), RangeError);
  await assert.rejects(measureFrames(missing, CUTROOM_BAND), /ffmpeg exited/);
});
