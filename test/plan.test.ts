import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test, type TestContext } from 'node:test';
import { z } from 'zod';
import { placeErrors, subjectErrors, type DraftPlan } from '../engine/plan_checks.mjs';

// The production plan's subject binding and places check (engine/plan_checks.mjs), on the Venus and Point Nemo reels of
// docs/reel-quality-findings.md §A: an Earth globe stood in for Venus, and "MARKER at Venus [0, 0]" passed because Venus has no
// coordinates. Wikipedia answers are recorded (test/fixtures/wikipedia.json, 2026-11-27); an unrecorded request fails.

const RECORDED = z
  .record(z.string(), z.unknown())
  .parse(JSON.parse(readFileSync(new URL('./fixtures/wikipedia.json', import.meta.url), 'utf8')));

function wikipedia(t: TestContext, down = false): { urls: string[]; logs: string[] } {
  const urls: string[] = [];
  const logs: string[] = [];
  t.mock.method(globalThis, 'fetch', (url: string) => {
    urls.push(url);
    if (down) return Promise.reject(new Error('getaddrinfo ENOTFOUND en.wikipedia.org'));
    if (!(url in RECORDED)) throw new Error(`unrecorded request ${url}`);
    return Promise.resolve(Response.json(RECORDED[url]));
  });
  t.mock.method(console, 'log', (...a: unknown[]) => {
    logs.push(a.map(String).join(' '));
  });
  return { urls, logs };
}

const VENUS_BRIEF = `Why a day on Venus is longer than its year

Audience: General-curious viewers who know basic astronomy (planets orbit, spin on axis) but not Venus's numbers.
Goal: The viewer should understand that Venus rotates once every 243 Earth days while its orbit takes only 225 days.
Tone: Wry, calm, lightly amazed`;
// the Venus run's cut 4 assets (var/runs/20261127-013542-…/reel-v4/plan.json), descriptions shortened
const GLOBE = {
  id: 'globe',
  kind: 'scenery',
  description:
    'A large circular orthographic globe, exactly 1000 pixels in diameter. The ocean is a deep navy disc; real engine-projected land is warm dark taupe with thin pale coasts, cream country borders and a cream graticule.',
  params: [
    { name: 'lon0', type: 'number', description: 'Longitude facing the viewer in degrees.' },
  ],
};
const MARKER = {
  id: 'marker',
  kind: 'prop',
  description: 'A compact place-pin prop: a striped pole with an orange pennant.',
};
const VENUS = {
  id: 'venus',
  kind: 'scenery',
  description:
    'Venus as it really looks: a pale butter-yellow sphere wrapped in thick swirling sulphuric cloud bands, no oceans or land visible.',
};
const SUN = { id: 'sun', kind: 'prop', description: 'The Sun: a glowing orange-white disc.' };
const plan = (subject: DraftPlan['subject'], ...assets: DraftPlan['assets']): DraftPlan => ({
  ...(subject ? { subject } : {}),
  assets,
});

await test('a plan whose hero is not the brief’s subject is rejected', () => {
  const E = subjectErrors(plan({ name: 'Venus', asset: 'globe' }, GLOBE, MARKER), VENUS_BRIEF);
  assert.equal(E.length, 1, E.join(' | '));
  assert.match(
    E[0] ?? '',
    /the brief's subject is "Venus", but the asset "globe" that should draw it never names "venus"/,
  );
});

await test('the hero that draws the brief’s subject passes', () => {
  assert.deepEqual(
    subjectErrors(plan({ name: 'Venus', asset: 'venus' }, VENUS, SUN), VENUS_BRIEF),
    [],
  );
  // one asset showing several cast members names its subject through the cast id that maps to it
  const balls: DraftPlan = {
    subject: { name: 'Norway', asset: 'ball' },
    assets: [{ id: 'ball', kind: 'character', description: 'A countryball with its flag.' }],
    cast: { norway: { asset: 'ball' }, sweden: { asset: 'ball' } },
  };
  assert.deepEqual(subjectErrors(balls, 'How did Norway break away from Sweden in 1905?'), []);
  // a two-letter subject, and a plural in the brief with a singular asset
  const ai = { id: 'robot', kind: 'character', description: 'AI shown as a friendly robot eye.' };
  assert.deepEqual(
    subjectErrors(plan({ name: 'AI', asset: 'robot' }, ai), 'How does AI learn to see?'),
    [],
  );
  const cat = { id: 'cat', kind: 'character', description: 'A ginger cartoon cat.' };
  for (const name of ['cats', 'cat'])
    assert.deepEqual(
      subjectErrors(plan({ name, asset: 'cat' }, cat), 'Why do cats purr?'),
      [],
      name,
    );
});

