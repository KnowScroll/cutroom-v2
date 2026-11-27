// Composition and identity checks of the stage's validator (engine/stage_asset.html validateShot), on small shots reduced from the
// saved shot code of the investigated reels (var/investigation-2026-11-27): pills, a character drawn twice, bodies on each other,
// text under the caption, a planned thing never seen, an empty opening, and the overlaps a shot means.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ball, body, KIT, openStage, validateShot, type Stage } from './fixtures/stage.ts';

// the stage's helpers object, called inside the page after window.setup
interface Thing {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  handR?: [number, number];
}
declare const HK: {
  asset: (id: string, x: number, y: number, s: number, p?: Record<string, unknown>) => Thing;
  label: (t: Thing, side?: string, gap?: number) => [number, number];
  measure: (
    a: Thing,
    b?: Thing,
  ) => { from: [number, number]; to: [number, number]; length: number };
  toScale: (sizes: number[], px: number) => number[];
};
declare function setup(tl: unknown): Promise<boolean>;
declare function render(t: number, opts: { still: boolean }): void;
declare let TRACK: {
  texts: unknown[];
  assets: unknown[];
  bubbles?: { who: string; x0: number }[];
} | null;

const stage: Stage = await openStage();
const earth = body('earth', '#3a7bd5');
const moon = body('moon', '#c9c9c9');
const has = (errors: string[], re: RegExp): boolean => errors.some((e) => re.test(e));

await test('two name pills that touch are rejected; the same pills 20 px apart pass', async () => {
  // atom reel shot 5: the words were placed 34 px apart, but each pill is 26 px wider than its words on each side
  const shot = (gap: number) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('earth', 540, 840 + 20 * lt, 300 / 272);
    ctx.font = kit.font(42); const a = ctx.measureText('1 millimeter').width, b = ctx.measureText('100 picometers').width;
    const left = 540 - (a + b + ${String(gap)}) / 2;
    kit.tag(ctx, '1 millimeter', left + a / 2, 1280);
    kit.tag(ctx, '100 picometers', left + a + ${String(gap)} + b / 2, 1280);
  }`;
  const label = /the label "1 millimeter" .* overlaps the label "100 picometers"/;
  const touching = await validateShot(stage, { code: shot(34), assets: [earth] });
  assert.ok(has(touching.errors, label), touching.errors.join(' | '));
  assert.ok(
    !has(touching.errors, /^text "1 millimeter" overlaps/),
    'the words alone do not overlap',
  );
  const apart = await validateShot(stage, { code: shot(34 + 2 * 26 + 20), assets: [earth] });
  assert.ok(!has(apart.errors, label), apart.errors.join(' | '));
});

await test('a character drawn twice in one frame is rejected, by its who or by two anchors', async () => {
  // Norway reel shot 2: both countries drawn at their centres, then again beside the sign
  const twice = `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('ball', 300, 900 + 10 * lt, 0.8, { who: 'left', colour: '#c8102e' });
    h.asset('ball', 780, 900, 0.8, { who: 'right', colour: '#006aa7', flip: true });
    h.asset('ball', 300, 1350, 0.5, { who: 'left', colour: '#c8102e' });
  }`;
  const r = await validateShot(stage, { code: twice, assets: [ball] });
  assert.ok(has(r.errors, /^left is drawn 2 times in one frame/), r.errors.join(' | '));
  assert.ok(!has(r.errors, /^right is drawn/), r.errors.join(' | '));
  // the saved code had no who: it anchored the same speaker at both places
  const anchored = `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('ball', 300, 900 + 10 * lt, 0.8); h.anchor('left', 300, 700);
    h.asset('ball', 780, 900, 0.8, { flip: true }); h.anchor('right', 780, 700);
    h.asset('ball', 300, 1350, 0.5); h.anchor('left', 300, 1230);
  }`;
  const a = await validateShot(stage, { code: anchored, assets: [ball] });
  assert.ok(has(a.errors, /^left is anchored at 2 places in one frame/), a.errors.join(' | '));
});

await test('a body drawn over another body is rejected; an edge overlap or one marked front passes', async () => {
  // Moon reel shot 3: the Moon (R 150) and Earth (R 250) both start at x 540 and part only on the shot's last word
  const shot = (moonX: number, p = '') => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('earth', 540, 840 + 10 * lt, 250 / 272);
    h.asset('moon', ${String(moonX)}, 840 + 10 * lt, 150 / 272${p});
  }`;
  const cover = /"moon" .* covers \d+% of "earth"/;
  const on = await validateShot(stage, { code: shot(540), assets: [earth, moon] });
  assert.ok(has(on.errors, cover), on.errors.join(' | '));
  const edge = await validateShot(stage, {
    code: shot(540 + 250 + 150 - 60),
    assets: [earth, moon],
  });
  assert.ok(!has(edge.errors, /covers \d+% of/), edge.errors.join(' | '));
  // an eclipse: the Moon passes in front of a body on purpose
  const front = await validateShot(stage, {
    code: shot(540, ', { front: true }'),
    assets: [earth, moon],
  });
  assert.ok(!has(front.errors, /covers \d+% of/), front.errors.join(' | '));
});

