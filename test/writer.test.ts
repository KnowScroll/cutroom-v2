import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createWriter,
  factErrors,
  numbersNotInSource,
  type Fact,
  type FactSheet,
  type Message,
  type Story,
  type WriterEnv,
} from '../engine/writer.mjs';

// The engine's writer checks on real fact sheets and scripts; the model is faked at the network edge (E.m3).

const BRIEF = 'How small is an atom compared to a grain of sand?';
const env = { brief: BRIEF, hasRef: () => false, numbersNotIn: () => [] };

const BASE: Fact[] = [
  { id: 'f1', text: 'A grain of sand is about 1 mm across', source: 'general' },
  { id: 'f2', text: 'An atom is about 100 pm across', source: 'reference' },
  { id: 'f5', text: 'An atom is smaller than the wavelength of visible light', source: 'general' },
];
const F4: Fact = {
  id: 'f4',
  text: 'An atom is about 10 million times smaller than a grain of sand',
  source: 'derived',
  calc: '1 mm / 100 pm',
};
const MOON: Fact[] = [
  { id: 'm1', text: 'The Moon is about 378,000 km from Earth', source: 'general' },
  { id: 'm2', text: 'A person walks about 5 km/h', source: 'general' },
  { id: 'm3', text: 'A lunar month lasts 29.5 days', source: 'general' },
  { id: 'm5', text: 'Earth is about 12,742 km wide', source: 'general' },
];
const ANSWER = 'An atom is about 10 million times smaller than a grain of sand.';

function sheet(extra: Fact[], more: Partial<FactSheet> = {}): FactSheet {
  return {
    facts: [...BASE, ...MOON, F4, ...extra],
    question: 'How much smaller than a grain of sand is an atom?',
    answer: ANSWER,
    payoff: 'f4',
    ...more,
  };
}
const errorsOf = (f: FactSheet): string[] => factErrors(f, env).map((e) => e.toString());
const errorsFor = (f: FactSheet, id: string): string[] =>
  errorsOf(f).filter((e) => e.startsWith(`fact ${id}`));
const derived = (id: string, text: string, calc: string): Fact => ({
  id,
  text,
  source: 'derived',
  calc,
});

await test('the atom sheet: a hand-made conversion factor is rejected, a calc with units computes the ratio', () => {
  const wrong = sheet([derived('f3', '1 mm = 1,000,000 pm', '1 * 1000000')]);
  const [f3] = errorsFor(wrong, 'f3');
  assert.match(f3 ?? '', /uses 1000000, which no other fact on the sheet states/);
  assert.deepEqual(errorsFor(wrong, 'f4'), [], '1 mm / 100 pm computes 1e7, which f4 states');

  const unitsWrongText = errorsFor(
    sheet([derived('f3', '1 mm = 1,000,000 pm', '1 mm / 1 pm')]),
    'f3',
  );
  assert.equal(unitsWrongText.length, 1);
  assert.match(unitsWrongText[0] ?? '', /gives 1 billion, but its text says/);
  assert.match(
    unitsWrongText[0] ?? '',
    /One of calc or text is wrong: check the calc's factors and units first/,
  );
  assert.doesNotMatch(unitsWrongText[0] ?? '', /write the computed value/);

  assert.deepEqual(errorsOf(sheet([derived('f3', '1 mm = 1,000,000,000 pm', '1 mm / 1 pm')])), []);
});

