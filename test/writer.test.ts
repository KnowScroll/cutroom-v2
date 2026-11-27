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
  assert.match(f3 ?? '', /1000000, which no other fact on the sheet states/);
  assert.deepEqual(errorsFor(wrong, 'f4'), [], '1 mm / 100 pm computes 1e7, which f4 states');

  const unitsWrongText = errorsFor(
    sheet([derived('f3', '1 mm = 1,000,000 pm', '1 mm / 1 pm')]),
    'f3',
  );
  assert.equal(unitsWrongText.length, 1);
  // past the operand check the calc is exact, so the message trusts its value
  assert.match(
    unitsWrongText[0] ?? '',
    /the engine computed 1 mm \/ 1 pm = 1 billion, but its text says/,
  );
  assert.match(
    unitsWrongText[0] ?? '',
    /exact on the sheet's quantities: if the calc is the right formula for the claim, write that value \(fairly rounded\) in the text; if the formula is not what the text claims, fix the calc/,
  );
  assert.doesNotMatch(unitsWrongText[0] ?? '', /never change a true claim/);

  assert.deepEqual(errorsOf(sheet([derived('f3', '1 mm = 1,000,000,000 pm', '1 mm / 1 pm')])), []);
});

await test("the Moon's mixed-units calc is rejected; the same walk with units computes", () => {
  const mixed = errorsFor(
    sheet([derived('m4', 'Walking to the Moon takes 2,442 days', '378000/5/24 - 29.5*24')]),
    'm4',
  );
  assert.equal(mixed.length, 1);
  assert.match(mixed[0] ?? '', /uses 24, which no other fact on the sheet states/);
  assert.match(
    mixed[0] ?? '',
    /Check the calc's factors and units: write each quantity with its unit/,
  );

  for (const [text, calc] of [
    ['Walking to the Moon non-stop takes about 75,600 hours', '378000 km / (5 km/h)'],
    ['Walking to the Moon non-stop takes about 8.6 years', '378000 km / (5 km/h)'],
    ['The Moon is about 30 Earths away', '378000 / 12742'],
  ] as const)
    assert.deepEqual(errorsOf(sheet([derived('m4', text, calc)])), [], `${text} = ${calc}`);

  const lessAMonth = errorsFor(
    sheet([
      derived('m4', 'It takes 2,442 days more than a month', '378000 km / (5 km/h) - 29.5 d'),
    ]),
    'm4',
  );
  assert.match(
    lessAMonth[0] ?? '',
    /computed .* = 3120\.5 days \(74892 h, 8\.54 yr\), but its text says/,
  );
  const lengthPlusTime = errorsFor(sheet([derived('m4', 'It is 5', '378000 km + 29.5 d')]), 'm4');
  assert.match(lengthPlusTime[0] ?? '', /adds or subtracts a length and a time/);

  // the same hours-and-days mix when every input is a time
  const hours: Fact = {
    id: 'm6',
    text: 'Walking non-stop to the Moon takes about 75,600 hours',
    source: 'reference',
  };
  const timeOnly = (text: string, calc: string) =>
    errorsFor(sheet([hours, derived('m7', text, calc)]), 'm7');
  for (const [text, calc] of [
    ['It takes 2,442 days longer than a lunar month', '75600/24 - 29.5*24'],
    ['It takes 1.8 million days', '75600 * 24'],
  ] as const)
    assert.match(
      timeOnly(text, calc)[0] ?? '',
      /uses 24, which no other fact/,
      `${text} = ${calc}`,
    );
  assert.deepEqual(timeOnly('A lunar month is about 708 hours', '29.5 d / 1 h'), []);
});

await test('scientific notation is read in calc and text', () => {
  for (const [text, calc] of [
    ['About 1 × 10^7 atoms fit across a grain of sand', '1e-3 m / 1e-10 m'],
    ['About 1e7 atoms fit across a grain of sand', '0.001 m / 100e-12 m'],
    ['About 10⁷ atoms fit across a grain of sand', '1 mm / 100 pm'],
  ] as const)
    assert.deepEqual(errorsOf(sheet([derived('f6', text, calc)])), [], `${text} = ${calc}`);
});

