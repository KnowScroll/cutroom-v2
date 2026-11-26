import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { z } from 'zod';
import { runCut, type CutResult } from '../src/engine.ts';
import { createM3 } from '../src/minimax.ts';
import type { Gate } from '../src/record.ts';
import { reviewCut, type ReviewResult } from '../src/review.ts';
import { startFakeMiniMax, type Step } from './fixtures/fake-minimax.ts';

const root = await mkdtemp(path.join(tmpdir(), 'cutroom-review-'));
process.on('exit', () => {
  rmSync(root, { recursive: true, force: true });
});

const templatesDir = path.join(root, 'templates');
await mkdir(templatesDir);
await writeFile(
  path.join(templatesDir, '_base.md'),
  '# base\n\nintro text\n\n## story\nBASE STORY\n\n## look\nBASE LOOK\n',
);
await writeFile(
  path.join(templatesDir, 'alpha.md'),
  '# alpha\n\n## about\nALPHA ABOUT\n\n## look\nALPHA LOOK\n\n## checks\nALPHA CHECKS\n\n## director\nALPHA DIRECTOR\n',
);
const guide = [
  'REEL TEMPLATE "alpha". Follow these directions exactly; they override any general habit.',
  '## ABOUT\nALPHA ABOUT',
  '## LOOK\nBASE LOOK\n\nALPHA LOOK',
  '## STORY\nBASE STORY',
  '## DIRECTOR\nALPHA DIRECTOR',
].join('\n\n');

/** A cut from the fake engine (shot4 shipped failing), with the plan, sheet and reference a real cut has. */
async function fakeCut(): Promise<CutResult> {
  const varDir = path.join(root, 'var');
  const runDir = path.join(varDir, 'runs', 'job1');
  await mkdir(runDir, { recursive: true });
  const briefFile = path.join(runDir, 'brief.txt');
  await writeFile(briefFile, 'how big is the Sun');
  const r = await runCut({
    config: { varDir, engineEntry: path.join(import.meta.dirname, 'fixtures', 'fake-engine.mjs') },
    runDir,
    briefFile,
    template: 'alpha',
    seconds: 45,
    cut: 1,
    voiceModel: 'heygen',
    env: { FAKE_ENGINE_FAILING_SHOT: '1' },
  });
  if (r.kind !== 'cut') throw new Error('the fake engine refused the voice');
  // The fake engine's plan.json has no shots or story; a real one has both (engine produce()).
  await writeFile(
    path.join(r.dir, 'plan.json'),
    JSON.stringify({
      brief: 'how big is the Sun',
      seconds: 45,
      story: {
        question: 'How big is the Sun?',
        answer: 'About 109 Earths wide',
        payoff: 'f2',
        facts: [
          { id: 'f1', text: 'The Sun is a star.', source: 'reference' },
          { id: 'f2', text: "The Sun's diameter is about 109 times Earth's.", source: 'reference' },
        ],
      },
      assets: [{ id: 'sun' }, { id: 'earth' }],
      shots: [
        { point: 'The Sun is big.', idea: 'STAGE: sun R 280 at x 540.' },
        { point: 'It is 109 Earths wide.', idea: 'A row of Earths crosses the Sun.' },
      ],
    }),
  );
  const sheet = spawnSync('ffmpeg', [
    ...['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=400x300:d=0.1'],
    ...['-frames:v', '1', path.join(r.dir, 'assets.jpg')],
  ]);
  assert.equal(sheet.status, 0, 'ffmpeg made the asset sheet');
  await writeFile(
    path.join(r.workDir, 'reference.txt'),
    '### Sun\nThe Sun is the star at the centre.\n',
  );
  return r;
}
const cut = await fakeCut();

const gates: Gate[] = [
  {
    name: 'format',
    value: '1080x1920 30 fps',
    threshold: '1080x1920 30 fps',
    pass: true,
    mode: 'block',
  },
  { name: 'shipped_failing', value: 1, threshold: 0, pass: false, mode: 'block' },
  { name: 'same_view', value: 20.5, threshold: 14, pass: false, mode: 'info' },
];

const valid = {
  approve: false,
  summary: 'The Sun reads, the Earth row does not.',
  scores: { hook: 3, clarity: 2, visual: 3, pacing: 4, audio: 4, fit: 3 },
  notes: {
    lines: { '1': [{ who: 'narrator', text: 'How many Earths fit across the Sun?' }] },
    assets: { earth: 'Draw the continents; the disc reads as a ball.' },
    shots: { '2': '0.1-0.4 s: the Earth row runs off the right edge; shrink it to fit x 60-1020.' },
  },
  template_patch: [
    {
      section: 'shots',
      op: 'append',
      text: 'Keep every row inside x 60-1020.',
      reason: 'rows run off the edge on any topic',
    },
  ],
};
const approved = { ...valid, approve: true, summary: 'Ready.', notes: {} };

