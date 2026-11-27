// Continuity at the cuts on the stage (engine/stage_asset.html validateShot): shots are coded apart, so each is held to the plan's
// carried states, the shot before's "carry" at its first frame and its own at its last. Findings §G: at the atom reel's 16.4 s cut
// a small sand and a huge atom became a big sand and no atom, and every tag blinked out and popped in again at each cut; §B: the
// Earth:Moon ratio changed from shot to shot.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { body, openStage, validateShot, type Asset, type Stage } from './fixtures/stage.ts';

const stage: Stage = await openStage();
const earth = body('earth', '#3a7bd5');
const moon = body('moon', '#c9c9c9');
// one asset that shows several bodies, as kurzgesagt's "bodies" does: p.which says which
const bodies: Asset = {
  id: 'bodies',
  w: 800,
  h: 800,
  code: `function drawAsset(ctx, p, h, kit) { kit.body(ctx, 0, 0, 272, { base: p.which === 'moon' ? '#c9c9c9' : '#3a7bd5' }); }`,
};
const lines = [
  {
    who: 'narrator',
    text: 'Earth is almost four times as wide as the Moon.',
    start: 0.3,
    end: 3.6,
  },
];
const has = (errors: string[], re: RegExp): boolean => errors.some((e) => re.test(e));
const carryError = /is carried across the cut/;

// the cut between the two shots, as the plan states it: Earth and the Moon at their true size ratio, the Moon's name tag above it
const EARTH = 300 / 272;
const MOON = 82 / 272;
const carry = [
  { thing: 'earth', x: 380, y: 840, scale: EARTH },
  { thing: 'moon', x: 840, y: 840, scale: MOON },
  { label: 'Moon', x: 840, y: 728 },
];
// the shot before the cut: the pair arrives on the line and holds; `leave` shrinks the Moon away in the last 0.6 s instead
const before = (leave: boolean) => `function draw(ctx, lt, sh, h, kit) {
  kit.bg(ctx, lt);
  const k = h.clamp((lt - sh.lines[0].start) / 0.3), out = ${leave ? 'h.clamp((lt - (sh.dur - 0.6)) / 0.4)' : '0'};
  const e = h.asset('earth', 380, 840, ${String(EARTH)} * k);
  const m = h.asset('moon', 840, 840, ${String(MOON)} * k * (1 - out));
  if (k > 0) kit.tag(ctx, 'Earth', ...h.label(e));
  if (k > 0 && out < 1) kit.tag(ctx, 'Moon', ...h.label(m));
}`;
// the shot after the cut: it starts with the pair (the Moon at moonScale; pop: everything enters again from nothing), then pulls
// back after 1.5 s, which the plan lets it do
const after = (moonScale: number, pop = false) => `function draw(ctx, lt, sh, h, kit) {
  kit.bg(ctx, lt);
  const k = ${pop ? 'h.clamp(lt / 0.4)' : '1'}, z = 1 - 0.3 * h.easeInOut(h.clamp((lt - 1.5) / 1));
  const e = h.asset('earth', 540 + (380 - 540) * z, 840, ${String(EARTH)} * z * k);
  const m = h.asset('moon', 540 + (840 - 540) * z, 840, ${String(moonScale)} * z * k);
  ctx.globalAlpha = k; kit.tag(ctx, 'Earth', ...h.label(e)); kit.tag(ctx, 'Moon', ...h.label(m)); ctx.globalAlpha = 1;
}`;
const shot = (code: string, ck: Record<string, unknown>) =>
  validateShot(stage, { code, lines, dur: 4.4, assets: [earth, moon, bodies], ck });

await test('a carried thing that keeps its place and size at the cut passes, on both sides', async () => {
  const out = await shot(before(false), { carryOut: carry });
  assert.ok(out.ok, out.errors.join(' | '));
  const into = await shot(after(MOON), { carryIn: carry });
  assert.ok(into.ok, into.errors.join(' | '));
});

await test('a carried thing that jumps size at the cut is flagged', async () => {
  // the Moon drawn 150 px across instead of 82 beside the same Earth: the size ratio changes at the cut
  const r = await shot(after(150 / 272), { carryIn: carry });
  assert.ok(
    has(
      r.errors,
      /^"moon" is carried across the cut at x 840, y 840, scale 0\.30\d* .* but your first frame \(lt=0\.05s\) draws it at scale 0\.55\d*/,
    ),
    r.errors.join(' | '),
  );
  assert.ok(!has(r.errors, /^"earth" is carried/), 'Earth keeps its size');
});