await test('bare numbers are literal: rates, magnitudes and counts compute; a chain of 100s does not', () => {
  const facts: Fact[] = [
    'A gold bar costs $750,000',
    'A gold bar weighs 12.4 kg',
    'The country has 5.5 million people',
    'The country covers 385,207 km2',
    'The project cost $690 million over 13 years',
    'About 4.4 billion people use the internet',
    'The world has about 8 billion people',
    'Since 1905 the country has been independent',
    'In 2024 it held an election',
    'The band has 4 members and released 12 albums',
    'Monaco has about 26,000 people per square kilometre',
    'Monaco covers 2.08 km2',
    'The contract pays $53 million a year for 13 years',
    'A year has 365 days and a day has 24 hours',
    'The world has about 7 billion phones',
    'The club has 70 members',
  ].map((text, i) => ({ id: `p${String(i + 1)}`, text, source: 'general' }));
  const rates = (calc: string, text: string): FactSheet => ({
    ...sheet([]),
    facts: [...BASE, F4, ...facts, derived('d1', text, calc)],
  });
  for (const [calc, text] of [
    ['750000 / 12.4', 'At that price gold costs $60,500 per kg'],
    ['750000 / 12.4 kg', 'At that price gold costs $60,500 per kg'],
    ['5500000 / 385207 km2', 'The country has about 14 people per km2'],
    ['690000000 / (13 yr)', 'That is about $53 million a year'],
    ['690000000 / (13 yr)', 'That is about $145,000 daily'],
    ['4.4 billion / 8 billion * 100', 'About 55% of people use the internet'],
    ['4.4 / 8 * 100', 'About 55% of people use the internet'],
    ['2024 - 1905', 'The country has been independent for 119 years'],
    ['12 / 4', 'That is 3 albums per member'],
    ['26000 * 2.08', 'Monaco has about 54,000 people'],
    ['53000000 * 13', 'The contract is worth about $690 million'],
    ['365 * 24', 'A year has 8,760 hours'],
    ['70 / 7', 'That is 10 members for each phone'],
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

await test('a calendar number is literal; AU is a unit; number words stop at punctuation, not inside a number', () => {
  const walk = (text: string, calc: string, more: string[]) =>
    errorsOf({
      ...sheet([]),
      facts: [
        ...BASE,
        F4,
        ...more.map((t, i): Fact => ({ id: `w${String(i)}`, text: t, source: 'general' })),
        derived('d1', text, calc),
      ],
    });
  const moon = [
    'The Moon is about 384,400 km from Earth',
    'A person walks about 5 km/h',
    'A hiker walks 12 hours a day',
  ];
  assert.deepEqual(walk('Walking to the Moon takes about 6,407 days', '384400 / 5 / 12', moon), []);
  assert.equal(
    walk('Walking to the Moon takes about 8.8 years', '384400 / 5 / 12', moon).length,
    1,
  );
  // beside units, a bare number the sheet only states with a unit must carry it
  for (const [hours, wrong] of [
    [12, 267],
    [8, 400],
  ] as const) {
    const day = [...moon.slice(0, 2), `A hiker walks ${String(hours)} hours a day`];
    const e = walk(
      `Walking takes about ${String(wrong)} days`,
      `384400 km / (5 km/h) / ${String(hours)}`,
      day,
    );
    assert.match(e[0] ?? '', new RegExp(`uses ${String(hours)} without its unit`));
  }
  assert.deepEqual(
    walk('Walking to the Moon takes about 6,407 days', '384400 km / (5 km/h) / (12 h/d)', moon),
    [],
  );
  for (const [text, calc, more] of [
    ['A shift pays $180', '15 * 12', ['A worker earns $15 an hour', 'A shift lasts 12 hours']],
    [
      'The train gets there in 30 minutes',
      '60 km / (120 km/h)',
      ['The town is 60 km away', 'The train runs at 120 km/h'],
    ],
    [
      'The equator moves at about 1,670 km/h',
      '40075 / 24',
      ['Earth is about 40,075 km around', 'Earth turns once every 24 hours'],
    ],
    [
      'Neptune is about 30 AU from the Sun',
      '4.5 billion km',
      ['Neptune is about 4.5 billion km from the Sun'],
    ],
    [
      'Sunlight takes about 4 hours to reach Neptune',
      '30 AU / (300000 km/s)',
      ['Neptune is about 30 AU from the Sun', 'Light travels 300,000 km/s'],
    ],
  ] as const)
    assert.deepEqual(walk(text, calc, [...more]), [], `${text} = ${calc}`);

  const said = (answer: string, fact: string) =>
    errorsOf({ ...sheet([{ id: 'w9', text: fact, source: 'general' }]), answer });
  assert.deepEqual(
    said(
      'In nineteen sixty-nine, six hundred million people watched.',
      'In 1969 about 600 million people watched the landing',
    ),
    [],
  );
  assert.deepEqual(
    said('It takes two thousand, four hundred and forty-two days.', 'The walk takes 2,442 days'),
    [],
  );
});

await test('derived facts build on each other in any order; a failing one feeds none; a unit alone is 1 of it', () => {
  const base = [
    ...sheet([]).facts,
    { id: 'c0', text: 'A hiker walks 12 hours a day', source: 'general' } satisfies Fact,
  ];
  const hours = derived('c1', 'Walking non-stop takes about 75,600 hours', '378000 km / (5 km/h)');
  const days = derived('c2', 'At 12 hours a day it takes about 6,300 days', '75600 h / (12 h/d)');
  assert.deepEqual(errorsOf({ ...sheet([]), facts: [...base, days, hours] }), []);

  const badHours = derived('c1', hours.text, '378000 km / (5 km/h) * 1000');
  const fed = errorsOf({ ...sheet([]), facts: [...base, days, badHours] });
  assert.ok(
    fed.some((e) => e.startsWith('fact c2') && /uses 75600 h, which no other fact/.test(e)),
    fed.join('\n'),
  );

  const years = derived('c3', 'That is about 8.6 years', '75600 h / (24 h / d) / (365 d / yr)');
  const lone = (more: Fact[]) =>
    errorsFor({ ...sheet([]), facts: [...base, hours, ...more, years] }, 'c3');
  assert.deepEqual(
    lone([
      { id: 'c4', text: 'A day has 24 hours', source: 'general' },
      { id: 'c5', text: 'A year has 365 days', source: 'general' },
    ]),
    [],
  );
  const unstated = lone([]);
  assert.match(unstated[0] ?? '', /uses 24 h, which no other fact on the sheet states/);
  assert.match(
    unstated[0] ?? '',
    /to state hours as years, write the hours quantity and put years in the text/,
  );
});

await test('a conversion is one quantity; a unit ratio must be true; a rate can be written; a pointless 1 is no factor', () => {
  const hours = derived('c1', 'Walking non-stop takes about 75,600 hours', '378000 km / (5 km/h)');
  const on = (text: string, calc: string) =>
    errorsFor(
      { ...sheet([]), facts: [...sheet([]).facts, hours, derived('c9', text, calc)] },
      'c9',
    );
  assert.deepEqual(on('That is about 8.6 years', '75600 h'), []);
  assert.deepEqual(on('That is about 8.6 years', '75600 h / (8760 h/yr)'), []);
  assert.equal(
    on('1 mm = 1,000,000 pm', '1 mm').length,
    1,
    'every quantity of the kind must agree',
  );
  assert.match(
    on('1 mm = 1,000,000 pm', '1 mm * (1000000 pm/mm)')[0] ?? '',
    /not the true conversion \(that is 1 billion pm\/mm\)/,
  );
  assert.match(
    on('A grain of sand is about 1 million atoms wide', '1 million / 1')[0] ?? '',
    /"\* 1" or "\/ 1", which changes nothing/,
  );

  // a rate after a bare number is its unit; a reciprocal 1 and a percent 100 are plain factors
  const daily: Fact[] = [
    { id: 'r1', text: 'A family spends $41 a day', source: 'general' },
    { id: 'r2', text: 'People blink about 100,000 times a day', source: 'general' },
    { id: 'r3', text: 'A machine fails once in 0.0008 of its runs', source: 'general' },
    { id: 'r4', text: 'The Moon has 1.2% of the mass of Earth', source: 'general' },
    { id: 'r5', text: 'Earth has a mass of 5.97e24 kg', source: 'general' },
  ];
  const at = (text: string, calc: string) =>
    errorsFor(
      { ...sheet([]), facts: [...sheet([]).facts, ...daily, derived('c9', text, calc)] },
      'c9',
    );
  for (const calc of ['41 /d', '41/d', '41 per d', '41 * 1 yr / 1 d', '41 d^-1 * 1 yr'])
    assert.deepEqual(at('That is about $15,000 a year', calc), [], calc);
  assert.deepEqual(at('That is about 36.5 million blinks a year', '100000 /d'), []);
  assert.deepEqual(at('That is 1 failure in 1,250 runs', '1 / 0.0008'), []);
  assert.deepEqual(at('The Moon has a mass of about 7.2e22 kg', '1.2 / 100 * 5.97e24 kg'), []);
});

await test('a reference fact quotes its sentence in the reference with its numbers; a payoff quote never fails the sheet', () => {
  const ref =
    'A human hair is about a million carbon atoms wide. An atom is about 100 picometers across.';
  const withRef = {
    brief: BRIEF,
    hasRef: () => true,
    numbersNotIn: (texts: string[]) => numbersNotInSource(ref, texts),
    refBlock: () => `\n\nREFERENCE\n${ref}`,
  };
  const fact = (id: string, text: string, quote?: string): Fact => ({
    id,
    text,
    source: 'reference',
    ...(quote === undefined ? {} : { quote }),
  });
  const quoteOf = (x: Fact) =>
    factErrors(
      {
        ...sheet([]),
        facts: [
          ...sheet([]).facts.filter((y) => y.id !== 'f2'),
          fact('f2', 'An atom is about 100 pm across', 'An atom is about 100 picometers across.'),
          x,
        ],
      },
      withRef,
    )
      .map((e) => e.toString())
      .filter((e) => e.startsWith(`fact ${x.id}`));
  assert.deepEqual(
    quoteOf(
      fact(
        'q1',
        'A human hair is about 1 million carbon atoms wide',
        'A human hair is about a million carbon atoms wide.',
      ),
    ),
    [],
  );
  // whether the quote says the same thing is the fact checker's call: it sees the fact with its quote
  assert.deepEqual(
    quoteOf(
      fact(
        'q1',
        'A grain of sand is about 1 million carbon atoms wide',
        'A human hair is about a million carbon atoms wide.',
      ),
    ),
    [],
  );
  assert.match(
    quoteOf(
      fact('q1', 'An atom is about 200 pm across', 'An atom is about 100 picometers across.'),
    ).join(' '),
    /says "200", which its quote .* does not state/,
  );
  assert.match(quoteOf(fact('q1', 'An atom is about 100 pm across'))[0] ?? '', /give "quote"/);
  assert.match(
    quoteOf(fact('q1', 'An atom is about 100 pm across', 'An atom is 100 pm wide.'))[0] ?? '',
    /not in the REFERENCE word for word/,
  );
  const payoff = factErrors(
    {
      ...sheet([]),
      payoff: 'q1',
      facts: [
        ...sheet([]).facts,
        fact('q1', 'An atom is about 100 pm across', 'An atom is 100 pm wide.'),
      ],
    },
    withRef,
  ).filter((e) => e.toString().startsWith('fact q1'));
  assert.ok(
    payoff.length > 0 && payoff.every((e) => e.soft === true && e.drop === undefined),
    'kept, not failed or dropped',
  );
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
    ...BASE.map((x) =>
      x.id === 'f2' ? { ...x, quote: 'An atom is typically about 100 picometers across.' } : x,
    ),
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
const checked = <T extends object>(o: T) => ({
  facts: SHEET.facts.map((x) => ({ id: x.id, verdict: 'ok' })),
  lines: LINES.map((_, i) => ({ shot: i + 1, verdict: 'ok' })),
  ...o,
});
const PROBLEMS = checked({
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
});
const fixOf = (shot: number, text: string) => ({ shot, lines: [{ who: 'narrator', text }] });

interface Call {
  step: string;
  messages: Message[];
  efforts?: string[] | undefined;
}
async function runWriter(
  answers: Record<string, unknown>,
  brief = BRIEF,
): Promise<{ story: Story; calls: Call[]; logs: string[] }> {
  const calls: Call[] = [];
  const logs: string[] = [];
  const E: WriterEnv = {
    brief,
    seconds: 24,
    budget: 60,
    m3: (step, _system, messages, _max, efforts) => {
      calls.push({ step, messages: messages.map((m) => ({ ...m })), efforts });
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
    /f4: An atom is about 10 million times smaller than a grain of sand \[derived: 1 mm \/ 100 pm; the engine computed it, units converted, and it matches its text\]/,
  );
  assert.match(input, /f6: .* \[derived: 1 m \* \(1 mm \/ 100 pm\); the engine computed it/);
  assert.match(
    input,
    /f2: An atom is about 100 pm across \[quote: "An atom is typically about 100 picometers across\."\]/,
  );
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

await test('a conflict the first fact check reported stays in the last one, marked, where the harness reads it', async () => {
  const first = PROBLEMS.problems,
    second = checked({ problems: first.filter((p) => p.kind !== 'conflict') });
  const { story } = await runWriter({ ...reviewed({ shots: [] }), 'factcheck-2': second });
  const last = story.review?.factcheck2?.problems ?? [];
  const conflict = last.find((p) => p.shot === 1);
  assert.match(
    conflict?.problem ?? '',
    /^a conflict between the brief and the reference, reported, not fixed: /,
  );
  assert.equal(last.length, first.length);
});

await test("the brief's Audience, Goal and Tone lines reach the model as the intake's reading, not as facts", async () => {
  const goal = 'Goal: The viewer should grasp that an atom is a lifetime of steps smaller.';
  const { calls } = await runWriter(
    reviewed({ shots: [] }),
    `${BRIEF}\n\nAudience: anyone\n${goal}\nTone: calm\n`,
  );
  for (const step of ['facts#1', 'spine#1', 'script#1', 'factcheck']) {
    const input = userMessage(calls, step);
    assert.match(
      input,
      /\(The lines below are the intake's reading of the request, never facts/,
      step,
    );
    assert.ok(input.includes(goal), step);
  }
});

await test('a conflict the checker says a sheet fact settles is fixed toward the sheet', async () => {
  const settled = checked({
    problems: [
      {
        shot: 5,
        kind: 'conflict',
        claim: 'ten thousand kilometres',
        problem: 'the brief says otherwise',
        fix: '',
        settled_by: ['f6'],
      },
    ],
  });
  const { calls, logs } = await runWriter({
    ...reviewed({ shots: [] }),
    factcheck: settled,
    'factcheck-2': settled,
  });
  assert.ok(
    logs.includes("fact check: shot 5's conflict is settled by f6; fixed toward the sheet"),
    logs.join('\n'),
  );
  assert.ok(!logs.some((l) => l.includes('conflict(s) reported, not fixed')), logs.join('\n'));
  assert.match(userMessage(calls, 'script-fix'), /"shot": 5/);
});

await test('the fact checker thinks, gives a verdict on every fact and shot, and is asked again for the ones it left out', async () => {
  const again = checked({ problems: [] });
  again.facts = again.facts.map((v) =>
    v.id === 'f2' ? { id: 'f2', verdict: 'it says this of the wrong thing' } : v,
  );
  const { calls, logs } = await runWriter({
    ...reviewed({ shots: [] }),
    factcheck: { problems: [] },
    'factcheck-again': again,
  });
  assert.deepEqual(calls.find((c) => c.step === 'factcheck')?.efforts, ['low', 'off']);
  assert.ok(
    logs.some(
      (l) => l.startsWith('factcheck: no verdict for f1, f2,') && l.endsWith('; asked once more'),
    ),
    logs.join('\n'),
  );
  assert.match(userMessage(calls, 'script-revise#1'), /f2: An atom is about 100 pm across/);
  assert.match(userMessage(calls, 'script-revise#1'), /it says this of the wrong thing/);
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
    factcheck: checked({ problems: [] }),
  });
  assert.match(
    userMessage(calls, 'script#2'),
    /shot 3: "So one millimetre holds a million picometres\." says "a million", which no fact on the sheet states/,
  );
  assert.equal(lineOf(story, 3), LINES[2]?.[0]);
});
