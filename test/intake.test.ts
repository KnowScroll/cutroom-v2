import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { briefText, listTemplates, runIntake, type IntakeResult } from '../src/intake.ts';
import { createM3 } from '../src/minimax.ts';
import { startFakeMiniMax, type Step } from './fixtures/fake-minimax.ts';

const usage = { input_tokens: 1000, output_tokens: 100 };
const answer = (o: Record<string, unknown>): Step => ({
  kind: 'stream',
  chunks: [JSON.stringify(o)],
  usage,
});
const base = {
  template: 'alpha',
  fit: 'good',
  reason: 'a fits',
  subject: 'the Sun, a star',
  subject_kind: 'data',
  covers: 'Alpha is for sizes',
  excludes: '',
  audience: 'curious teens',
  goal: 'know the size',
  tone: 'wry',
  seconds: 50,
};
const beta = { ...base, template: 'beta-two', covers: 'for history' };

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), 'intake-'));
  await writeFile(path.join(dir, '_base.md'), '# base\n\n## about\nNOT A TEMPLATE\n');
  await writeFile(
    path.join(dir, 'alpha.md'),
    '# alpha\n\n## about\nAlpha is for sizes.\n\n## look\nx\n',
  );
  await writeFile(
    path.join(dir, 'beta-two.md'),
    '# beta\n\n## about\nBeta is for history.\nSecond line.\n',
  );
  await writeFile(path.join(dir, 'alpha.log'), 'ignored');
  return dir;
}

async function run(
  script: Step[],
  extra: {
    request?: string;
    template?: string;
    seconds?: number | undefined;
    exclude?: { template: string; why: string };
  } = {},
  templatesDir?: string,
) {
  const dir = templatesDir ?? (await setup());
  const fake = await startFakeMiniMax(script);
  try {
    const m3 = createM3({ apiKey: 'k', endpoint: fake.url, retryWaitsMs: [5] });
    const before = await readdir(dir);
    let result: IntakeResult | Error;
    try {
      result = await runIntake({
        request: 'How big is the sun?',
        templatesDir: dir,
        m3,
        ...extra,
      });
    } catch (e) {
      result = e instanceof Error ? e : new Error(String(e));
    }
    assert.deepEqual(await readdir(dir), before, 'template folder untouched');
    return { result, requests: fake.requests };
  } finally {
    await fake.close();
  }
}

await test('lists templates with their about, skipping _base', async () => {
  const list = await listTemplates(await setup());
  assert.deepEqual(list, [
    { name: 'alpha', about: 'Alpha is for sizes.' },
    { name: 'beta-two', about: 'Beta is for history.\nSecond line.' },
  ]);
});

await test('the model template is returned; prompt holds every about; usd is summed', async () => {
  const { result, requests } = await run([answer(base)]);
  assert.ok(!(result instanceof Error));
  assert.equal(result.intake.template, 'alpha');
  assert.equal(result.intake.seconds, 50);
  assert.ok(result.usd > 0);
  const body = JSON.stringify(requests[0]?.body);
  for (const t of ['Alpha is for sizes.', 'Beta is for history.', 'How big is the sun?']) {
    assert.ok(body.includes(t), t);
  }
  assert.ok(!body.includes('NOT A TEMPLATE'));
});

await test('a caller template is used and the model is told to judge it', async () => {
  const { result, requests } = await run([answer(beta)], {
    template: 'beta-two',
  });
  assert.ok(!(result instanceof Error));
  assert.equal(result.intake.template, 'beta-two');
  assert.ok(JSON.stringify(requests[0]?.body).includes('The caller chose the template'));
});

await test('an answer naming another template than the caller is rejected, retried, then errors', async () => {
  const other = answer({ ...base, template: 'alpha', fit: 'good', reason: 'alpha fits' });
  const retried = await run([other, answer({ ...beta, fit: 'none' })], {
    template: 'beta-two',
  });
  assert.ok(!(retried.result instanceof Error));
  assert.equal(retried.result.intake.fit, 'none');
  assert.equal(retried.requests.length, 2);
  const failed = await run([other], { template: 'beta-two' });
  assert.ok(failed.result instanceof Error && /failed twice/.test(failed.result.message));
});