await test("the Moon's mixed-units calc is rejected; the same walk with units computes", () => {
  const mixed = errorsFor(
    sheet([derived('m4', 'Walking to the Moon takes 2,442 days', '378000/5/24 - 29.5*24')]),
    'm4',
  );
  assert.equal(mixed.length, 1);
  assert.match(mixed[0] ?? '', /uses 24 as a unit conversion beside quantities with units/);
  assert.match(mixed[0] ?? '', /reads 378000 as 378000 km, 5 as 5 km\/h, 29\.5 as 29\.5 days/);

  for (const [text, calc] of [
    ['Walking to the Moon non-stop takes about 75,600 hours', '378000 km / (5 km/h)'],
    ['Walking to the Moon non-stop takes about 8.6 years', '378000 km / (5 km/h)'],
    ['Walking to the Moon non-stop takes about 3,150 days', '378000 / 5'],
    ['The Moon is about 30 Earths away', '378000 / 12742'],
  ] as const)
    assert.deepEqual(errorsOf(sheet([derived('m4', text, calc)])), [], `${text} = ${calc}`);

  const lessAMonth = errorsFor(
    sheet([
      derived('m4', 'It takes 2,442 days more than a month', '378000 km / (5 km/h) - 29.5 d'),
    ]),
    'm4',
  );
  assert.match(lessAMonth[0] ?? '', /gives 3120\.5 days, but its text says/);
  const lengthPlusTime = errorsFor(sheet([derived('m4', 'It is 5', '378000 km + 29.5 d')]), 'm4');
  assert.match(lengthPlusTime[0] ?? '', /adds or subtracts a length and a time/);
});

await test('scientific notation is read in calc and text', () => {
  for (const [text, calc] of [
    ['About 1 × 10^7 atoms fit across a grain of sand', '1e-3 m / 1e-10 m'],
    ['About 1e7 atoms fit across a grain of sand', '0.001 m / 100e-12 m'],
    ['About 10⁷ atoms fit across a grain of sand', '1 mm / 100 pm'],
  ] as const)
    assert.deepEqual(errorsOf(sheet([derived('f6', text, calc)])), [], `${text} = ${calc}`);
});

await test('rates, magnitude words and plain counts compute; a chain of 100s does not', () => {
  const facts: Fact[] = [
    { id: 'p1', text: 'A gold bar costs $750,000', source: 'general' },
    { id: 'p2', text: 'A gold bar weighs 12.4 kg', source: 'general' },
    { id: 'p3', text: 'The country has 5.5 million people', source: 'general' },
    { id: 'p4', text: 'The country covers 385,207 km2', source: 'general' },
    { id: 'p5', text: 'The project cost $690 million over 13 years', source: 'general' },
    { id: 'p6', text: 'About 4.4 billion people use the internet', source: 'general' },
    { id: 'p7', text: 'The world has about 8 billion people', source: 'general' },
    { id: 'p8', text: 'Since 1905 the country has been independent', source: 'general' },
    { id: 'p9', text: 'In 2024 it held an election', source: 'general' },
    { id: 'p10', text: 'People blink about 100,000 times a day', source: 'general' },
    {
      id: 'p11',
      text: 'A search engine handles about 99,000 searches every second',
      source: 'general',
    },
    { id: 'p12', text: 'The band has 4 members and released 12 albums', source: 'general' },
    { id: 'p13', text: 'Monaco has about 26,000 people per square kilometre', source: 'general' },
    { id: 'p14', text: 'Monaco covers 2.08 km2', source: 'general' },
  ];
  const rates = (calc: string, text: string) => sheet([...facts, derived('d1', text, calc)]);
  for (const [calc, text] of [
    ['750000 / 12.4', 'At that price gold costs $60,500 per kg'],
    ['750000 / 12.4 kg', 'At that price gold costs $60,500 per kg'],
    ['5500000 / 385207 km2', 'The country has about 14 people per km2'],
    ['5.5 / 385207', 'The country has about 14 people per km2'],
    ['690000000 / (13 yr)', 'That is about $53 million a year'],
    ['4.4 billion / 8 billion * 100', 'About 55% of people use the internet'],
    ['4.4 / 8 * 100', 'About 55% of people use the internet'],
    ['2024 - 1905', 'The country has been independent for 119 years'],
    ['100000 * 365', 'That is about 36.5 million blinks a year'],
    ['99000 * 60 * 60 * 24', 'That is about 8.6 billion searches a day'],
    ['12 / 4', 'That is 3 albums per member'],
    ['26000 * 2.08', 'Monaco has about 54,000 people'],
  ] as const)
    assert.deepEqual(errorsOf(rates(calc, text)), [], `${text} = ${calc}`);

  assert.deepEqual(
    errorsOf(
      sheet([], { answer: 'By the twenty-first century an atom is 10 million times smaller.' }),
    ),
    [],
    'an ordinal is not a count',
  );
  const chained = errorsFor(sheet([derived('f3', '1 mm = 1,000,000 pm', '100 * 100 * 100')]), 'f3');
  assert.match(chained[0] ?? '', /uses 100 more than once/);
});