await test('a small thing on a scenery asset is not an overlap', async () => {
  // globe reels: a marker sits on the globe (kind "scenery")
  const code = `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('earth', 540, 900, 450 / 272);
    h.asset('moon', 540 + 20 * lt, 900, 200 / 272);
  }`;
  const r = await validateShot(stage, { code, assets: [earth, moon], ck: { scenery: ['earth'] } });
  assert.ok(!has(r.errors, /covers \d+% of/), r.errors.join(' | '));
});

await test('text under the narrator caption is rejected; above it passes', async () => {
  // Moon reel shot 7: "29.5-day orbit" at y 1521 to 1568, where the caption panel is drawn
  const shot = (y: number) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('earth', 540, 840 + 20 * lt, 300 / 272);
    kit.title(ctx, '29.5 DAYS', 540, ${String(y)}, { size: 48 });
  }`;
  const under = await validateShot(stage, { code: shot(1580), assets: [earth] });
  assert.ok(
    has(under.errors, /^text "29\.5 DAYS" .* under the narrator caption/),
    under.errors.join(' | '),
  );
  const above = await validateShot(stage, { code: shot(1400), assets: [earth] });
  assert.ok(!has(above.errors, /under the narrator caption/), above.errors.join(' | '));
});

await test('an asset the storyboard puts in the shot but never shows is rejected', async () => {
  // Sun reel shot 6: "109 Earths" scaled twice came out 0.05 px wide
  const shot = (r: number) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('sun', 540, 900 + 10 * lt, 400 / 272);
    for (let i = 0; i < 5; i++) h.asset('earth', 380 + 80 * i, 1350, ${String(r)} / 272);
  }`;
  const sun = body('sun', '#ffcf4d');
  const never = /the storyboard puts "earth" in this shot, but it is never visible/;
  const tiny = await validateShot(stage, {
    code: shot(0.025),
    assets: [sun, earth],
    ck: { uses: ['sun', 'earth'] },
  });
  assert.ok(has(tiny.errors, never), tiny.errors.join(' | '));
  const seen = await validateShot(stage, {
    code: shot(4),
    assets: [sun, earth],
    ck: { uses: ['sun', 'earth'] },
  });
  assert.ok(!has(seen.errors, never), seen.errors.join(' | '));
});

