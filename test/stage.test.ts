import assert from 'node:assert/strict';
import { test } from 'node:test';
import { body, KIT, openStage, validateShot, type Stage } from './fixtures/stage.ts';

// The stage's own globals, called inside the page (engine/stage_asset.html).
interface View {
  x: number;
  y: number;
  r: number;
  lon0: number;
  lat0: number;
}
declare function landPath(v: View, zoom?: number): Path2D;
declare function geo(lon: number, lat: number, v: View): [number, number, number];
declare const ctx: CanvasRenderingContext2D;
declare const WORLD: Record<string, number[][]>;

// one browser for the file; the tests run in order (each is awaited) and the last line closes it
const stage: Stage = await openStage();

const NEMO: [number, number] = [-123.4, -48.9];

await test('the Point Nemo view, Afro-Eurasia straddling the horizon, keeps Point Nemo as ocean', async () => {
  // Point Nemo cut 3 at 1.5 s: the globe faces Point Nemo, zoom 0.95 (var/investigation-2026-11-27/inv-globe, invert_parts.mjs)
  const view: View = { x: 540, y: 960, r: 500, lon0: -122.9, lat0: -48.9 };
  const r = await stage.page.evaluate(
    (v, [lon, lat]) => {
      const path = landPath(v, 0.95);
      const [x, y] = geo(lon, lat, v);
      // the longest land ring: Africa and Eurasia (1320 points)
      const ring = WORLD['land110']?.reduce((a, b) => (b.length > a.length ? b : a)) ?? [];
      let front = 0;
      for (let i = 0; i < ring.length; i += 2)
        if (geo(ring[i] ?? 0, ring[i + 1] ?? 0, v)[2] > 0) front++;
      return {
        nemoIsLand: ctx.isPointInPath(path, x, y, 'evenodd'),
        front,
        points: ring.length / 2,
      };
    },
    view,
    NEMO,
  );
  assert.ok(
    r.front > 0 && r.front < r.points,
    `Afro-Eurasia straddles the horizon (${String(r.front)} of ${String(r.points)} points in front)`,
  );
  assert.equal(r.nemoIsLand, false, 'Point Nemo is drawn as land');
});

await test('the globe land fill matches known land and ocean points from every side and at both data scales', async () => {
  // [lon, lat, land?], each far from any coast so the 1:110m outlines cannot move it
  const points: [number, number, boolean][] = [
    [13, 23, true], // Sahara
    [-55, -10, true], // Brazil
    [134, -25, true], // Australia
    [100, 62, true], // Siberia
    [68, 48, true], // Kazakhstan
    [40, -80, true], // Antarctica
    [-100, 40, true], // United States
    [-110, 60, true], // Canada
    [-40, 72, true], // Greenland
    [78, 22, true], // India
    [...NEMO, false],
    [-150, 5, false], // central Pacific
    [-160, 35, false], // North Pacific
    [-30, 0, false], // central Atlantic
    [-40, 40, false], // North Atlantic
    [-15, -40, false], // South Atlantic
    [75, -25, false], // Indian Ocean
    [20, -55, false], // Southern Ocean
    [160, -40, false], // Tasman Sea
    [0, 88, false], // Arctic Ocean
  ];
  const views: (View & { zoom: number })[] = [];
  for (const zoom of [1, 2])
    // r * zoom 500 draws the 1:110m land, 1000 the 1:50m land
    for (let lon0 = -180; lon0 < 180; lon0 += 30)
      for (const lat0 of [-75, -45, -15, 15, 45, 75])
        views.push({ x: 540, y: 960, r: 500, lon0, lat0, zoom });
  const wrong = await stage.page.evaluate(
    (vs, pts) => {
      const out: string[] = [];
      for (const v of vs) {
        const path = landPath(v, v.zoom);
        for (const [lon, lat, land] of pts) {
          const [x, y, z] = geo(lon, lat, v);
          if (z > 0.15 && ctx.isPointInPath(path, x, y, 'evenodd') !== land)
            out.push(
              `view ${String(v.lon0)},${String(v.lat0)} zoom ${String(v.zoom)}: ${String(lon)},${String(lat)} drawn as ${land ? 'ocean' : 'land'}`,
            );
        }
      }
      return out;
    },
    views,
    points,
  );
  assert.deepEqual(wrong, []);
});

const sun = body('sun', '#ffcf4d');
const earth = body('earth', '#3a7bd5');
const moon = body('moon', '#c9c9c9');
const cover = (errors: string[]): string[] => errors.filter((e) => e.includes('solid rectangle'));

await test('a big clipped body passes the cover check', async () => {
  // the Sun reel's horizon shot (kurzgesagt, ratio 109): the Sun at R 763 centred below the frame, Earth a 7 px dot above it
  const code = `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('sun', 540, 1790 - 60 * lt / sh.dur, 763 / 272);
    h.asset('earth', 473, 840, 7 / 272);
  }`;
  const r = await validateShot(stage, { code, assets: [sun, earth], ck: { hero: 'sun' } });
  assert.deepEqual(cover(r.errors), []);
});

await test('a solid rectangle over the frame still fails the cover check, also in an opaque rgba colour', async () => {
  for (const colour of ['#334455', 'rgba(51, 68, 85, 0.9)']) {
    const code = `function draw(ctx, lt, sh, h, kit) {
      kit.bg(ctx, lt);
      ctx.fillStyle = '${colour}'; ctx.fillRect(0, 0, h.W, h.H);
      h.asset('earth', 540, 900 + 40 * lt, 300 / 272);
    }`;
    const r = await validateShot(stage, { code, assets: [earth], ck: { hero: 'earth' } });
    assert.equal(cover(r.errors).length, 1, `${colour}: ${r.errors.join(' | ')}`);
    assert.match(cover(r.errors)[0] ?? '', /over 100% of the frame/);
  }
});