await test('topic words naming a template do not force it', async () => {
  const { result } = await run([answer(base)], { request: 'A story about beta-two the horse' });
  assert.ok(!(result instanceof Error));
  assert.equal(result.intake.template, 'alpha');
});

await test('an unknown caller template is an error without a model call', async () => {
  const { result, requests } = await run([answer(base)], { template: 'nope' });
  assert.ok(result instanceof Error && /unknown template/.test(result.message));
  assert.equal(requests.length, 0);
});

await test('an unknown name is retried once, then errors', async () => {
  const bad = answer({ ...base, template: 'gamma' });
  const retried = await run([bad, answer(beta)]);
  assert.ok(!(retried.result instanceof Error));
  assert.equal(retried.result.intake.template, 'beta-two');
  assert.equal(retried.requests.length, 2);
  assert.ok(JSON.stringify(retried.requests[1]?.body).includes('gamma'));
  assert.deepEqual(
    (retried.requests[1]?.body as { messages: { role: string }[] }).messages.map((m) => m.role),
    ['user', 'assistant', 'user'],
  );

  const failed = await run([bad]);
  assert.ok(failed.result instanceof Error && /failed twice/.test(failed.result.message));
  assert.equal(failed.requests.length, 2);
});

await test('bad JSON is retried', async () => {
  const junk: Step = { kind: 'stream', chunks: ['not json at all'], usage };
  const { result, requests } = await run([junk, answer(base)]);
  assert.ok(!(result instanceof Error));
  assert.equal(requests.length, 2);
  const failed = await run([{ kind: 'stream', chunks: ['{"template": 1}'], usage }]);
  assert.ok(failed.result instanceof Error);
});

await test('JSON inside a code fence is read', async () => {
  const fenced: Step = {
    kind: 'stream',
    chunks: ['```json\n', JSON.stringify(base), '\n```'],
    usage,
  };
  const { result } = await run([fenced]);
  assert.ok(!(result instanceof Error));
  assert.equal(result.intake.template, 'alpha');
});

await test('fit none is kept', async () => {
  const { result } = await run([answer({ ...base, fit: 'none', reason: 'nothing fits' })]);
  assert.ok(!(result instanceof Error));
  assert.equal(result.intake.fit, 'none');
  assert.equal(result.intake.template, 'alpha');
});

await test('seconds are clamped to 30-90; the caller number wins; default 45', async () => {
  const sec = async (script: number | undefined, caller?: number) => {
    const { result } = await run([answer({ ...base, seconds: script })], { seconds: caller });
    assert.ok(!(result instanceof Error));
    return result.intake.seconds;
  };
  assert.equal(await sec(5), 30);
  assert.equal(await sec(500), 90);
  assert.equal(await sec(50, 20), 30);
  assert.equal(await sec(50, 60), 60);
  assert.equal(await sec(undefined), 45);
});

await test('brief.txt is the request verbatim plus three lines', async () => {
  const { result } = await run([answer(base)], { request: 'How big is\nthe sun?' });
  assert.ok(!(result instanceof Error));
  assert.equal(
    result.brief,
    'How big is\nthe sun?\n\nAudience: curious teens\nGoal: know the size\nTone: wry\n',
  );
  assert.equal(briefText('r', result.intake).startsWith('r\n'), true);
});

await test('the real templates folder lists with an about each', async () => {
  const root = path.join(import.meta.dirname, '..');
  const list = await listTemplates(path.join(root, 'templates'));
  assert.ok(list.length >= 15);
  assert.ok(list.every((t) => t.about.length > 40));
  assert.ok((await readFile(path.join(root, 'src', 'prompts', 'intake.txt'), 'utf8')).length > 0);
});

// The Venus job's shape (findings §A root cause 1): an Earth-only globe template and a space template.
const GLOBE_ABOUT =
  'A dark-globe geography explainer. For anything about places, positions, distances and sizes on Earth: coordinates, extremes, routes. Not for machines, history without a map, biology or character stories.';
const SPACE_ABOUT =
  'A flat-vector science and scale explainer. For sizes, distances, numbers and life stories of things in space, nature, the body and physics. Not for history, people or machines with moving parts.';