await test('things and tags that enter again after the cut, or leave before it, are flagged', async () => {
  const pop = await shot(after(MOON, true), { carryIn: carry });
  assert.ok(
    has(pop.errors, /^"earth" is carried across the cut .* draws it at scale/),
    pop.errors.join(' | '),
  );
  assert.ok(
    has(pop.errors, /^the label "Moon" is carried across the cut .* shows it .*at opacity 0\.13/),
    pop.errors.join(' | '),
  );
  const leaves = await shot(before(true), { carryOut: carry });
  assert.ok(
    has(
      leaves.errors,
      /^"moon" is carried across the cut .* your last frame \(lt=4\.35s\) does not show it/,
    ),
    leaves.errors.join(' | '),
  );
  // without carried states (a cut the plan lets change) the same shots pass these checks
  for (const code of [after(MOON, true), before(true)]) {
    const r = await shot(code, {});
    assert.ok(!has(r.errors, carryError), r.errors.join(' | '));
  }
});

await test('one asset that shows several things is matched by its which', async () => {
  const two = (moonX: number, earthX: number) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('bodies', ${String(earthX)}, 840, ${String(EARTH)}, { which: 'earth' });
    h.asset('bodies', ${String(moonX)}, 840, ${String(MOON)}, { which: 'moon' });
  }`;
  const ck = {
    carryIn: [
      { thing: 'bodies', x: 380, y: 840, scale: EARTH, look: { which: 'earth' } },
      { thing: 'bodies', x: 840, y: 840, scale: MOON, look: { which: 'moon' } },
    ],
  };
  const kept = await shot(two(840, 380), ck);
  assert.ok(!has(kept.errors, carryError), kept.errors.join(' | '));
  // the Moon where Earth was and Earth where the Moon was: both are flagged, as the things they are
  const swapped = await shot(two(200, 840), ck);
  assert.ok(
    has(swapped.errors, /^"bodies" \(moon\) is carried .* draws it at x 200, y 840/),
    swapped.errors.join(' | '),
  );
  assert.ok(
    has(swapped.errors, /^"bodies" \(earth\) is carried .* draws it at x 840, y 840/),
    swapped.errors.join(' | '),
  );
});

await test('ghosted context carries at its planned opacity; a counter split into value and unit is one label', async () => {
  // the Moon kept as faint context at 40%, and the distance as a counter drawn in two calls (the number, then its unit)
  const faint = (alpha: number) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('earth', 380, 840, ${String(EARTH)});
    ctx.globalAlpha = ${String(alpha)}; h.asset('moon', 840, 840, ${String(MOON)}); ctx.globalAlpha = 1;
    kit.title(ctx, '384,400', 470, 1200, { size: 70 }); kit.title(ctx, 'KM', 690, 1200, { size: 70 });
  }`;
  const ck = {
    carryIn: [
      { thing: 'earth', x: 380, y: 840, scale: EARTH },
      { thing: 'moon', x: 840, y: 840, scale: MOON, alpha: 0.4 },
      { label: '384,400 KM', x: 540, y: 1200 },
    ],
  };
  const kept = await shot(faint(0.4), ck);
  assert.ok(!has(kept.errors, carryError), kept.errors.join(' | '));
  const full = await shot(faint(1), ck);
  assert.ok(
    has(
      full.errors,
      /^"moon" is carried across the cut .*opacity 0\.4 .* draws it at opacity 1\.00/,
    ),
    full.errors.join(' | '),
  );
});

await test('a carried label counts as said under "labels: from narration"', async () => {
  // the shot after the cut keeps the Moon's tag, but its own line never says "Moon"
  const quiet = [
    { who: 'narrator', text: 'Earth is almost four times as wide.', start: 0.3, end: 3.6 },
  ];
  const run = (ck: Record<string, unknown>) =>
    validateShot(stage, { code: after(MOON), lines: quiet, dur: 4.4, assets: [earth, moon], ck });
  const never = /label "Moon" uses words this shot's narration never says/;
  const alone = await run({ labels: 'from narration' });
  assert.ok(has(alone.errors, never), 'without the carry, the tag is not from this narration');
  const carried = await run({ labels: 'from narration', carryIn: carry });
  assert.ok(!has(carried.errors, never), carried.errors.join(' | '));
  assert.ok(!has(carried.errors, carryError), carried.errors.join(' | '));
});

await stage.close();
