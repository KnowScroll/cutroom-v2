// Timing checks of the stage's validator (engine/stage_asset.html validateShot) against the voice: a label or number lands with its
// words, a label shows only while its thing is visible, and a cued change lands at least 0.8 s before the shot ends. The cases come
// from the investigated reels (findings §B, §C, §P.5): number tags seconds late, tags over an empty stage, changes cut off by the cut.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { body, openStage, validateShot, type Line, type Stage } from './fixtures/stage.ts';

interface Said {
  v: number;
  said: string;
}
declare function saidToks(sh: { lines: Line[] }): unknown[];
declare function saidNumbers(toks: unknown[]): Said[];

const stage: Stage = await openStage();
const earth = body('earth', '#3a7bd5');
const sun = body('sun', '#ffcf4d');
const moon = body('moon', '#c9c9c9');
const has = (errors: string[], re: RegExp): boolean => errors.some((e) => re.test(e));

await test('the stage reads the numbers the voice says, in words or digits', async () => {
  const text =
    'Three hundred seventy-eight thousand kilometers, three thousand one hundred and fifty days, eight point six years, one point four million people, a hundred steps and 75,600 hours.';
  const got = await stage.page.evaluate(
    (t) => saidNumbers(saidToks({ lines: [t] })).map((n) => n.v),
    { who: 'narrator', text, start: 0.3, end: 9 },
  );
  assert.deepEqual(got, [378000, 3150, 8.6, 1400000, 100, 75600]);
});

// the number is said at the start of the line; its tag pops on the word, or 3 s later
const numberLine: Line[] = [
  {
    who: 'narrator',
    text: 'Three hundred eighty thousand kilometers of empty space lie between us and the Moon.',
    start: 0.3,
    end: 4.2,
  },
];
const numberShot = (delay: number) => `function draw(ctx, lt, sh, h, kit) {
  kit.bg(ctx, lt);
  h.asset('earth', 300, 840 + 10 * lt, 200 / 272);
  h.asset('moon', 800, 840, 60 / 272);
  const k = lt - h.cue('three hundred eighty thousand') - ${String(delay)};
  if (k >= 0) kit.tag(ctx, '380,000 km', 540, 1280);
}`;
const late =
  /^the label "380,000 km" appears at lt=\S+, 3\.\d s after the voice starts saying "three hundred eighty thousand"/;

await test('a number tag landing 3 s after its spoken number is rejected; one on its word passes', async () => {
  const r = await validateShot(stage, {
    code: numberShot(3),
    lines: numberLine,
    dur: 7,
    assets: [earth, moon],
  });
  assert.ok(has(r.errors, late), r.errors.join(' | '));
  const onWord = await validateShot(stage, {
    code: numberShot(0),
    lines: numberLine,
    dur: 7,
    assets: [earth, moon],
  });
  assert.ok(!has(onWord.errors, /^the label "380,000 km" appears/), onWord.errors.join(' | '));
});

await test('a counter that starts rolling on its spoken number is not late, though it lands later', async () => {
  // globe-zoom counters roll up over 1.0 to 1.4 s while the number is said (a behaviour to keep)
  const code = `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('earth', 300, 840 + 10 * lt, 200 / 272);
    const k = lt - h.cue('three hundred eighty thousand');
    if (k >= 0) kit.title(ctx, h.fmt(Math.round(380000 * h.easeOut(Math.min(1, k / 1.4))), { suffix: ' km' }), 540, 1280, { size: 80 });
  }`;
  const r = await validateShot(stage, { code, lines: numberLine, dur: 7, assets: [earth] });
  assert.ok(!has(r.errors, /^the label "380,000 km" appears/), r.errors.join(' | '));
});

// the fixture's default line: "Next to the Sun, the Earth is a speck." from 0.3 s to 3.4 s of a 4 s shot ("speck" at about 2.8 s)
await test('a cued change that lands in the last 0.5 s of the shot is rejected; the same change on an earlier word passes', async () => {
  const shot = (word: string) => `function draw(ctx, lt, sh, h, kit) {
    kit.bg(ctx, lt);
    h.asset('earth', 300, 700 + 10 * lt, 200 / 272);
    const k = lt - h.cue('${word}');
    if (k >= 0) h.asset('sun', 900 - 200 * h.easeOut(Math.min(1, k / 0.8)), 1150, 220 / 272);
  }`;
  const clipped =
    /^the change timed to h\.cue\('speck'\) \(said at lt=2\.\ds\) is still under way at lt=3\.2s/;
  const r = await validateShot(stage, { code: shot('speck'), assets: [earth, sun] });
  assert.ok(has(r.errors, clipped), r.errors.join(' | '));
  const early = await validateShot(stage, { code: shot('Sun'), assets: [earth, sun] });
  assert.ok(!has(early.errors, /^the change timed to h\.cue/), early.errors.join(' | '));
});

// Sun reel shot 2: the tags were timed from the line's start, the Sun only from the cue on the line's last word
const tagShot = (sunFrom: string, place: string) => `function draw(ctx, lt, sh, h, kit) {
  kit.bg(ctx, lt);
  h.asset('earth', 260, 900 + 10 * lt, 120 / 272);
  const k = lt - ${sunFrom};
  const sun = h.asset('sun', 700, 900, (300 / 272) * Math.max(0, Math.min(1, k / 0.2)));
  if (lt >= sh.lines[0].start) kit.tag(ctx, 'Sun', ...${place});
}`;
const alone = /^the label "Sun" shows at lt=\S+ to \S+ while its thing "sun" is not visible/;

await test('a label shown while its thing is not visible is rejected, linked by its name or by h.label', async () => {
  const byName = await validateShot(stage, {
    code: tagShot("h.cue('speck')", '[700, 500]'),
    assets: [earth, sun],
  });
  assert.ok(has(byName.errors, alone), byName.errors.join(' | '));
  // tied by h.label: the thing is "sun" whatever the label says
  const byLabel = await validateShot(stage, {
    code: tagShot("h.cue('speck')", 'h.label(sun)').replace("'Sun'", "'Our star'"),
    assets: [earth, sun],
  });
  assert.ok(
    has(
      byLabel.errors,
      /^the label "Our star" shows at lt=\S+ to \S+ while its thing "sun" is not visible/,
    ),
    byLabel.errors.join(' | '),
  );
});

await test('an early label passes while its thing is visible', async () => {
  // the tag shows from the line's start, before the voice says "Sun", with the Sun already on screen
  for (const place of ['[700, 500]', 'h.label(sun)']) {
    const r = await validateShot(stage, { code: tagShot('0', place), assets: [earth, sun] });
    assert.ok(!has(r.errors, /^the label "Sun" (shows|appears)/), r.errors.join(' | '));
  }
});

await stage.close();
