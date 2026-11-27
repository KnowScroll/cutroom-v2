// h.planet (engine/stage_asset.html): any planet, moon or star as a lit sphere, for the globe-zoom template. Findings §A: the template
// could draw only the Earth, so a reel about Venus showed Africa. Tests draw on the stage canvas and read its pixels.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openStage, type Stage } from './fixtures/stage.ts';

// the stage's own globals, called inside the page
interface View {
  x: number;
  y: number;
  r: number;
  lon0: number;
  lat0: number;
}
interface Look {
  base: string;
  bands?: [number, number, string][];
  spots?: [number, number, number, string][];
  soft?: number;
  land?: string;
  coast?: string;
  atmo?: string;
  rings?: [number, number, string][];
  light?: [number, number, number] | false;
  night?: number;
}
declare function planet(v: View, o: Look): void;
declare function geo(lon: number, lat: number, v: View): [number, number, number];
declare function geoDist(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  R?: number,
): number;
declare const ctx: CanvasRenderingContext2D;

const stage: Stage = await openStage();

// draws one body on a black frame and returns the colour name of each asked pixel: red, green, blue, white, black or other
const draw = (v: View, look: Look, pts: [number, number][]) =>
  stage.page.evaluate(
    (vw, lk, ps) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 1080, 1920);
      planet(vw, lk);
      return ps.map(([x, y]) => {
        const [r = 0, g = 0, b = 0] = ctx.getImageData(x, y, 1, 1).data;
        if (r > 200 && g > 200 && b > 200) return 'white';
        if (r < 40 && g < 40 && b < 40) return 'black';
        return r > 200 && g < 80 && b < 80
          ? 'red'
          : g > 200 && r < 80 && b < 80
            ? 'green'
            : b > 200 && r < 80 && g < 80
              ? 'blue'
              : 'other';
      });
    },
    v,
    look,
    pts,
  );

await test('another body is drawn in its own colours with no Earth land, and the Earth with its real land', async () => {
  // the view faces the Sahara (13 E, 23 N); the central Atlantic (30 W, 0) is in view
  const v: View = { x: 540, y: 960, r: 400, lon0: 13, lat0: 23 };
  const [sahara, atlantic] = await stage.page.evaluate(
    (vw) =>
      [geo(13, 23, vw), geo(-30, 0, vw)].map(([x, y]): [number, number] => [
        Math.round(x),
        Math.round(y),
      ]),
    v,
  );
  assert.ok(sahara && atlantic);
  const body = await draw(v, { base: '#0000ff', bands: [[-90, -60, '#ff0000']], light: false }, [
    sahara,
    atlantic,
  ]);
  assert.deepEqual(body, ['blue', 'blue'], 'a body with no land option shows no land');
  const earth = await draw(v, { base: '#0000ff', land: '#00ff00', light: false }, [
    sahara,
    atlantic,
  ]);
  assert.deepEqual(
    earth,
    ['green', 'blue'],
    'the Earth: the Sahara is land and the Atlantic ocean',
  );
});