await test('the subject must be the brief’s own, stated, and drawn by the first asset', () => {
  const after = subjectErrors(plan({ name: 'Venus', asset: 'venus' }, SUN, VENUS), VENUS_BRIEF);
  assert.ok(
    after.some((e) => /"venus" must be the hero, FIRST in "assets"/.test(e)),
    after.join(' | '),
  );
  // a 3D reel lists its host first, so its subject may come later
  assert.deepEqual(
    subjectErrors(plan({ name: 'Venus', asset: 'venus' }, SUN, VENUS), VENUS_BRIEF, { d3: true }),
    [],
  );
  const other = subjectErrors(plan({ name: 'Mercury', asset: 'venus' }, VENUS), VENUS_BRIEF);
  assert.ok(
    other.some((e) => /the brief never says "mercury"/.test(e)),
    other.join(' | '),
  );
  const none = subjectErrors(plan(undefined, VENUS, SUN), VENUS_BRIEF);
  assert.ok(
    none.some((e) => /state the brief's subject/.test(e)),
    none.join(' | '),
  );
  const unknown = subjectErrors(plan({ name: 'Venus', asset: 'planet' }, VENUS), VENUS_BRIEF);
  assert.ok(
    unknown.some((e) => /"planet" is not one of the assets/.test(e)),
    unknown.join(' | '),
  );
});

// QC3 (var/runs/qc3-moon and qc3-norway, 2026-11-28): the subject check rejected the real hero for never naming the action
// ("walk", "leaving"), and the next plans made a composite of the event the hero (walk_to_the_moon, norway_leaving_sweden). The
// subjects and asset ids are the logged ones (calls.json keeps no answers); the descriptions are the runs' final ones, shortened
const MOON_BRIEF = `How long would it take to walk to the Moon?

Audience: General viewers with no science background, roughly school age and up, who know the Moon is far away.
Goal: The viewer should grasp that walking to the Moon would take on the order of a human lifetime or more.
Tone: Curious, awe-struck, lightly playful, deadpan-funny`;
const NORWAY_BRIEF = `How did Norway break away from Sweden in 1905 without firing a shot?

Audience: General history viewers who know the basic outline of European nationalism.
Goal: The viewer should understand that the Storting’s decision to dissolve the union with Sweden produced independence without armed conflict.
Tone: Wry, clear, lightly dramatic`;
const MOON = {
  id: 'moon',
  kind: 'scenery',
  description:
    'A pale grey sphere with darker grey maria and a few bright rayed craters, lit from the right with a soft terminator.',
};
const BODIES = {
  id: 'bodies',
  kind: 'prop',
  description:
    'Each named comparison body at a true 272-pixel radius: Earth a round blue globe, the walker an upright figure.',
};
const BALL = {
  id: 'ball',
  kind: 'character',
  description:
    "A large circular country-body painted in the country's exact horizontal flag bands and crossed by its real Nordic cross.",
};
const SIGN = {
  id: 'sign',
  kind: 'prop',
  description: 'A simple wooden roadside marker on a post.',
};

await test('the subject is the thing the reel shows: an action or event in its name does not push the hero to a composite', () => {
  // qc3-moon plan#1: "walk to the Moon" drawn by "moon"
  assert.deepEqual(
    subjectErrors(plan({ name: 'walk to the Moon', asset: 'moon' }, MOON, BODIES), MOON_BRIEF),
    [],
  );
  // qc3-norway plan#2: "Norway leaving Sweden" drawn by the ball the cast norway, sweden and carl share
  const norway: DraftPlan = {
    subject: { name: 'Norway leaving Sweden', asset: 'ball' },
    assets: [BALL, SIGN],
    cast: { norway: { asset: 'ball' }, sweden: { asset: 'ball' }, carl: { asset: 'ball' } },
  };
  assert.deepEqual(subjectErrors(norway, NORWAY_BRIEF), []);
  assert.deepEqual(
    subjectErrors({ ...norway, subject: { name: 'Norway', asset: 'ball' } }, NORWAY_BRIEF),
    [],
  );
  assert.deepEqual(subjectErrors(plan({ name: 'the Moon', asset: 'moon' }, MOON), MOON_BRIEF), []);
  // the thing itself must still be drawn: a hero that is only the walker, or a sign, fails
  const walker = subjectErrors(
    plan({ name: 'walk to the Moon', asset: 'bodies' }, BODIES, MOON),
    MOON_BRIEF,
  );
  assert.ok(
    walker.some((e) => /the asset "bodies" that should draw it never names "moon"/.test(e)),
    walker.join(' | '),
  );
  const sign = subjectErrors(
    { ...norway, subject: { name: 'Norway', asset: 'sign' } },
    NORWAY_BRIEF,
  );
  assert.ok(
    sign.some((e) => /the asset "sign" that should draw it never names "norway"/.test(e)),
    sign.join(' | '),
  );
  // findings §A still fails however the subject is worded: an Earth globe for a Venus reel
  for (const name of ['Venus', 'Venus globe', 'a day on Venus', 'Venus spinning']) {
    const E = subjectErrors(plan({ name, asset: 'globe' }, GLOBE, MARKER), VENUS_BRIEF);
    assert.ok(
      E.some((e) => /the asset "globe" that should draw it never names "venus"/.test(e)),
      `${name}: ${E.join(' | ')}`,
    );
  }
  // a name that opens a sentence is a name too: an Earth globe for "Venus and Earth" still fails
  const opens = subjectErrors(
    plan(
      { name: 'Venus and Earth', asset: 'globe' },
      { id: 'globe', kind: 'scenery', description: 'A blue Earth globe with white clouds.' },
    ),
    'Venus spins slower than Earth. Why is its day so long?',
  );
  assert.ok(
    opens.some((e) => /the asset "globe" that should draw it never names "venus"/.test(e)),
    opens.join(' | '),
  );
  // a subject with no name of the request in it is still checked word by word
  const atom = {
    id: 'atom',
    kind: 'prop',
    description: 'A tiny nucleus inside an electron cloud.',
  };
  const sand = subjectErrors(
    plan({ name: 'grain of sand', asset: 'atom' }, atom),
    'How small is an atom compared to a grain of sand?',
  );
  assert.ok(
    sand.some((e) => /never names "grain", "sand"/.test(e)),
    sand.join(' | '),
  );
});

// Venus cut 4, shot 2 (its idea as saved), and the Point Nemo plan's measured shot
const VENUS_SHOT =
  'CAMERA: from [0.0, 0.0, 0.95] to Venus [0.0, 0.0] at 0 s over 1.2 s. OVERLAYS: MARKER at Venus [0.0, 0.0] (pole on land, buoy at sea); LABEL "VENUS" at Venus [0.0, 0.0] (place). TOP: TITLE "VENUS".';
const NEMO_SHOT =
  'OVERLAYS: MARKER at Point Nemo [-123.4, -48.9]; MARKER at Ducie Island [-124.8, -24.7]; LINE from Point Nemo [-123.4, -48.9] to Ducie Island [-124.8, -24.7] in gold; RING of 2,688 km around Point Nemo [-123.4, -48.9]; LABEL "SOUTH PACIFIC GYRE" at [-110.0, -32.0]. TOP: COUNTER gold 2,688 KM.';

await test('a named place that cannot be located is a plan error, not skipped', async (t) => {
  wikipedia(t);
  const E = await placeErrors({ shots: [{ idea: VENUS_SHOT }] });
  assert.equal(E.length, 1, E.join(' | '));
  assert.match(
    E[0] ?? '',
    /^shot 1: "Venus" cannot be located: Wikipedia "Venus" gives no coordinates on Earth/,
  );
  // the same body pinned by a LINE end is caught too
  const line = await placeErrors({
    shots: [{ idea: 'LINE from Ducie Island [-124.8, -24.7] to Sun [0, 0] in gold.' }],
  });
  assert.ok(
    line.some((e) => /"Sun" cannot be located/.test(e)),
    line.join(' | '),
  );
});

await test('real places pass, including one Wikipedia lists without a primary point, and an area label', async (t) => {
  const { urls } = wikipedia(t);
  // "Point Nemo" redirects to "Pole of inaccessibility": no primary coordinates, the oceanic pole among its 71 points
  assert.deepEqual(await placeErrors({ shots: [{ idea: NEMO_SHOT }] }), []);
  assert.ok(
    urls.some((u) => u.endsWith('titles=South%20Pacific%20Gyre')),
    'the label was looked up',
  );
  // a place pinned far from where it is still fails
  const off = await placeErrors({ shots: [{ idea: 'MARKER at Ducie Island [-100.0, -24.7].' }] });
  assert.ok(
    off.some((e) => /"Ducie Island" is at \[-124\.8, -24\.7\]/.test(e)),
    off.join(' | '),
  );
});

await test('without Wikipedia the places are logged as not looked up, and the plan is not failed for it', async (t) => {
  const { logs } = wikipedia(t, true);
  assert.deepEqual(
    await placeErrors({ shots: [{ idea: 'MARKER at Henderson Island [-128.3, -24.4].' }] }),
    [],
  );
  assert.ok(logs.some((l) => l.includes('places: "Henderson Island" not looked up')));
});

// a Venus reel in globe-zoom's grammar (#75): a shot on Venus says so on its BODY line, the orbit view shows Venus and the Sun on
// their paths. Maxwell Montes to Maat Mons is 12,019 km on Venus's 6,051.8 km radius, 12,653 km on the Earth's
const onVenus = (counter: string, body = 'BODY: Venus, radius 6,051.8 km.') =>
  `${body} CAMERA: from {lon0: 0, lat0: 0, s: 0.95} to {lon0: -80, lat0: 30, s: 1.2} at 0 s over 1.2 s. OVERLAYS: MARKER at Maxwell Montes [3.3, 65.2]; LINE from Maxwell Montes [3.3, 65.2] to Maat Mons [-165.4, 0.5] in gold; RING of 500 km around Maat Mons [-165.4, 0.5] in gold; LABEL "VENUS" at Venus [0.0, 0.0]. TOP: COUNTER gold ${counter} KM.`;
const ORBIT =
  'CAMERA: ORBIT of Venus around Sun. OVERLAYS: BODY Venus on its orbit from [0] to [225] degrees; MARKER at Venus [0.0, 0.0]; LABEL "SUN" at Sun [0.0, 0.0]. TOP: COUNTER gold 225 DAYS.';

await test('places on another body are not Earth places, and a line on it is measured on its radius', async (t) => {
  const { urls, logs } = wikipedia(t);
  assert.deepEqual(
    await placeErrors({ shots: [{ idea: onVenus('12,019') }, { idea: ORBIT }] }),
    [],
  );
  assert.deepEqual(urls, [], 'nothing on Venus or in the orbit view is looked up on the Earth');
  assert.ok(logs.some((l) => l.includes('places: shot 1 is on Venus, not the Earth')));
  assert.ok(logs.some((l) => l.includes('places: shot 2 is on an orbit view, not the Earth')));
  // the Earth's distance between the same two points is wrong on Venus
  const earthKm = await placeErrors({ shots: [{ idea: onVenus('12,653') }] });
  assert.ok(
    earthKm.some((e) =>
      /from Maxwell Montes to Maat Mons is 12,019 km, but its counter says 12,653 KM/.test(e),
    ),
    earthKm.join(' | '),
  );
  // a BODY line without a radius: the km is not checked, and the log says so
  assert.deepEqual(await placeErrors({ shots: [{ idea: onVenus('99', 'BODY: Venus.') }] }), []);
  assert.ok(logs.some((l) => l.includes('no radius on its BODY line: its LINE km is not checked')));
  // "BODY: Earth" and a shot with no BODY line are on the Earth: Venus pinned there is still an error
  for (const idea of [VENUS_SHOT, `BODY: Earth, radius 6,371 km. ${VENUS_SHOT}`]) {
    const E = await placeErrors({ shots: [{ idea }] });
    assert.ok(
      E.some((e) => /"Venus" cannot be located/.test(e)),
      E.join(' | '),
    );
  }
});