await test('a see-through tint over the frame passes the cover check', async () => {
  const code = `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fillRect(0, 0, h.W, h.H);
    h.asset('earth', 540, 900 + 40 * lt, 300 / 272);
  }`;
  const r = await validateShot(stage, { code, assets: [earth], ck: { hero: 'earth' } });
  assert.deepEqual(cover(r.errors), []);
});

await test('a shot that crashes does not fail the cover check of the next shot', async () => {
  // engine logs: 18 of 21 "solid rectangle over 100%" rejections came right after a crashed attempt of the same shot
  const crash = `function draw(ctx, lt, sh, h, kit) { kit.bg(ctx, lt); h.asset('earth', 540, 900, 1); throw new Error('boom'); }`;
  const fine = `function draw(ctx, lt, sh, h, kit) { kit.bg(ctx, lt); h.asset('earth', 540, 900 + 40 * lt, 1); }`;
  const first = await validateShot(stage, { code: crash, assets: [earth], ck: { hero: 'earth' } });
  assert.match(first.errors.join(' | '), /runtime error at lt=[\d.]+s: boom/);
  const next = await validateShot(stage, { code: fine, assets: [earth], ck: { hero: 'earth' } });
  assert.deepEqual(cover(next.errors), []);
});

await test('a NaN scale or position is a validator error that names the cause', async () => {
  const cases: [string, RegExp][] = [
    ["h.asset('earth', 540, 900 + 40 * lt, NaN);", /h\.asset\('earth', x, y, s\) got s = NaN/],
    [
      "const cam = [540, 900, 2]; h.asset('earth', cam.x, cam.y, cam[2]);",
      /got x = undefined, y = undefined/,
    ],
    [
      "const cam = { x: 540, y: 900, s: 2 }; ctx.translate(cam[0], cam[1]); ctx.scale(cam.s, cam.s); h.asset('earth', 0, 40 * lt, 1);",
      /ctx\.translate\(undefined, undefined\): a value is not a number/,
    ],
    ["ctx.scale(1 / 0, 1); h.asset('earth', 540, 900 + 40 * lt, 1);", /ctx\.scale\(Infinity, 1\)/],
  ];
  for (const [line, want] of cases) {
    const code = `function draw(ctx, lt, sh, h, kit) { kit.bg(ctx, lt); ${line} }`;
    const r = await validateShot(stage, { code, assets: [earth], ck: { hero: 'earth' } });
    assert.equal(r.ok, false, line);
    assert.ok(
      r.errors.some((e) => want.test(e)),
      `${line}: ${r.errors.join(' | ')}`,
    );
  }
});

// the subject-size rule's errors (before this rule was relative: "the largest subject is only N px")
const size = (errors: string[]): string[] => errors.filter((e) => /\bsubject\b/.test(e));

await test('small things at their true scale are not rejected by the subject-size rule', async () => {
  // the Earth and the Moon to scale, distance included: Earth R 16, Moon R 4.4, 30 Earth widths apart (old rule: 47 px < 380 px)
  const code = `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    const k = 1 + 0.01 * lt;
    h.asset('earth', 60, 900, 16 * k / 272);
    h.asset('moon', 60 + 30 * 32 * k, 900, 4.4 * k / 272);
  }`;
  const r = await validateShot(stage, { code, assets: [earth, moon], ck: { hero: 'earth' } });
  assert.deepEqual(size(r.errors), []);
});

await test('one small thing alone in the frame is still rejected by the subject-size rule', async () => {
  const code = `function draw(ctx, lt, sh, h, kit) { kit.bg(ctx, lt); h.asset('earth', 540, 900 + 10 * lt, 16 / 272); }`;
  const r = await validateShot(stage, { code, assets: [earth], ck: { hero: 'earth' } });
  assert.equal(size(r.errors).length, 1, r.errors.join(' | '));
});

await test('a NaN raised inside a kit function names the line of the shot that called it', async () => {
  // QC4 Jupiter shot 3: six attempts got "ctx.translate(NaN, undefined)" with no code line (the innermost frame was the kit's) (#87)
  const kit = KIT.replace(
    'return { palette,',
    'const spot = (ctx, x, y) => { ctx.save(); ctx.translate(x, y); ctx.fillRect(-5, -5, 10, 10); ctx.restore(); }; return { spot, palette,',
  );
  const code = `function draw(ctx, lt, sh, h, kit) {
  kit.bg(ctx, lt);
  const p = { x: 300, y: 400 };
  kit.spot(ctx, p[0] + 1);
}`;
  const r = await validateShot(stage, { code, kit });
  const nan = r.errors.find((e) => e.includes('ctx.translate(NaN, undefined)')) ?? '';
  assert.ok(
    nan.includes(
      'your code line 4: `kit.spot(ctx, p[0] + 1);`, raised inside the kit function it calls',
    ),
    nan,
  );
  const own = await validateShot(stage, {
    code: `function draw(ctx, lt, sh, h, kit) {
  kit.bg(ctx, lt);
  ctx.translate(NaN, 0);
}`,
  });
  const mine = own.errors.find((e) => e.includes('ctx.translate(NaN, 0)')) ?? '';
  assert.ok(mine.includes('your code line 3: `ctx.translate(NaN, 0);`)'), mine);
});

await stage.close();
