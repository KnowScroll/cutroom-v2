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
declare const ctx: CanvasRenderingContext2D;
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

await test('a rolling counter whose pill sits on a tag is rejected, though its value changes from frame to frame', async () => {
  // qc3-moon shot 4: the "hours" counter's pill over the "3,474 km" tag; the words alone do not overlap
  const code = `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('earth', 540, 840 + 20 * lt, 300 / 272);
    kit.tag(ctx, '3,474 km', 860, 1290);
    kit.tag(ctx, h.fmt(Math.round(60000 + 1000 * lt)) + ' hours', 810, 1342);
  }`;
  const r = await validateShot(stage, { code, assets: [earth] });
  assert.ok(
    has(r.errors, /^the label "3,474 km" .* overlaps the label "[\d,]+ hours"/),
    r.errors.join(' | '),
  );
});

await test('a tilted answer chip is checked on its own shape, not on its upright bounds', async () => {
  // Sun reel shot 7: the answer chip turned -3 degrees; its upright bounds reached the name pill under it, the chip did not
  const shot = (pillY: number) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('earth', 540, 900 + 20 * lt, 300 / 272);
    ctx.save(); ctx.translate(540, 270); ctx.rotate(-3 * Math.PI / 180);
    kit.panel(ctx, -420, -52.5, 840, 105); kit.title(ctx, 'ABOUT 109 ACROSS', 0, 0, { size: 60 });
    ctx.restore();
    kit.tag(ctx, 'Sun', 540, ${String(pillY)});
  }`;
  const label = /the label "ABOUT 109 ACROSS" .* overlaps the label "Sun"/;
  const clear = await validateShot(stage, { code: shot(372), assets: [earth] });
  assert.ok(!has(clear.errors, label), clear.errors.join(' | '));
  const touching = await validateShot(stage, { code: shot(345), assets: [earth] });
  assert.ok(has(touching.errors, label), touching.errors.join(' | '));
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

await test('see-through things neither cover nor are covered: a light beam, ghosted context behind the subject', async () => {
  // a beam at 35% over a body; breakdown-explainer's ghosted context (fill 15%, strokes 50%) behind its hero
  const beam = {
    id: 'beam',
    w: 300,
    h: 800,
    code: `function drawAsset(ctx, p, h, kit) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff6c0'; ctx.fillRect(-150, -400, 300, 800); }`,
  };
  const ghost = {
    id: 'ghost',
    w: 800,
    h: 800,
    code: `function drawAsset(ctx, p, h, kit) {
      ctx.beginPath(); ctx.arc(0, 0, 380, 0, 2 * Math.PI); ctx.globalAlpha = 0.15; ctx.fillStyle = '#9fb4c8'; ctx.fill();
      ctx.globalAlpha = 0.5; ctx.lineWidth = 10; ctx.strokeStyle = '#9fb4c8'; ctx.stroke();
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(-300, i * 90); ctx.lineTo(300, i * 90); ctx.stroke(); }
    }`,
  };
  const code = `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('ghost', 540, 900, 1);
    h.asset('earth', 540, 900 + 10 * lt, 250 / 272);
    h.asset('beam', 540, 900, 1);
  }`;
  const r = await validateShot(stage, { code, assets: [ghost, earth, beam] });
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
  // Sun reel shot 6: "109 Earths" scaled twice came out 0.05 px wide (copies get no ring, so they are still never seen); a thing
  // below the frame, at 20% opacity or at scale 0 neither. One thing alone at 0.05 px is a ringed dot (the next test)
  const shot = (y: number, r: number, alpha: number) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('sun', 540, 900 + 10 * lt, 400 / 272);
    ctx.globalAlpha = ${String(alpha)};
    for (let i = 0; i < 5; i++) h.asset('earth', 380 + 80 * i, ${String(y)}, ${String(r)} / 272);
    ctx.globalAlpha = 1;
  }`;
  const sun = body('sun', '#ffcf4d');
  const never = /the storyboard puts "earth" in this shot, but it is never visible/;
  const run = (y: number, r: number, alpha: number) =>
    validateShot(stage, {
      code: shot(y, r, alpha),
      assets: [sun, earth],
      ck: { uses: ['sun', 'earth'] },
    });
  for (const [y, r, alpha] of [
    [2100, 4, 1],
    [1350, 4, 0.2],
    [1350, 0, 1],
    [1350, 0.025, 1],
  ] as const) {
    const unseen = await run(y, r, alpha);
    assert.ok(
      has(unseen.errors, never),
      `y ${String(y)}, R ${String(r)}, alpha ${String(alpha)}: ${unseen.errors.join(' | ')}`,
    );
  }
  const seen = await run(1350, 4, 1);
  assert.ok(!has(seen.errors, never), seen.errors.join(' | '));
});

await test('a thing under R 3 is a bright dot with a ring: it counts as seen, carried and labelled, and its tags attach to the ring', async () => {
  // qc3-atom shots 3 to 6: an atom at true scale beside a hair (R 0.024) was never seen, its carry and its tag failed every attempt
  const atom = body('atom', '#9be7ff');
  const hair = body('hair', '#8a5a3c');
  const S = 0.0000882;
  const lines = [
    {
      who: 'narrator',
      text: 'A typical atom is a tiny point beside the hair.',
      start: 0.3,
      end: 3.4,
    },
  ];
  const code = `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('hair', 375, 1010 + 4 * lt, 240 / 272);
    const atom = h.asset('atom', 875, 1010, ${String(S)});
    kit.tag(ctx, 'Atom', ...h.label(atom, 'above', 50));
  }`;
  const ck = { uses: ['hair', 'atom'], carryOut: [{ thing: 'atom', x: 875, y: 1010, scale: S }] };
  const r = await validateShot(stage, { code, lines, assets: [hair, atom], ck });
  assert.ok(!has(r.errors, /"atom" in this shot, but it is never visible/), r.errors.join(' | '));
  assert.ok(!has(r.errors, /^"atom" is carried across the cut/), r.errors.join(' | '));
  assert.ok(!has(r.errors, /^the label "Atom" shows .* while its thing/), r.errors.join(' | '));
  const dotUnder = /^"atom" is under R 3 here, .* but the text "Atom" sits on that dot/;
  assert.ok(!has(r.errors, dotUnder), r.errors.join(' | '));
  // qc3-atom shot 3: its tag centred on the atom hid the dot
  const onDot = code.replace("...h.label(atom, 'above', 50)", '875, 1010');
  const hidden = await validateShot(stage, { code: onDot, lines, assets: [hair, atom], ck });
  assert.ok(has(hidden.errors, dotUnder), hidden.errors.join(' | '));
  // on the frame: a bright ring of R 25 and a dot at the thing's place, dark between them; h.asset returns the ring's box, in the
  // caller's coordinates (a camera zoom of 2 halves it); at scale 0 nothing is drawn
  const px = await stage.page.evaluate(
    async (tl, s) => {
      await setup(tl);
      render(1, { still: true });
      const lum = (x: number, y: number) => {
        const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        return ((d[0] ?? 0) + (d[1] ?? 0) + (d[2] ?? 0)) / 3;
      };
      const round = (x: number, y: number, rad: number) => {
        let sum = 0;
        for (let k = 0; k < 32; k++)
          sum += lum(
            x + rad * Math.cos((k * Math.PI) / 16),
            y + rad * Math.sin((k * Math.PI) / 16),
          );
        return sum / 32;
      };
      const box = HK.asset('atom', 875, 1010, s);
      ctx.save();
      ctx.translate(540, 960);
      ctx.scale(2, 2);
      const zoomed = HK.asset('atom', 0, 0, s);
      ctx.restore();
      const empty = round(300, 400, 25);
      const hidden = HK.asset('atom', 300, 400, 0);
      return {
        ring: round(875, 1010, 25),
        gap: round(875, 1010, 13),
        dot: lum(875, 1010),
        box,
        zoomed,
        hidden: { box: hidden, ring: round(300, 400, 25) - empty },
      };
    },
    {
      W: 1080,
      H: 1920,
      kit: KIT,
      assets: [hair, atom],
      shots: [{ start: 0, dur: 4, lines, code }],
    },
    S,
  );
  assert.ok(
    px.ring > px.gap + 60 && px.dot > px.gap + 60,
    `ring ${String(px.ring)}, dot ${String(px.dot)}, between ${String(px.gap)}`,
  );
  const near = (x: number, want: number, what: string) => {
    assert.ok(Math.abs(x - want) <= 1, `${what}: ${String(x)}, want ${String(want)}`);
  };
  near(px.box.x0, 850, 'ring box left');
  near(px.box.x1, 900, 'ring box right');
  near(px.box.y0, 985, 'ring box top');
  near(px.box.y1, 1035, 'ring box bottom');
  near(px.zoomed.x1 - px.zoomed.x0, 25, 'the ring box under a camera zoom of 2');
  near(px.hidden.box.x1 - px.hidden.box.x0, 0, 'scale 0: an empty box');
  near(px.hidden.ring, 0, 'scale 0: no ring drawn');
});

await test('a row of tiny copies stays at its true size, unringed; a big faint thing with a tiny solid core gets no ring', async () => {
  // kurzgesagt's copies view: up to 250 copies at r = 400 / N along the big one's middle, "a copy stays at its true r even under R 3"
  const sun = body('sun', '#ffcf4d');
  const row = (n: number) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('sun', 540, 900, 400 / 272);
    const r = 400 / 150, back = (t, s) => { t = h.clamp(t, 0, 1); return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
    // the row fills in 1.5 s, each copy popping in over 0.35 s: at lt 1 some have landed and some are still growing
    for (let i = 0; i < ${String(n)}; i++) h.asset('earth', 140 + r + 2 * r * i, 900, (r / 272) * back((lt - 0.01 * i) / 0.35, 2.5));
  }`;
  const ck = { uses: ['sun', 'earth'] };
  const r = await validateShot(stage, { code: row(150), assets: [sun, earth], ck });
  assert.ok(!has(r.errors, /"earth" in this shot, but it is never visible/), r.errors.join(' | '));
  const nebula = {
    id: 'nebula',
    w: 800,
    h: 800,
    code: `function drawAsset(ctx, p, h, kit) {
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#88aaff'; ctx.beginPath(); ctx.arc(0, 0, 300, 0, 2 * Math.PI); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 2 * Math.PI); ctx.fill();
    }`,
  };
  const px = await stage.page.evaluate(
    async (tls) => {
      // the mean brightness 24 px above the row, on the Sun's face: a ring of R 25 around each copy would cross it
      const above = async (tl: unknown) => {
        await setup(tl);
        render(1, { still: true });
        let sum = 0;
        for (let x = 200; x < 880; x += 4) {
          const d = ctx.getImageData(x, 876, 1, 1).data;
          sum += ((d[0] ?? 0) + (d[1] ?? 0) + (d[2] ?? 0)) / 3;
        }
        return sum / 170;
      };
      const copies = await above(tls[0]);
      const none = await above(tls[1]);
      await setup(tls[2]);
      return { copies, none, faint: HK.asset('nebula', 540, 600, 0.5) };
    },
    [150, 0, 0].map((n, i) => ({
      W: 1080,
      H: 1920,
      kit: KIT,
      assets: i < 2 ? [sun, earth] : [nebula],
      shots: [{ start: 0, dur: 4, lines: [], code: row(n) }],
    })),
  );
  assert.ok(
    Math.abs(px.copies - px.none) < 3,
    `above the row: ${String(px.copies)} with copies, ${String(px.none)} without`,
  );
  assert.ok(
    px.faint.x1 - px.faint.x0 < 10,
    `a faint thing's box is its core, not a ring: ${JSON.stringify(px.faint)}`,
  );
});