const usage = { input_tokens: 9000, output_tokens: 400 };
const answer = (o: unknown): Step => ({ kind: 'stream', chunks: [JSON.stringify(o)], usage });

const Block = z.object({
  type: z.string(),
  text: z.string().optional(),
  source: z.object({ data: z.string() }).optional(),
});
const Body = z.object({
  system: z.string(),
  messages: z.array(z.object({ role: z.string(), content: z.union([z.string(), z.array(Block)]) })),
});
type Block = z.infer<typeof Block>;

async function review(
  script: Step[],
  g: readonly Gate[] = gates,
): Promise<{ result: ReviewResult | Error; bodies: z.infer<typeof Body>[]; outDir: string }> {
  const outDir = await mkdtemp(path.join(root, 'out-'));
  const fake = await startFakeMiniMax(script);
  try {
    const m3 = createM3({ apiKey: 'k', endpoint: fake.url, retryWaitsMs: [5] });
    let result: ReviewResult | Error;
    try {
      result = await reviewCut({ cut, gates: g, templatesDir, template: 'alpha', outDir, m3 });
    } catch (e) {
      result = e instanceof Error ? e : new Error(String(e));
    }
    return { result, bodies: fake.requests.map((r) => Body.parse(r.body)), outDir };
  } finally {
    await fake.close();
  }
}

function ok(result: ReviewResult | Error): ReviewResult {
  if (result instanceof Error) throw result;
  return result;
}

function packet(body: z.infer<typeof Body>): Block[] {
  const first = body.messages[0]?.content;
  assert.ok(Array.isArray(first), 'the packet is a list of blocks');
  return first;
}

const lastUser = (body: z.infer<typeof Body>): string => {
  const last = body.messages.at(-1);
  assert.equal(last?.role, 'user');
  assert.ok(typeof last.content === 'string', 'a follow-up is plain text');
  return last.content;
};

await test('the packet: asset sheet, one strip per shot, every gate line, facts, rejections, template', async () => {
  const { result, bodies, outDir } = await review([answer(valid)]);
  const r = ok(result);
  assert.equal(bodies.length, 1);
  const [body] = bodies;
  assert.ok(body !== undefined);
  const blocks = packet(body);
  const text = blocks.map((b) => b.text ?? '').join('\n');

  assert.match(
    text,
    /Brief: how big is the Sun\nTarget length: 45 s\. This cut: 1\.0 s, 2 shots\./,
  );
  assert.match(
    text,
    /question the reel answers: "How big is the Sun\?"; its answer: "About 109 Earths wide"/,
  );
  assert.match(text, /Asset ids: sun, earth/);

  const images = blocks.filter((b) => b.type === 'image');
  assert.equal(images.length, 3, 'one asset sheet and one strip per shot');
  const sheet = (await readFile(path.join(cut.dir, 'assets.jpg'))).toString('base64');
  assert.equal(blocks[1]?.source?.data, sheet, 'the sheet comes right after the opening text');
  for (const shot of [1, 2]) {
    const at = blocks.findIndex((b) => b.text?.startsWith(`Shot ${String(shot)} (`) === true);
    assert.ok(at > 0, `shot ${String(shot)} has its text`);
    const file = path.join(outDir, 'review-1', `shot${String(shot)}.jpg`);
    assert.equal(blocks[at + 1]?.source?.data, (await readFile(file)).toString('base64'));
    const probe = spawnSync('ffprobe', [
      ...['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height'],
      ...['-of', 'csv=p=0', file],
    ]);
    assert.equal(String(probe.stdout).trim(), '810,480', 'three 270x480 frames side by side');
  }
  assert.match(
    text,
    /Shot 1 \(0\.5 s, 0\.0-0\.5 s of the reel\)\. Point: The Sun is big\. Storyboard: STAGE/,
  );
  assert.match(text, /narrator: "How big is it\?" \(0\.1-0\.9 s\)/);

  assert.match(text, /- PASS format \[block\]: 1080x1920 30 fps/);
  assert.match(text, /- FAIL shipped_failing \[block\]: 1 \(threshold 0\)/);
  assert.match(text, /- FAIL same_view \[info\]: 20\.5 \(threshold 14\)/);
  assert.match(text, /\(the payoff: f2\)/);
  assert.match(text, /- f2 \[reference\]: The Sun's diameter is about 109 times Earth's\./);
  assert.match(text, /- shipped failing: shot4: after kit\.bg you paint/);
  assert.match(text, /- kit attempt 1: rejected: makeKit failed/);
  assert.equal(blocks.at(-1)?.text?.endsWith('Return only the JSON object.'), true);

  const prompt = await readFile(
    path.join(import.meta.dirname, '..', 'src', 'prompts', 'review.txt'),
    'utf8',
  );
  assert.ok(body.system.startsWith(prompt.trim()), 'the review prompt comes first');
  assert.ok(
    body.system.includes(`Judge the cut against the template it was made with:\n\n${guide}\n\n`),
  );
  assert.ok(!body.system.includes('ALPHA CHECKS'), 'only the guide sections');
  assert.ok(
    body.system.endsWith(
      'REFERENCE (Wikipedia). It wins over your memory: every name, position, size, proportion, shape, date and step in your lines and asset descriptions must agree with it, and a procedure uses its real steps in its order.\n### Sun\nThe Sun is the star at the centre.',
    ),
  );

  assert.deepEqual(r.review, valid);
  assert.equal(r.reasked, false);
  assert.deepEqual(
    r.calls.map((c) => [c.step, c.tokens_in, c.tokens_out]),
    [['review-1', 9000, 400]],
  );
  assert.ok(r.usd > 0);
});

