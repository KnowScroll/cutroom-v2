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
  audience: 'curious teens',
  goal: 'know the size',
  tone: 'wry',
  seconds: 50,
};

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
  extra: { request?: string; template?: string; seconds?: number | undefined } = {},
) {
  const dir = await setup();
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

await test('a template given by the caller wins over the model pick', async () => {
  const { result } = await run([answer(base)], { template: 'beta-two' });
  assert.ok(!(result instanceof Error));
  assert.equal(result.intake.template, 'beta-two');
});

await test('a template named in the request text wins', async () => {
  const { result } = await run([answer(base)], {
    request: 'Make it in the beta-two style: the sun',
  });
  assert.ok(!(result instanceof Error));
  assert.equal(result.intake.template, 'beta-two');
});

await test('an unknown caller template is an error without a model call', async () => {
  const { result, requests } = await run([answer(base)], { template: 'nope' });
  assert.ok(result instanceof Error && /unknown template/.test(result.message));
  assert.equal(requests.length, 0);
});

await test('an unknown name is retried once, then errors', async () => {
  const bad = answer({ ...base, template: 'gamma' });
  const retried = await run([bad, answer({ ...base, template: 'beta-two' })]);
  assert.ok(!(retried.result instanceof Error));
  assert.equal(retried.result.intake.template, 'beta-two');
  assert.equal(retried.requests.length, 2);
  assert.ok(JSON.stringify(retried.requests[1]?.body).includes('gamma'));

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