async function scopeTemplates(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'intake-scope-'));
  await writeFile(path.join(dir, '_base.md'), '# base\n');
  await writeFile(path.join(dir, 'globe.md'), `# globe\n\n## about\n${GLOBE_ABOUT}\n`);
  await writeFile(path.join(dir, 'space.md'), `# space\n\n## about\n${SPACE_ABOUT}\n`);
  return dir;
}
const VENUS = 'Why a day on Venus is longer than its year';
const venusOnGlobe = {
  ...base,
  template: 'globe',
  fit: 'good',
  reason: 'a place and its sizes',
  subject: 'Venus, a planet',
  // the stretch M3 made: the about says "on Earth"
  covers: 'places, positions, distances and sizes in space',
};
const venusInSpace = {
  ...venusOnGlobe,
  template: 'space',
  covers: 'sizes, distances, numbers and life stories of things in space',
};

await test('a Venus-style request rated "good" on an Earth-only about is sent back, and another template is chosen', async () => {
  const { result, requests } = await run(
    [answer(venusOnGlobe), answer(venusInSpace)],
    { request: VENUS },
    await scopeTemplates(),
  );
  assert.ok(!(result instanceof Error));
  assert.equal(result.intake.template, 'space');
  assert.equal(result.intake.fit, 'good');
  assert.equal(result.intake.subject, 'Venus, a planet');
  assert.equal(result.intake.covers, venusInSpace.covers);
  assert.equal(requests.length, 2);
  const retry = JSON.stringify(requests[1]?.body);
  assert.match(retry, /is not in the description of globe/);
});

await test('a fit the quoted words do not hold twice becomes fit none on the closest template', async () => {
  const { result, requests } = await run(
    [answer(venusOnGlobe), answer(venusOnGlobe)],
    { request: VENUS },
    await scopeTemplates(),
  );
  assert.ok(!(result instanceof Error));
  assert.equal(requests.length, 2);
  assert.equal(result.intake.template, 'globe');
  assert.equal(result.intake.fit, 'none');
  assert.match(result.intake.reason, /^a place and its sizes \(scope check: "covers" .* is not in/);
});

await test('a subject under the "Not for" has no fit; quotes match whatever their case, spacing or quote marks', async () => {
  const excluded = {
    ...venusInSpace,
    reason: 'a history of the probes',
    excludes: 'history',
  };
  const none = await run(
    [answer(excluded), answer(excluded)],
    { request: VENUS },
    await scopeTemplates(),
  );
  assert.ok(!(none.result instanceof Error));
  assert.equal(none.result.intake.fit, 'none');
  assert.match(none.result.intake.reason, /falls under the "Not for" of space \("history"\)/);
  assert.match(JSON.stringify(none.requests[1]?.body), /Not for/);

  const loose = {
    ...venusInSpace,
    covers: '"Sizes,  distances, numbers\nand life stories of things in SPACE."',
  };
  const held = await run([answer(loose)], { request: VENUS }, await scopeTemplates());
  assert.ok(!(held.result instanceof Error));
  assert.equal(held.result.intake.fit, 'good');
  assert.equal(held.requests.length, 1);
});

await test('fit none with nothing quoted is taken as it is', async () => {
  const honest = { ...venusOnGlobe, fit: 'none', reason: 'no template draws planets', covers: '' };
  const { result, requests } = await run(
    [answer(honest)],
    { request: VENUS },
    await scopeTemplates(),
  );
  assert.ok(!(result instanceof Error));
  assert.equal(requests.length, 1);
  assert.equal(result.intake.fit, 'none');
  assert.equal(result.intake.reason, 'no template draws planets');
});

await test('an excluded template is left out of the list, the review says why, and naming it is an unknown template', async () => {
  const { result, requests } = await run(
    [answer(venusOnGlobe), answer(venusInSpace)],
    { request: VENUS, exclude: { template: 'globe', why: 'it draws only the Earth' } },
    await scopeTemplates(),
  );
  assert.ok(!(result instanceof Error));
  assert.equal(result.intake.template, 'space');
  const first = JSON.stringify(requests[0]?.body);
  assert.ok(!first.includes('### globe'), 'the excluded template is not offered');
  assert.match(
    first,
    /review found that template cannot show this request's subject: it draws only the Earth/,
  );
  assert.match(JSON.stringify(requests[1]?.body), /unknown template \\"globe\\"/);
});