await test('two places on top of each other, or one place drawn twice, are rejected; places apart pass', async () => {
  // qc3-venus shot 3: the orbit view (the Sun, a small Venus) drawn over the full-frame Venus globe, and a third Venus beside it
  const globe = body('globe', '#d9a441');
  const sun = body('sun', '#ffcf4d');
  const shot = (more: string) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('globe', 540, 1000 + 4 * lt, 400 / 272);
    ${more}
  }`;
  const run = (more: string) =>
    validateShot(stage, {
      code: shot(more),
      assets: [globe, sun],
      ck: { scenery: ['globe', 'sun'] },
    });
  const inside = await run("h.asset('sun', 540, 900, 90 / 272);");
  assert.ok(
    has(inside.errors, /^"sun" \(.*\) is drawn on "globe" .*both are places/),
    inside.errors.join(' | '),
  );
  const twice = await run("h.asset('globe', 160, 300, 40 / 272);");
  assert.ok(
    has(
      twice.errors,
      /^"globe" is drawn 2 times at lt=\S+ \(.* at scale 1\.47\d*; .* at scale 0\.147\)/,
    ),
    twice.errors.join(' | '),
  );
  const apart = await run("h.asset('sun', 540, 330, 90 / 272);");
  assert.ok(!has(apart.errors, /is drawn on "globe"|is drawn \d times/), apart.errors.join(' | '));
});

await test('a place (scenery) hero is not held to acting beats; a character hero still is', async () => {
  // qc3-norway: the hero was its map; given acting beats, the coder flipped the map's highlight and broke the carry 3 times
  const map = body('map', '#c8102e');
  const code = `function draw(ctx, lt, sh, h, kit) { kit.bg(ctx, lt); h.asset('map', 540, 900, 400 / 272); }`;
  const run = (scenery: string[]) =>
    validateShot(stage, { code, assets: [map], ck: { hero: 'map', acting: 2, scenery } });
  const acts = /^the hero "map" barely acts/;
  const place = await run(['map']);
  assert.ok(!has(place.errors, acts), place.errors.join(' | '));
  const character = await run([]);
  assert.ok(has(character.errors, acts), character.errors.join(' | '));
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