await test('the notes are saved unchanged in review-<n>.json', async () => {
  const { result, outDir } = await review([answer(valid)]);
  const r = ok(result);
  assert.equal(r.file, path.join(outDir, 'review-1.json'));
  const saved = JSON.parse(await readFile(r.file, 'utf8')) as unknown;
  assert.deepEqual(saved, valid);
});

await test('a score outside 1-5 is rejected: one retry, then an error', async () => {
  const bad = { ...valid, scores: { ...valid.scores, hook: 6 } };
  const once = await review([answer(bad), answer(valid)]);
  assert.deepEqual(ok(once.result).review, valid);
  assert.equal(once.bodies.length, 2);
  const retry = once.bodies[1];
  assert.ok(retry !== undefined);
  assert.equal(retry.messages[1]?.content, JSON.stringify(bad));
  assert.match(lastUser(retry), /^Not usable: .*scores\.hook/s);

  const zero = { ...valid, scores: { ...valid.scores, audio: 0 } };
  const twice = await review([answer(zero)]);
  assert.ok(twice.result instanceof Error);
  assert.match(twice.result.message, /no usable answer twice: .*scores\.audio/s);
  assert.equal(twice.bodies.length, 2);
  assert.ok(!existsSync(path.join(twice.outDir, 'review-1.json')), 'nothing saved');
});

await test('an unknown note key is rejected, and so is a note outside notes', async () => {
  const music = { ...valid, notes: { ...valid.notes, music: 'louder' } };
  const once = await review([answer(music), answer(valid)]);
  assert.deepEqual(ok(once.result).review, valid);
  assert.equal(once.bodies.length, 2);
  assert.ok(once.bodies[1] !== undefined);
  assert.match(lastUser(once.bodies[1]), /"music"/);

  const loose = { ...approved, approve: false, shots: { '1': 'bigger' } };
  const twice = await review([answer(loose)]);
  assert.ok(twice.result instanceof Error);
  assert.match(twice.result.message, /"shots"/);
  assert.equal(twice.bodies.length, 2);
});

await test('a note on a shot or asset the cut does not have is rejected', async () => {
  const shot3 = { ...valid, notes: { shots: { '3': 'bigger' } } };
  const moon = { ...valid, notes: { assets: { moon: 'rounder' } } };
  const { result, bodies } = await review([answer(shot3), answer(moon)]);
  assert.ok(result instanceof Error);
  assert.equal(bodies.length, 2);
  assert.ok(bodies[1] !== undefined);
  assert.match(lastUser(bodies[1]), /shot "3", but the shots are 1 to 2/);
  assert.match(result.message, /asset "moon", but the assets are: sun, earth/);
});

await test('approve with a blocking FAIL gives exactly one re-ask', async () => {
  const still = await review([answer(approved), answer(approved)]);
  const r = ok(still.result);
  assert.equal(still.bodies.length, 2);
  assert.equal(r.reasked, true);
  assert.equal(r.review.approve, true, 'the second answer is kept as given');
  assert.equal(r.calls.length, 2);
  assert.ok(still.bodies[1] !== undefined);
  const ask = lastUser(still.bodies[1]);
  assert.match(ask, /approve is not allowed/);
  assert.match(ask, /- FAIL shipped_failing \[block\]: 1 \(threshold 0\)/);
  assert.ok(!ask.includes('same_view'), 'only blocking FAILs');

  const fixed = await review([answer(approved), answer(valid)]);
  assert.equal(fixed.bodies.length, 2);
  assert.deepEqual(ok(fixed.result).review, valid);
});

await test('approve with only an info FAIL is not asked again', async () => {
  const infoOnly = gates.filter((g) => g.name !== 'shipped_failing');
  const { result, bodies } = await review([answer(approved)], infoOnly);
  assert.equal(bodies.length, 1);
  const r = ok(result);
  assert.equal(r.reasked, false);
  assert.equal(r.review.approve, true);
});