await test('the answer and the yardstick may say only numbers the sheet states', () => {
  const scaled = derived(
    'f6',
    'If an atom were 1 m wide, a grain of sand would be 10,000 km wide',
    '1 m * (1 mm / 100 pm)',
  );
  assert.deepEqual(
    errorsOf(sheet([scaled], { yardstick: 'an atom at 1 m makes the sand 10,000 km wide' })),
    [],
  );
  assert.deepEqual(
    errorsOf(sheet([], { answer: 'An atom is about ten million times smaller.' })),
    [],
  );
  assert.deepEqual(
    errorsOf(sheet([], { yardstick: 'an atom is one ten-millionth of a grain of sand' })),
    [],
    'a fraction is not a count',
  );

  const yardstick = factErrors(
    sheet([], { yardstick: 'atom 1 m -> sand ~10 km, wider than Earth' }),
    env,
  );
  assert.equal(yardstick.length, 1);
  assert.match(
    yardstick[0]?.toString() ?? '',
    /the yardstick .* says "10", which no fact on the sheet states/,
  );
  assert.equal(yardstick[0]?.drop, 'yardstick', 'a bad yardstick is dropped, not the sheet');

  const answer = factErrors(sheet([], { answer: 'An atom is 10,000 times smaller.' }), env);
  assert.equal(answer.length, 1);
  assert.match(answer[0]?.toString() ?? '', /the answer .* which no fact on the sheet states/);
  assert.equal(answer[0]?.soft, undefined, 'a wrong answer number sends the sheet back');
});

await test('reference numbers: a magnitude matches in words or digits; a full date must appear as one unit', () => {
  const src =
    'A human hair is about a million carbon atoms wide. The union began in 1814. On 7 June 1905 the Storting dissolved it.';
  assert.deepEqual(numbersNotInSource(src, ['A hair is 1 million carbon atoms wide']), []);
  assert.deepEqual(numbersNotInSource(src, ['A hair is 1,000,000 atoms wide']), []);
  assert.deepEqual(numbersNotInSource(src, ['A hair is 2 million atoms wide']), ['2 million']);
  assert.deepEqual(numbersNotInSource(src, ['On June 7, 1905 the union ended']), []);
  assert.deepEqual(numbersNotInSource(src, ['On 6 June 1905 the vote passed']), ['6 June 1905']);
  assert.deepEqual(numbersNotInSource(src, ['On 7 June 1814 the union began']), ['7 June 1814']);
  const cost = 'It cost 1,500 million dollars. Up to 30 people died.';
  assert.deepEqual(numbersNotInSource(cost, ['$1,500 million', 'Up to 30 may have died']), []);
});

