// Purposeful motion on the stage (engine/stage_asset.html): a shot may hold still while its line explains what it shows, and the
// host adds its slow push-in only when the template asks (TL.zoom). Findings §P.7: every frame had to move and the host zoomed
// 3% over every shot, so shots moved without showing anything.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { body, KIT, openStage, validateShot, type Stage } from './fixtures/stage.ts';

declare function setup(tl: unknown): Promise<boolean>;
declare function render(t: number, opts: { still?: boolean }): void;

const stage: Stage = await openStage();
const earth = body('earth', '#3a7bd5');
const moon = body('moon', '#c9c9c9');
// the fixture kit with its stars fixed in place, so nothing moves unless the shot moves it
const stillKit = KIT.replace(' + lt * 90', '');
assert.notEqual(stillKit, KIT, 'the fixture kit draws drifting stars');

// a held comparison: Earth and the Moon pop in as the line starts, at their true size ratio, and hold while the line explains them
const held = `function draw(ctx, lt, sh, h, kit) {
  kit.bg(ctx, lt);
  const k = Math.min(1, Math.max(0, (lt - sh.lines[0].start) / 0.3));
  const e = h.asset('earth', 380, 840, (300 / 272) * k);
  const m = h.asset('moon', 840, 840, (82 / 272) * k);
  if (k > 0) { kit.tag(ctx, 'Earth', ...h.label(e)); kit.tag(ctx, 'Moon', ...h.label(m)); }
}`;
const comparison = [
  {
    who: 'narrator',
    text: 'Earth is almost four times as wide as the Moon.',
    start: 0.3,
    end: 3.6,
  },
];

await test('a held comparison while its line is spoken is not rejected', async () => {
  const r = await validateShot(stage, {
    code: held,
    kit: stillKit,
    lines: comparison,
    dur: 4.4,
    assets: [earth, moon],
  });
  assert.ok(!r.errors.some((e) => /not animated/.test(e)), r.errors.join(' | '));
  assert.ok(r.ok, r.errors.join(' | '));
});

// the frame at two moments of a still shot rendered as the video is (not the validator's still frames): identical unless the host zooms
const frames = (zoom?: number) =>
  stage.page.evaluate(
    async (tl) => {
      await setup(tl);
      const c = document.querySelector('canvas');
      const g = c?.getContext('2d');
      if (!c || !g) throw new Error('no stage canvas');
      const grab = (t: number) => {
        render(t, {});
        return Array.from(g.getImageData(0, 0, c.width, c.height).data);
      };
      const a = grab(0.5),
        b = grab(3.5);
      let d = 0;
      for (let i = 0; i < a.length; i += 4) d += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
      return d / (a.length / 4);
    },
    {
      W: 1080,
      H: 1920,
      kit: stillKit,
      assets: [earth],
      ...(zoom === undefined ? {} : { zoom }),
      shots: [
        {
          start: 0,
          dur: 4,
          lines: [],
          code: `function draw(ctx, lt, sh, h, kit) { kit.bg(ctx, lt); h.asset('earth', 540, 840, 300 / 272); }`,
        },
      ],
    },
  );

await test('the host zooms only when the template asks', async () => {
  assert.equal(
    await frames(),
    0,
    'no zoom by default: a still shot renders the same at 0.5 s and 3.5 s',
  );
  const z = await frames(0.03);
  assert.ok(z > 0.1, `a template asking for a 3% push-in gets it: ${String(z)}`);
});

await stage.close();