await test('bands and spots sit at their latitudes and longitudes on the sphere, seen from every side', async () => {
  const views: [number, number][] = [];
  for (const lon0 of [-170, 0, 95])
    for (const lat0 of [-90, -55, -15, 0, 30, 70, 90]) views.push([lon0, lat0]);
  const wrong = await stage.page.evaluate((vs) => {
    const out: string[] = [];
    const r = 400,
      cx = 540,
      cy = 960,
      deg = 180 / Math.PI;
    for (const [lon0, lat0] of vs) {
      // a spot reaching over the limb, a band crossing it and an ice cap at the south pole
      const spot: [number, number, number] = [lon0 + 75, lat0 > 60 ? 40 : -25, 30];
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 1080, 1920);
      planet(
        { x: cx, y: cy, r, lon0, lat0 },
        {
          base: '#0000ff',
          bands: [
            [20, 55, '#ff0000'],
            [-90, -70, '#ffffff'],
          ],
          spots: [[...spot, '#00ff00']],
          light: false,
        },
      );
      const img = ctx.getImageData(0, 0, 1080, 1920).data;
      const p0 = lat0 / deg,
        ny = -Math.cos(p0),
        nz = Math.sin(p0);
      const [sx, sy, sz] = geo(spot[0], spot[1], { x: 0, y: 0, r: 1, lon0, lat0 });
      for (let py = cy - r; py < cy + r; py += 9)
        for (let px = cx - r; px < cx + r; px += 9) {
          const X = (px + 0.5 - cx) / r,
            Y = (py + 0.5 - cy) / r,
            q = 1 - X * X - Y * Y;
          if (q < 0.03) continue;
          const Z = Math.sqrt(q),
            lat = Math.asin(Y * ny + Z * nz) * deg,
            d = Math.acos(Math.min(1, X * sx + Y * sy + Z * sz)) * deg;
          if ([d - spot[2], lat - 20, lat - 55, lat + 70].some((e) => Math.abs(e) < 1)) continue;
          const want =
            d < spot[2] ? 'green' : lat > 20 && lat < 55 ? 'red' : lat < -70 ? 'white' : 'blue';
          const i = (py * 1080 + px) * 4,
            R = img[i] ?? 0,
            G = img[i + 1] ?? 0,
            B = img[i + 2] ?? 0;
          const got =
            R > 200 && G > 200 && B > 200
              ? 'white'
              : R > 200
                ? 'red'
                : G > 200
                  ? 'green'
                  : B > 200
                    ? 'blue'
                    : 'other';
          if (got !== want)
            out.push(
              `view ${String(lon0)},${String(lat0)}: (${String(px)}, ${String(py)}) at lat ${lat.toFixed(1)} is ${got}, not ${want}`,
            );
        }
    }
    return out.slice(0, 12);
  }, views);
  assert.deepEqual(wrong, []);
});

await test('a spot that is exactly the far half leaves the near half bare; exactly the near half covers it', async () => {
  // its edge is the limb itself: the edge alone cannot tell which side it encloses
  const v: View = { x: 540, y: 960, r: 400, lon0: 30, lat0: 20 };
  const pts: [number, number][] = [
    [540, 960],
    [300, 1100],
  ];
  const far = await draw(
    v,
    { base: '#0000ff', spots: [[-150, -20, 90, '#00ff00']], light: false },
    pts,
  );
  assert.deepEqual(far, ['blue', 'blue']);
  const near = await draw(
    v,
    { base: '#0000ff', spots: [[30, 20, 90, '#00ff00']], light: false },
    pts,
  );
  assert.deepEqual(near, ['green', 'green']);
});

await test('the night side is the half facing away from the light, also when the light is behind the body', async () => {
  const wrong = await stage.page.evaluate(() => {
    const out: string[] = [];
    const r = 400,
      cx = 540,
      cy = 960;
    for (const L of [
      [-0.45, -0.5, 0.74],
      [0.8, -0.2, -0.5],
      [0, 1, 0],
    ]) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 1080, 1920);
      const [lx = 0, ly = 0, lz = 0] = L,
        m = Math.hypot(lx, ly, lz);
      planet(
        { x: cx, y: cy, r, lon0: 0, lat0: 0 },
        { base: '#ffffff', light: [lx, ly, lz], night: 0.95 },
      );
      const img = ctx.getImageData(0, 0, 1080, 1920).data;
      for (let py = cy - r; py < cy + r; py += 11)
        for (let px = cx - r; px < cx + r; px += 11) {
          const X = (px + 0.5 - cx) / r,
            Y = (py + 0.5 - cy) / r,
            q = 1 - X * X - Y * Y;
          if (q < 0.03) continue;
          const lit = (X * lx + Y * ly + Math.sqrt(q) * lz) / m;
          if (Math.abs(lit) < Math.sin((5 * Math.PI) / 180)) continue; // the soft terminator
          const v = img[(py * 1080 + px) * 4] ?? 0;
          if (lit > 0 ? v < 120 : v > 80)
            out.push(
              `light ${L.join(',')}: (${String(px)}, ${String(py)}) is ${String(v)} on the ${lit > 0 ? 'day' : 'night'} side`,
            );
        }
    }
    return out.slice(0, 12);
  });
  assert.deepEqual(wrong, []);
});