// ---------- the writer with a fake model ----------
const SHEET = {
  subject: BRIEF,
  question: 'How much smaller than a grain of sand is an atom?',
  answer: ANSWER,
  payoff: 'f4',
  yardstick: 'an atom at 1 m makes the sand 10,000 km wide',
  need: [],
  facts: [
    ...BASE,
    derived('f3', '1 mm is 1,000,000,000 pm', '1 mm / 1 pm'),
    F4,
    derived(
      'f6',
      'If an atom were 1 m wide, a grain of sand would be 10,000 km wide',
      '1 m * (1 mm / 100 pm)',
    ),
  ],
};
const spineShot = (facts: string[], device: string, link?: string) => ({
  point: `the point of ${facts.join(', ')}`,
  facts,
  device,
  hold: 0,
  ...(link ? { link } : {}),
});
const SPINE = {
  payoff_shot: 4,
  shots: [
    spineShot(['f1'], 'statement'),
    spineShot(['f2'], 'compare', 'but'),
    spineShot(['f3'], 'zoom', 'so'),
    spineShot(['f4'], 'reveal', 'which means'),
    spineShot(['f6'], 'yardstick', 'so'),
  ],
};
const LINES: [string, string][] = [
  ['How much smaller than a grain of sand is an atom?', 'sand'],
  ['But an atom is only one hundred picometres across.', 'picometres'],
  ['So one millimetre holds a billion picometres.', 'billion'],
  ['Which means an atom is ten million times smaller than the sand.', 'million'],
  [
    'So if an atom were one metre wide, the sand would be ten thousand kilometres wide.',
    'kilometres',
  ],
];
const script = (lines: [string, string][]) => ({
  title: 'Atom and sand',
  cast: { narrator: { voice: 'narrator' } },
  music: {},
  shots: lines.map(([text, word]) => ({
    lines: [{ who: 'narrator', text }],
    cue: { word, show: word },
  })),
});
const VIEWER = {
  scores: { hook: 5, clarity: 5, flow: 5, payoff: 5 },
  lost: [],
  flat: [],
  question: 'q',
  answer: 'a',
};
const PROBLEMS = {
  problems: [
    {
      shot: 5,
      kind: 'wrong',
      claim: 'ten thousand kilometres',
      problem: 'too big',
      fix: 'ten kilometres',
    },
    {
      shot: 2,
      kind: 'wrong',
      claim: 'one hundred picometres across',
      problem: 'say wide',
      fix: 'about one hundred picometres wide',
    },
    {
      shot: 1,
      kind: 'conflict',
      claim: 'grain of sand',
      problem: 'the brief and the reference disagree',
      fix: '',
    },
  ],
};
const fixOf = (shot: number, text: string) => ({ shot, lines: [{ who: 'narrator', text }] });