await test('the reel opens on its subject: waiting for the last word is rejected, a pop on the first word passes', async () => {
  // atom reel shot 1: only stars until the sand popped in on the line's last word
  const shot = (word: string) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    const k = lt - h.cue('${word}');
    if (k > 0) h.asset('earth', 540, 900 + 10 * lt, 300 / 272 * Math.min(1, k / 0.25));
  }`;
  const empty = /^the reel opens on no subject/;
  const late = await validateShot(stage, { code: shot('speck'), assets: [earth], start: 0 });
  assert.ok(has(late.errors, empty), late.errors.join(' | '));
  const first = await validateShot(stage, { code: shot('Next'), assets: [earth], start: 0 });
  assert.ok(!has(first.errors, /the reel opens on/), first.errors.join(' | '));
  const later = await validateShot(stage, { code: shot('speck'), assets: [earth], start: 6 });
  assert.ok(
    !has(later.errors, /the reel opens on/),
    'only the opening shot must show its subject at once',
  );
});

await test('speech bubbles lean apart to miss each other, and are rejected when they cannot', async () => {
  const lines = [
    { who: 'left', text: 'We want our own king.', start: 0.3, end: 3.2 },
    { who: 'right', text: 'You cannot have one.', start: 0.5, end: 3.4 },
  ];
  const shot = (dx: number) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('ball', ${String(540 - dx / 2)}, 1100 + 10 * lt, 0.45, { who: 'left' });
    h.asset('ball', ${String(540 + dx / 2)}, 1100, 0.45, { who: 'right', flip: true });
  }`;
  const clash = /the speech bubbles of left and right overlap/;
  // 250 px apart: centred above each speaker the bubbles would overlap; shifted outwards they do not
  const apart = await validateShot(stage, { code: shot(250), assets: [ball], lines, dur: 4 });
  assert.ok(!has(apart.errors, clash), apart.errors.join(' | '));
  assert.ok(!has(apart.errors, /is not anchored/), 'who anchors the speaker');
  const close = await validateShot(stage, { code: shot(40), assets: [ball], lines, dur: 4 });
  assert.ok(has(close.errors, clash), close.errors.join(' | '));
  // one line after the other: each bubble keeps its place while the other one comes and goes
  const turns = [
    { who: 'left', text: 'We want our own king.', start: 0.3, end: 2.0 },
    { who: 'right', text: 'You cannot have one.', start: 2.1, end: 3.4 },
  ];
  const at = await stage.page.evaluate(
    async (tl, times) => {
      await setup(tl);
      return times.map((t) => {
        TRACK = { texts: [], assets: [] };
        render(t, { still: true });
        const b = TRACK.bubbles ?? [];
        TRACK = null;
        return Object.fromEntries(b.map((x) => [x.who, Math.round(x.x0)]));
      });
    },
    {
      W: 1080,
      H: 1920,
      kit: KIT,
      assets: [ball],
      shots: [{ start: 0, dur: 4, lines: turns, code: shot(250) }],
    },
    [1.0, 2.15, 2.25, 3.0],
  );
  assert.equal(
    at[1]?.['left'],
    at[0]?.['left'],
    `the left bubble stays when the right one appears: ${JSON.stringify(at)}`,
  );
  assert.equal(
    at[3]?.['right'],
    at[1]?.['right'],
    `the right bubble stays when the left one goes: ${JSON.stringify(at)}`,
  );
  assert.ok(
    at[1]?.['right'] !== undefined && at[2]?.['left'] !== undefined,
    'both bubbles show at 2.15 and 2.25 s',
  );
});

await test('h.asset returns the drawn box and hand points; the label, measure and true-scale helpers use them', async () => {
  const r = await stage.page.evaluate(
    async (tl) => {
      await setup(tl);
      const a = HK.asset('ball', 300, 900, 0.5, { flip: true });
      const b = HK.asset('ball', 800, 900, 0.5);
      return {
        a,
        label: HK.label(a),
        gap: HK.measure(a, b),
        own: HK.measure(a),
        scale: HK.toScale([12742, 3474], 500),
      };
    },
    { W: 1080, H: 1920, kit: KIT, assets: [ball], shots: [] },
  );
  const near = (x: number, want: number, what: string) => {
    assert.ok(Math.abs(x - want) <= 4, `${what}: ${String(x)}, want ${String(want)}`);
  };
  // the ball's disc is 400 px across at scale 1 (centre 20 px below the box centre): 200 px at scale 0.5, not the 320 px box
  near(r.a.x0, 200, 'left edge');
  near(r.a.x1, 400, 'right edge');
  near(r.a.y1, 1010, 'bottom edge');
  assert.deepEqual(r.a.handR, [200, 930], 'the right hand, mirrored by flip');
  near(r.label[1], r.a.y0 - 30, 'label above the drawn part');
  near(r.gap.from[0], 400, 'measure from the right edge of the left ball');
  near(r.gap.to[0], 700, 'to the left edge of the right ball');
  near(r.own.length, 200, 'a thing measured on its own spans its width');
  assert.deepEqual(
    r.scale.map((v) => Math.round(v)),
    [500, 136],
  );
});

await stage.close();