await test('rings: the near half passes in front of the body, the far half behind it', async () => {
  // seen from 25 degrees above the ring plane, the near half of a ring of radius R crosses the disc at y = 960 + R * r * sin(25)
  const r = 300,
    s0 = Math.sin((25 * Math.PI) / 180),
    R = 1.7;
  const got = await draw(
    { x: 540, y: 960, r, lon0: 0, lat0: 25 },
    { base: '#0000ff', rings: [[1.3, 2.1, '#ff0000']], light: false },
    [
      [540, Math.round(960 + R * r * s0)],
      [540, Math.round(960 - R * r * s0)],
      [540 + Math.round(R * r), 960],
      [540 + Math.round(1.15 * r), 960],
    ],
  );
  assert.deepEqual(
    got,
    ['red', 'blue', 'red', 'black'],
    'near half, far half, the ring beside the body, the gap inside it',
  );
});

await test('no NaN reaches a path from any side, and a view with a missing field is an error that says so', async () => {
  const r = await stage.page.evaluate(() => {
    const bad: string[] = [];
    const check = (k: string, a: number[]) => {
      if (!a.every((n) => Number.isFinite(n))) bad.push(`${k}(${a.map(String).join(', ')})`);
    };
    // every Path2D the stage makes while this runs records a point that is not a number (the canvas would skip it silently)
    const Plain = Path2D;
    class Checked extends Plain {
      moveTo(x: number, y: number) {
        check('moveTo', [x, y]);
        super.moveTo(x, y);
      }
      lineTo(x: number, y: number) {
        check('lineTo', [x, y]);
        super.lineTo(x, y);
      }
      arc(x: number, y: number, rad: number, a0: number, a1: number, ccw?: boolean) {
        check('arc', [x, y, rad, a0, a1]);
        super.arc(x, y, rad, a0, a1, ccw);
      }
    }
    globalThis.Path2D = Checked;
    const lights: ([number, number, number] | undefined)[] = [
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 0],
      undefined,
    ];
    try {
      for (const lat0 of [-90, -89.999, -45, 0, 1e-9, 45, 90])
        for (const lon0 of [-180, 0, 180, 359])
          for (const light of lights) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            planet(
              { x: 540, y: 960, r: 400, lon0, lat0 },
              {
                base: '#336699',
                bands: [
                  [-90, 90, '#ffffff'],
                  [-90, -89.9, '#ffffff'],
                  [89.9, 90, '#ffffff'],
                  [0, 0, '#ffffff'],
                  [-5, 5, '#ffffff'],
                ],
                spots: [
                  [0, 90, 10, '#ffffff'],
                  [0, -90, 179, '#ffffff'],
                  [lon0 + 90, 0, 0.001, '#ffffff'],
                  [lon0, lat0, 90, '#ffffff'],
                  [lon0 + 180, -lat0, 90, '#ffffff'],
                ],
                soft: 3,
                rings: [[1.2, 2, '#ffffff']],
                atmo: '#88aadd',
                ...(light ? { light } : {}),
              },
            );
          }
    } finally {
      globalThis.Path2D = Plain;
    }
    let missing = '';
    try {
      planet({ x: 540, y: 960, r: 400, lon0: Number.NaN, lat0: 0 }, { base: '#336699' });
    } catch (e) {
      missing = String(e);
    }
    return { bad: bad.slice(0, 8), missing, moonKm: geoDist(0, 0, 90, 0, 1737.4) };
  });
  assert.deepEqual(r.bad, []);
  assert.match(r.missing, /h\.planet: v\.x, v\.y, v\.r, v\.lon0 and v\.lat0 must be numbers/);
  assert.ok(
    Math.abs(r.moonKm - (Math.PI / 2) * 1737.4) < 0.01,
    'h.geoDist measures on the body of radius R',
  );
});

await stage.close();