interface Call {
  step: string;
  messages: Message[];
}
async function runWriter(
  answers: Record<string, unknown>,
): Promise<{ story: Story; calls: Call[]; logs: string[] }> {
  const calls: Call[] = [];
  const logs: string[] = [];
  const E: WriterEnv = {
    brief: BRIEF,
    seconds: 24,
    budget: 60,
    m3: (step, _system, messages) => {
      calls.push({ step, messages: messages.map((m) => ({ ...m })) });
      const answer = answers[step] ?? answers[step.replace(/#\d+$/, '')];
      if (answer === undefined) throw new Error(`no fake answer for ${step}`);
      return Promise.resolve(JSON.stringify(answer));
    },
    prompt: (name) => `PROMPT ${name}`,
    guide: () => '',
    checks: () => ({}),
    range: () => null,
    list: () => [],
    ckSave: () => undefined,
    ckLoad: () => null,
    log: (msg) => {
      logs.push(msg);
    },
    extractJson: (text): unknown => JSON.parse(text),
    refBlock: () => '\n\nREFERENCE\nAn atom is about 100 pm across.',
    hasRef: () => false,
    addArticles: () => Promise.resolve(0),
    numbersNotIn: () => [],
    voiceGuide: '',
    feels: '',
    wpsOf: () => 2.5,
    padOf: () => 0,
  };
  const story = await createWriter(E).writeStory();
  return { story, calls, logs };
}
const reviewed = (fix: unknown) => ({
  facts: SHEET,
  spine: SPINE,
  script: script(LINES),
  viewer: VIEWER,
  factcheck: PROBLEMS,
  'script-revise': script(LINES),
  'factcheck-2': PROBLEMS,
  'script-fix': fix,
});
const lineOf = (story: Story, shot: number): string => story.shots[shot - 1]?.lines[0]?.text ?? '';
const userMessage = (calls: Call[], step: string): string =>
  calls.find((c) => c.step === step)?.messages.at(-1)?.content ?? '';

await test("the fact checker's input holds the brief and each derived fact's calc and result", async () => {
  const { calls } = await runWriter(reviewed({ shots: [] }));
  const input = userMessage(calls, 'factcheck');
  assert.ok(input.startsWith(`BRIEF\n${BRIEF}\n`), input.slice(0, 120));
  assert.match(
    input,
    /f4: An atom is about 10 million times smaller than a grain of sand \[derived: 1 mm \/ 100 pm = 10 million\]/,
  );
  assert.match(input, /f6: .* \[derived: 1 m \* \(1 mm \/ 100 pm\) = 10000 km\]/);
  assert.match(userMessage(calls, 'factcheck-2'), /^BRIEF\n/);
});

await test('a fact-check fix with a number not on the sheet is not taken; a conflict is reported, not fixed', async () => {
  const fixed2 = 'But an atom is only about one hundred picometres wide.';
  const { story, calls, logs } = await runWriter(
    reviewed({
      shots: [
        fixOf(5, 'So if an atom were one metre wide, the sand would be ten kilometres wide.'),
        fixOf(2, fixed2),
      ],
    }),
  );
  assert.equal(lineOf(story, 2), fixed2, 'a fix whose numbers are on the sheet is taken');
  assert.equal(
    lineOf(story, 5),
    LINES[4]?.[0],
    'a fix saying "ten" (no fact states 10) is not taken',
  );
  assert.ok(
    logs.includes(
      `script-fix: shot 5's fix says "ten", which no fact on the sheet states; not taken`,
    ),
    logs.join('\n'),
  );
  assert.ok(logs.includes('script-fix: rewrote shots 2 for the fact check'), logs.join('\n'));

  const sent = JSON.parse(
    userMessage(calls, 'script-fix').replace(/\n\nReturn only the JSON object\.$/, ''),
  ) as {
    shots: { shot: number }[];
  };
  assert.deepEqual(
    sent.shots.map((s) => s.shot),
    [2, 5],
    'the conflict (shot 1) is not sent to the fixer',
  );
  assert.ok(
    logs.some((l) => l.startsWith('fact check: 1 conflict(s) reported, not fixed')),
    logs.join('\n'),
  );
  assert.doesNotMatch(
    userMessage(calls, 'script-revise#1'),
    /the brief and the reference disagree/,
  );
});

await test('a fix that changes nothing is not logged as a rewrite', async () => {
  const { logs } = await runWriter(reviewed({ shots: [fixOf(2, LINES[1]?.[0] ?? '')] }));
  assert.ok(!logs.some((l) => l.startsWith('script-fix: rewrote')), logs.join('\n'));
  assert.ok(
    logs.includes('script-fix: no fix was taken for shots 2, 5; keeping the script'),
    logs.join('\n'),
  );
});

await test('a script line with a number not on the sheet is sent back', async () => {
  const wrong = LINES.map((l, i): [string, string] =>
    i === 2 ? ['So one millimetre holds a million picometres.', 'million'] : l,
  );
  const { story, calls } = await runWriter({
    facts: SHEET,
    spine: SPINE,
    'script#1': script(wrong),
    script: script(LINES),
    viewer: VIEWER,
    factcheck: { problems: [] },
  });
  assert.match(
    userMessage(calls, 'script#2'),
    /shot 3: "So one millimetre holds a million picometres\." says "a million", which no fact on the sheet states/,
  );
  assert.equal(lineOf(story, 3), LINES[2]?.[0]);
});
