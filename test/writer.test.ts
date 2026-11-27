import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createWriter,
  factErrors,
  numbersNotInSource,
  padding,
  rateMoved,
  repeatErrors,
  spokenErrors,
  shotTimes,
  silenceOf,
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
  idea: 'How much smaller than a grain of sand an atom is',
  takeaway: 'An atom is about ten million times smaller than a grain of sand',
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
  checks: Record<string, string> = {},
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
    checks: () => checks,
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
    voiceModel: 'heygen-test',
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
  'script-fix-2': { shots: [] },
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

await test('the fact checker runs without thinking, gives a verdict on every fact and shot, and is asked again for the ones it left out', async () => {
  const again = checked({ problems: [] });
  again.facts = again.facts.map((v) =>
    v.id === 'f2' ? { id: 'f2', verdict: 'it says this of the wrong thing' } : v,
  );
  const { calls, logs } = await runWriter({
    ...reviewed({ shots: [] }),
    factcheck: { problems: [] },
    'factcheck-again': again,
  });
  // no thinking: low-effort thinking took 47-551 s per check in QC1; the verdicts are what make it read every fact
  assert.deepEqual(calls.find((c) => c.step === 'factcheck')?.efforts, ['off']);
  assert.ok(
    logs.some(
      (l) => l.startsWith('factcheck: no verdict for f1, f2,') && l.endsWith('; asked once more'),
    ),
    logs.join('\n'),
  );
  assert.match(userMessage(calls, 'script-revise#1'), /f2: An atom is about 100 pm across/);
  assert.match(userMessage(calls, 'script-revise#1'), /it says this of the wrong thing/);
});

// ---------- story freedom (#47) ----------
const passed = () => ({ ...reviewed({ shots: [] }), factcheck: checked({ problems: [] }) });
const steps = (calls: Call[], step: string): number => calls.filter((c) => c.step === step).length;

await test('a draft over the word budget is cut to length by the fit step, not sent back', async () => {
  // 98 words against a budget of 60: the old hard cap (1.3x) rejected it on every try and ended the run
  const long: [string, string][] = [
    [
      'Picture a single grain of sand resting on your fingertip right now. How much smaller than a grain of sand is an atom?',
      'sand',
    ],
    [
      'But an atom, the tiny building block of everything around you, is only one hundred picometres across.',
      'picometres',
    ],
    [
      'So one millimetre, about the width of that grain, holds a billion picometres laid end to end.',
      'billion',
    ],
    [
      'Which means an atom is ten million times smaller than the sand, a gap that is very hard to picture.',
      'million',
    ],
    [
      'So if an atom were one metre wide, the sand would be ten thousand kilometres wide, bigger than a whole country.',
      'kilometres',
    ],
  ];
  const { story, calls, logs } = await runWriter({
    ...passed(),
    script: script(long),
    'script-fit': { shots: LINES.map(([text], i) => fixOf(i + 1, text)) },
  });
  assert.equal(steps(calls, 'script#1'), 1);
  assert.equal(steps(calls, 'script#2'), 0, 'the overrun is not sent back to the scriptwriter');
  assert.ok(!logs.some((l) => l.startsWith('script rejected')), logs.join('\n'));
  assert.ok(logs.includes('script-fit: 98 -> 55 words (budget 60)'), logs.join('\n'));
  assert.deepEqual(
    story.shots.map((s) => s.lines[0]?.text),
    LINES.map(([text]) => text),
  );
  const asked = JSON.parse(
    userMessage(calls, 'script-fit#1').replace(/\n\nReturn only the JSON object\.$/, ''),
  ) as { shots: { shot: number; target_words: number }[] };
  const targets = asked.shots.map((s) => s.target_words);
  assert.deepEqual(targets, [14, 10, 10, 12, 12], 'every shot gives words in proportion');
  assert.ok(targets.reduce((a, b) => a + b, 0) <= 60, 'the targets fit the budget');

  // a cut that breaks a hard check (shot 1 opening with a definition) gives that shot its draft back; the others keep theirs
  const hook = await runWriter({
    ...passed(),
    script: script(long),
    'script-fit': {
      shots: LINES.map(([text], i) => fixOf(i + 1, i ? text : 'An atom is far smaller than sand.')),
    },
  });
  assert.equal(hook.story.shots[0]?.lines[0]?.text, long[0]?.[0]);
  assert.equal(hook.story.shots[1]?.lines[0]?.text, LINES[1]?.[0]);
  assert.ok(hook.logs.includes('script-fit: 98 -> 67 words (budget 60)'), hook.logs.join('\n'));

  // a fit that takes no cut leaves the draft far over budget: length never ends a run (QC1 Panama: 208 words for 96 stopped it);
  // the shortest script is kept and the overrun logged
  const stuck = await runWriter({ ...passed(), script: script(long), 'script-fit': { shots: [] } });
  assert.equal(stuck.story.shots[0]?.lines[0]?.text, long[0]?.[0]);
  assert.ok(
    stuck.logs.includes(
      'script-fit: WARNING: 98 words after the fit, 63% over the budget of 60; the reel will run long',
    ),
    stuck.logs.join('\n'),
  );
});

await test('the spine is told how many shots the word budget carries', async () => {
  // 60 words carry about 6 shots of 10 words, inside the default range of 5 to 9
  const { calls } = await runWriter(passed());
  assert.match(
    userMessage(calls, 'spine#1'),
    /Target length: 24 seconds: 6 shots, about 60 spoken words in all \(at least about 10 words a shot/,
  );
});

await test('the spine says what the story is for, may bring a fact back, and runs forward in time outside a flashback', async () => {
  const noIdea = { ...SPINE, idea: '' };
  const reuse = {
    ...SPINE,
    shots: SPINE.shots.map((s, i) => (i === 2 ? { ...s, facts: ['f2', 'f3'] } : s)),
  };
  const dated = (when: string) => ({
    ...reuse,
    shots: reuse.shots.map((s, i) => ({ ...s, when: ['', '1905', when, '1905', ''][i] ?? '' })),
  });
  const { calls, logs } = await runWriter({
    ...passed(),
    'spine#1': noIdea,
    'spine#2': dated('1814'),
    'spine#3': dated('flashback: 1814'),
  });
  const rejected = logs.filter((l) => l.startsWith('spine rejected'));
  assert.equal(rejected.length, 2, rejected.join('\n'));
  assert.match(rejected[0] ?? '', /^spine rejected: first say what the story is for/);
  assert.match(
    rejected[1] ?? '',
    /^spine rejected: shot 3 \("when": "1814"\) goes back in time after shot 2 \("1905"\)/,
  );
  assert.ok(!logs.some((l) => /one fact, one shot/.test(l)), 'f2 in shots 2 and 3 is no problem');
  assert.equal(steps(calls, 'spine#3'), 1);
  assert.equal(steps(calls, 'spine#4'), 0, 'the flashback passes');
  assert.match(userMessage(calls, 'script#1'), /WHAT THE STORY IS FOR: How much smaller/);
});

await test('a viewer lost in the story gets a new spine and a script written on it; a flat shot only gets a revision', async () => {
  const lost = { ...VIEWER, lost: [{ shot: 3, why: 'it jumps back in time without saying so' }] };
  const rebuilt = {
    ...SPINE,
    shots: SPINE.shots.map((s, i) => ({ ...s, point: `the rebuilt point ${String(i + 1)}` })),
  };
  const { story, calls, logs } = await runWriter({
    ...passed(),
    viewer: lost,
    'spine-revise': rebuilt,
  });
  assert.match(userMessage(calls, 'spine-revise#1'), /it jumps back in time without saying so/);
  assert.equal(steps(calls, 'script#1'), 2, 'the script is written again on the new spine');
  assert.equal(steps(calls, 'script-revise#1'), 0);
  assert.equal(steps(calls, 'factcheck-2'), 1, 'the new script is fact-checked');
  assert.equal(story.shots[0]?.point, 'the rebuilt point 1');
  assert.equal(story.review?.spine_rebuilt, true);
  assert.ok(logs.includes('spine-revise: the script was written again on the new spine'));

  const flat = { ...VIEWER, flat: [{ shot: 2, why: 'adds nothing' }] };
  const second = await runWriter({ ...passed(), viewer: flat });
  assert.equal(steps(second.calls, 'spine-revise#1'), 0);
  assert.equal(steps(second.calls, 'script-revise#1'), 1);
});

await test('a line that says nothing new is flagged softly; building on a number and restating the answer at the close pass', () => {
  const shot = (text: string) => ({ lines: [{ who: 'narrator', text }] });
  const errors = repeatErrors([
    shot('How long would it take to walk to the Moon?'),
    shot('You walk about five kilometres an hour.'),
    shot('The Moon is about three hundred eighty thousand kilometres away.'),
    // the old rule flagged "five kilometres an hour" here: a callback that works out something new
    shot('At five kilometres an hour, that gap takes about nine years of walking.'),
    shot('The Moon is about three hundred eighty thousand kilometres from you.'),
    shot('So walking to the Moon takes about nine years.'),
  ]);
  assert.equal(errors.length, 1, errors.join('\n'));
  assert.equal(errors[0]?.soft, true);
  assert.match(String(errors[0]), /^shot 5: "The Moon is about three hundred eighty thousand/);

  // q-t3-moon: the answer shot restated the shot before it; a microwave payoff joining earlier words into a new claim passes
  const moon = repeatErrors([
    shot('How long would it take to walk to the Moon?'),
    shot(
      'Those hours total about eight point eight years. An average human life lasts about seventy-three years.',
    ),
    shot(
      'So the walk would take about eight point eight years, while your whole life would last about seventy-three years.',
    ),
    shot('The sky is closer than your lifetime.'),
  ]);
  assert.deepEqual(
    moon.map((e) => String(e).slice(0, 8)),
    ['shot 3: '],
  );
  const microwave = repeatErrors([
    shot('How does a microwave oven heat food without the oven becoming hot? Watch the water.'),
    shot('The magnetron produces the microwaves.'),
    shot('The microwaves carry a field into the food. Then polar molecules align with that field.'),
    shot('Water molecules are polar, so microwaves heat them most effectively.'),
    shot('That is how a microwave heats food.'),
  ]);
  assert.deepEqual(microwave.map(String), []);
});

await test('lead and tail are set per template, and by default a cut no longer leaves 0.95 s of silence', () => {
  const shots = [
    { lines: [{}, { gap_before: 0.5 }] },
    { lines: [{}], hold: 1 },
    { lines: [{}] },
    { lines: [{}] },
  ];
  const secs = [[2, 1.5], [3], [2.5], [2]];
  const timesWith = (pad: ReturnType<typeof padding>) =>
    shots.map((s, i) => shotTimes(s, secs[i] ?? [], pad, i === shots.length - 1));
  // the silence across the cut after shot i: its tail after the last line, its hold, then the next shot's lead
  const gapAfter = (t: ReturnType<typeof timesWith>, i: number): number =>
    (t[i]?.dur ?? 0) - (t[i]?.lines.at(-1)?.end ?? 0) + (t[i + 1]?.lines[0]?.start ?? 0);
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

  const byDefault = timesWith(padding({}));
  assert.ok(near(gapAfter(byDefault, 0), 0.5), String(gapAfter(byDefault, 0)));
  assert.ok(near(gapAfter(byDefault, 2), 0.5));
  assert.ok(near(gapAfter(byDefault, 1), 1.5), 'a silent hold stays where the spine put it');
  assert.ok(near(byDefault[0]?.lines[1]?.start ?? 0, 0.15 + 2 + 0.5), 'gap_before sets the pause');
  assert.ok(
    near((byDefault[3]?.dur ?? 0) - (byDefault[3]?.lines[0]?.end ?? 0), 1),
    'the last picture holds a second',
  );

  const set = timesWith(padding({ lead: '0.3', tail: '0.6', shots: '7-8' }));
  assert.ok(near(gapAfter(set, 0), 0.9));
  assert.ok(near(set[0]?.lines[0]?.start ?? 0, 0.3));
  assert.deepEqual(padding({ lead: 'soon' }), padding({}), 'a bad value keeps the default');

  // the word budget counts the same silence the timeline leaves
  for (const pad of [padding({}), padding({ lead: '0.3', tail: '0.6' })]) {
    const t = timesWith(pad);
    const total = t.reduce((a, x) => a + x.dur, 0);
    const speech = secs.flat().reduce((a, b) => a + b, 0);
    assert.ok(near(silenceOf(shots, pad), total - speech));
  }
});

// the writer on a sheet whose payoff fact f7 (shot 4) states `text`; shot 4 says the given lines, its cue word `cue`
const payoffRun = (text: string, cue: string, answers: Record<string, string>) => {
  const f7: Fact = { id: 'f7', text, source: 'general' };
  const facts = { ...SHEET, payoff: 'f7', answer: `${text}.`, facts: [...SHEET.facts, f7] };
  const spine = {
    ...SPINE,
    shots: SPINE.shots.map((s, i) => (i === 3 ? { ...s, facts: ['f7'] } : s)),
  };
  const said = (line: string) => script(LINES.map((l, i) => (i === 3 ? [line, cue] : l)));
  return runWriter({
    ...passed(),
    facts,
    spine,
    ...Object.fromEntries(Object.entries(answers).map(([step, line]) => [step, said(line)])),
    factcheck: {
      facts: facts.facts.map((x) => ({ id: x.id, verdict: 'ok' })),
      lines: LINES.map((_, i) => ({ shot: i + 1, verdict: 'ok' })),
      problems: [],
    },
  });
};
const rejectionsOf = (logs: string[]) => logs.filter((l) => l.startsWith('script rejected'));

await test('the payoff shot must say the answer, and a number past trillion can be said and traced', async () => {
  // q-t3-atom: the payoff 1.25e20 could not be said in a form the trace read, and its shot said "an almost unimaginable number"
  const answer = 'Which means one grain holds about one hundred and twenty-five quintillion atoms.';
  const { story, logs } = await payoffRun('A grain of sand holds about 1.25e20 atoms', 'atoms', {
    'script#1': 'Which means one grain holds an almost unimaginable number of atoms.',
    'script#2': answer,
  });
  const rejected = rejectionsOf(logs);
  assert.equal(rejected.length, 1, rejected.join('\n'));
  assert.match(
    rejected[0] ?? '',
    /the payoff shot \(4\) must say the answer's own number in words \("one hundred and twenty-five quintillion"/,
  );
  assert.equal(story.shots[3]?.lines[0]?.text, answer);

  // past sextillion: the hint must read back as the value (5.97e24 was offered as "five thousand ... sextillion", read as 9.7e23)
  const mass = 'Which means the Earth weighs about five point nine seven septillion kilograms.';
  const earth = await payoffRun("The Earth's mass is about 5.97e24 kg", 'weighs', {
    'script#1': 'Which means the Earth weighs an unimaginable amount.',
    'script#2': mass,
  });
  assert.match(rejectionsOf(earth.logs)[0] ?? '', /\("five point nine seven septillion"/);
  assert.equal(earth.story.shots[3]?.lines[0]?.text, mass);

  // a number with no spoken form the trace reads back (below 1e-6) is asked for, never a reason to stop the run
  const vague = 'Which means an atom is far too small to picture.';
  const tiny = await payoffRun('An atom is about 1e-10 m wide', 'atom', { script: vague });
  assert.ok(
    tiny.logs.some((l) =>
      l.startsWith('script: kept the answer with only craft problems left: the payoff shot (4)'),
    ),
    tiny.logs.join('\n'),
  );
  assert.equal(tiny.story.shots[3]?.lines[0]?.text, vague);

  // a missing answer is asked for, never the reason a run ends: after the last try the script is kept
  const never = await payoffRun('A grain of sand holds about 1.25e20 atoms', 'atoms', {
    script: 'Which means one grain holds an almost unimaginable number of atoms.',
  });
  assert.ok(
    never.logs.some((l) =>
      l.startsWith('script: kept the answer with only craft problems left: the payoff shot (4)'),
    ),
    never.logs.join('\n'),
  );

  // a date's day is said as an ordinal and a year as a year: neither is asked for (QC1 Norway demanded "twenty-six")
  const date = await payoffRun('The union with Sweden ended on 26 October 1905', 'ended', {
    script: 'Which means the union with Sweden ended on the twenty-sixth of October.',
  });
  assert.ok(!date.logs.some((l) => l.includes('must say the answer')), date.logs.join('\n'));
});

await test('time runs forward for BC years and "years ago" too', async () => {
  const dated = (...when: string[]) => ({
    ...SPINE,
    shots: SPINE.shots.map((s, i) => ({ ...s, when: when[i] ?? '' })),
  });
  for (const order of [
    ['', '753 BC', '509 BC', '264 BC', ''],
    ['', '252 million years ago', '201 million years ago', '145 million years ago', ''],
    ['', '264 BC', '1905', '1914', ''],
    // QC1 Panama: context from an earlier time, marked as such, is no jump back
    ['', '1903', 'background: 1886', '1904', ''],
  ]) {
    const { logs } = await runWriter({ ...passed(), 'spine#1': dated(...order) });
    assert.ok(
      !logs.some((l) => l.startsWith('spine rejected')),
      `${order.join(', ')}\n${logs.join('\n')}`,
    );
  }
  const back = await runWriter({
    ...passed(),
    'spine#1': dated(
      '',
      '145 million years ago',
      '252 million years ago',
      '201 million years ago',
      '',
    ),
  });
  assert.match(
    back.logs.find((l) => l.startsWith('spine rejected')) ?? '',
    /shot 3 \("when": "252 million years ago"\) goes back in time after shot 2/,
  );
});

await test('the idea and takeaway are checked: an untraced number is sent back, a wrong takeaway takes the checker fix', async () => {
  const takeaway = 'An atom is about ten million times smaller than a grain of sand';
  const { story, calls, logs } = await runWriter({
    ...passed(),
    'spine#1': { ...SPINE, takeaway: 'An atom is about seven million times smaller than sand' },
    'spine#2': { ...SPINE, takeaway: 'Your whole life is barely a tenth of an atom' },
    factcheck: checked({
      problems: [
        {
          shot: 'takeaway',
          kind: 'wrong',
          claim: 'barely a tenth',
          problem: 'turned around',
          fix: takeaway,
        },
      ],
    }),
  });
  assert.match(
    logs.find((l) => l.startsWith('spine rejected')) ?? '',
    /the idea and takeaway say "seven million", which no fact on the sheet states/,
  );
  assert.match(
    userMessage(calls, 'factcheck'),
    /\nTAKEAWAY: Your whole life is barely a tenth of an atom\n/,
  );
  assert.equal(story.takeaway, takeaway);
  assert.ok(userMessage(calls, 'script-revise#1').includes(`come away with: "${takeaway}"`));
});

await test('a script keeps the speaking rate it was written for, and only a voice switch that moves it rewrites it', async () => {
  const { story } = await runWriter(passed());
  assert.equal(story.wps, 2.5);
  assert.equal(story.voice_model, 'heygen-test');
  const eleven = { voice_model: 'eleven_v4', wps: 2.18 };
  assert.equal(rateMoved(eleven, 2.9, 'heygen'), true, 'eleven-v4 to heygen');
  assert.equal(rateMoved({ voice_model: 'heygen', wps: 2.9 }, 3.1, 'minimax'), false, 'within 15%');
  assert.equal(
    rateMoved(eleven, 2.9, 'eleven_v4'),
    false,
    'the same voice measured at a new rate (a resumed cut) is kept',
  );
  assert.equal(rateMoved({}, 2.9, 'heygen'), false, 'an older checkpoint without a rate is kept');
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

// ---------- scripts answer the request (#70) ----------
const flatViewer = { ...VIEWER, flat: [{ shot: 2, why: 'adds nothing' }] };

await test('the second fact check gets one fix pass: a wrong sheet fact reaches the shot using it, the screen can be fixed, and only what stays is reported', async () => {
  const shot5 =
    'So if an atom were one metre wide, the sand would reach ten thousand kilometres across.';
  const second = {
    facts: SHEET.facts.map((x) => ({
      id: x.id,
      verdict:
        x.id === 'f6'
          ? 'it adds a comparison to itself'
          : x.id === 'f5'
            ? 'says it of the wrong thing'
            : 'ok',
    })),
    lines: LINES.map((_, i) => ({ shot: i + 1, verdict: 'ok' })),
    problems: [
      {
        shot: 4,
        kind: 'wrong',
        claim: 'the counter',
        problem: 'the counter shows another number',
        fix: 'show 10 million',
      },
    ],
  };
  const { story, calls, logs } = await runWriter({
    ...passed(),
    viewer: flatViewer,
    'factcheck-2': second,
    'script-fix': {
      shots: [
        { ...fixOf(4, LINES[3]?.[0] ?? ''), see: 'A counter lands on 10 million' },
        fixOf(5, shot5),
      ],
    },
  });
  assert.match(
    userMessage(calls, 'script-fix'),
    /the sheet fact this shot uses is wrong: it adds a comparison to itself/,
  );
  assert.equal(story.shots[3]?.see, 'A counter lands on 10 million');
  assert.equal(lineOf(story, 5), shot5);
  const left = story.review?.factcheck2?.problems ?? [];
  assert.deepEqual(
    left.map((p) => [p.claim?.slice(0, 3), p.unused]),
    [['f5:', true]],
    'only the wrong fact no shot uses stays, marked',
  );
  assert.equal(story.review?.fixed2?.length, 2);
  assert.ok(logs.includes('fact check of the revision: 2 fixed, 1 left'), logs.join('\n'));
});

await test('a wrong fact two shots use stays reported until both are fixed', async () => {
  // review of #74: shot 2's fix was taken, shot 3's said a number no fact states, and the flag was dropped while shot 3 still said it
  const spine = {
    ...SPINE,
    shots: SPINE.shots.map((s, i) => (i === 2 ? { ...s, facts: ['f2', 'f3'] } : s)),
  };
  const second = {
    facts: SHEET.facts.map((x) => ({
      id: x.id,
      verdict: x.id === 'f2' ? 'the reference says something else' : 'ok',
    })),
    lines: LINES.map((_, i) => ({ shot: i + 1, verdict: 'ok' })),
    problems: [],
  };
  const { story, logs } = await runWriter({
    ...passed(),
    spine,
    viewer: flatViewer,
    'factcheck-2': second,
    'script-fix': {
      shots: [
        fixOf(2, 'But an atom is only about one hundred picometres wide.'),
        fixOf(3, 'So one millimetre holds a billion picometres, five hundred atoms.'),
      ],
    },
  });
  assert.ok(
    logs.some((l) => l.startsWith("script-fix: shot 3's fix says")),
    logs.join('\n'),
  );
  assert.deepEqual(
    (story.review?.factcheck2?.problems ?? []).map((p) => p.claim?.slice(0, 3)),
    ['f2:'],
  );
  assert.ok(logs.includes('fact check of the revision: 0 fixed, 1 left'), logs.join('\n'));

  // shot 2 fixed by the first pass and shot 3 by the second: fixed (it stayed listed, each pass judging only its own changes)
  const both = await runWriter({
    ...passed(),
    spine,
    viewer: flatViewer,
    'factcheck-2': second,
    'script-fix': {
      shots: [
        fixOf(2, 'But an atom is only about one hundred picometres wide.'),
        fixOf(3, 'So one millimetre holds a billion picometres, five hundred atoms.'),
      ],
    },
    'script-fix-2': { shots: [fixOf(3, 'So a single millimetre holds a billion picometres.')] },
  });
  assert.deepEqual(both.story.review?.factcheck2?.problems ?? [], []);
  assert.ok(
    both.logs.includes('fact check of the revision: 1 fixed, 0 left'),
    both.logs.join('\n'),
  );
});

await test('the fit can cut a shot that keeps a slightly rounded number its draft already said', async () => {
  // 9.8 million for 10 million is 2% off (allowed); 9.7 million is 3% (asked to fix, kept after the last try)
  const near = 'Which means an atom is nine point seven million times smaller than the sand.';
  const long = LINES.map((l, i): [string, string] =>
    i === 3
      ? [`${near} That is a gap far beyond anything you can picture in your mind today.`, 'million']
      : l,
  );
  const { story, logs } = await runWriter({
    ...passed(),
    script: script(long),
    'script-fit': { shots: [fixOf(4, near)] },
  });
  assert.equal(lineOf(story, 4), near, logs.join('\n'));
});

await test('the viewer judges the reel against the request, and a request left unanswered rebuilds the spine', async () => {
  const brief = `${BRIEF}\n\nGoal: The viewer should feel awe.`;
  const noAnswer = { ...VIEWER, answers_request: 'no: it never says how much smaller' };
  const { calls, logs } = await runWriter(
    { ...passed(), viewer: noAnswer, 'spine-revise': SPINE },
    brief,
  );
  const input = userMessage(calls, 'viewer');
  assert.ok(input.startsWith(`YOUR REQUEST\n${BRIEF}\n\nTHE REEL\n`), input.slice(0, 120));
  assert.doesNotMatch(input, /Goal:/, "the intake's Goal line is no part of the request");
  assert.equal(steps(calls, 'spine-revise#1'), 1);
  assert.match(userMessage(calls, 'spine-revise#1'), /it never says how much smaller/);
  assert.ok(logs.includes('spine-revise: the script was written again on the new spine'));
});

await test('a sheet that cannot answer the request says what is missing', async () => {
  const { story, logs } = await runWriter({
    ...passed(),
    facts: { ...SHEET, missing: 'the width of a grain in atoms' },
  });
  assert.ok(
    logs.includes(
      'facts: the sheet cannot fully answer the request: the width of a grain in atoms',
    ),
  );
  assert.equal(story.missing, 'the width of a grain in atoms');
});

await test('spoken numbers are rounded, one quantity keeps one value, and a year is said in full', () => {
  const shot = (text: string) => ({ lines: [{ who: 'narrator', text }] });
  const facts = [
    { text: 'Proxima Centauri is 4.2465 ly away' },
    { text: 'Voyager 1 would take 73,775 years' },
    { text: 'It was found in 1915' },
  ];
  const errors = spokenErrors(
    [
      shot('Proxima Centauri is four point two four six five light-years away.'),
      shot('It was found in nineteen fifteen.'),
      shot('Voyager would need seventy-three thousand years.'),
      shot('Seventy-four thousand years, one way.'),
    ],
    facts,
  ).map(String);
  assert.equal(errors.length, 2, errors.join('\n'));
  assert.match(
    errors[0] ?? '',
    /^shot 1: .* says "four point two four six five" to 5 digits: say it rounded the way people say it \("about four point two"\)/,
  );
  assert.match(
    errors[1] ?? '',
    /^shots 3, 4 say "seventy three thousand", "seventy four thousand" for one number/,
  );
});

await test('the answer is said once: another shot saying it is sent back softly', async () => {
  const early = LINES.map((l, i): [string, string] =>
    i === 2
      ? ['So one millimetre holds a billion picometres, ten million atoms across.', 'billion']
      : l,
  );
  const { logs } = await runWriter({ ...passed(), 'script#1': script(early) });
  assert.match(
    logs.find((l) => l.startsWith('script rejected')) ?? '',
    /shot 3 already says the answer's number: say it in the payoff shot \(4\) only; the close may echo it once/,
  );
});

await test('the request states numbers, "nineteen zero five" is a year, and a question is no definition', async () => {
  const answerErrors = (answer: string, brief: string) =>
    factErrors(sheet([], { answer }), { ...env, brief })
      .map(String)
      .filter((e) => e.startsWith('the answer'));
  assert.deepEqual(
    answerErrors('In nineteen zero five the union ended.', 'How did Norway leave Sweden in 1905?'),
    [],
  );
  assert.equal(
    answerErrors('In nineteen zero five the union ended.', BRIEF).length,
    1,
    'not on the sheet nor in the request',
  );

  const question = LINES.map((l, i): [string, string] =>
    i === 0 ? ['How small is an atom next to a grain of sand?', 'sand'] : l,
  );
  const { logs } = await runWriter({ ...passed(), 'script#1': script(question) }, BRIEF, {
    hook: 'number or question',
  });
  assert.ok(!logs.some((l) => l.startsWith('script rejected')), logs.join('\n'));
  const plain = LINES.map((l, i): [string, string] =>
    i === 0 ? ['Picture one grain of sand on your fingertip.', 'sand'] : l,
  );
  const hook = await runWriter({ ...passed(), 'script#1': script(plain) }, BRIEF, {
    hook: 'number or question',
  });
  assert.ok(!hook.logs.some((l) => l.startsWith('script rejected')), 'the hook rule is gone');
});

await test('time runs forward by month and day within a year', async () => {
  const dated = (...when: string[]) => ({
    ...SPINE,
    shots: SPINE.shots.map((s, i) => ({ ...s, when: when[i] ?? '' })),
  });
  const ok = await runWriter({
    ...passed(),
    'spine#1': dated('', '7 June 1905', 'August 1905', '1906', ''),
  });
  assert.ok(!ok.logs.some((l) => l.startsWith('spine rejected')), ok.logs.join('\n'));
  const back = await runWriter({
    ...passed(),
    'spine#1': dated('', 'August 1905', '7 June 1905', '1906', ''),
  });
  assert.match(
    back.logs.find((l) => l.startsWith('spine rejected')) ?? '',
    /shot 3 \("when": "7 June 1905"\) goes back in time after shot 2 \("August 1905"\)/,
  );
});

// ---------- QC1b: grounded claims, no flagged line left, 2% spoken numbers ----------
await test('each claim the checker lists must cite sheet facts that state its numbers', async () => {
  const claims = (shot: number, claim: string, facts: string[]) => ({
    shot,
    verdict: 'ok',
    claims: [{ claim, facts, verdict: 'ok' }],
  });
  const { story, logs } = await runWriter({
    ...passed(),
    factcheck: checked({
      lines: [
        claims(1, 'an atom is smaller than a grain of sand', ['f1']),
        claims(2, 'an atom is one hundred picometres across', ['f2']),
        claims(3, 'a millimetre holds a billion picometres', ['f9']),
        claims(4, 'an atom is ten million times smaller', []),
        claims(5, 'the sand would be ten thousand kilometres wide', ['f2']),
      ],
      problems: [],
    }),
  });
  const found = (
    story.review as { factcheck?: { problems?: { shot?: number; problem?: string }[] } }
  ).factcheck?.problems;
  assert.deepEqual(
    (found ?? []).map((p) => [p.shot, p.problem?.replace("the engine's claim check: ", '')]),
    [
      [3, 'it cites f9, which the sheet does not have'],
      [4, 'it says a number but cites no fact on the sheet'],
      [5, 'it says "ten thousand", which f2 does not state (within 2%)'],
    ],
  );
  assert.ok(
    logs.some((l) => l.startsWith('factcheck: the claim check found 3')),
    logs.join('\n'),
  );
});

// a script whose shot 2 has a second line the second fact check flags
const twoLines = () => {
  const s = script(LINES);
  const shot2 = s.shots[1];
  if (shot2) shot2.lines.push({ who: 'narrator', text: 'That is almost none of it.' });
  return s;
};
const flagged = checked({
  problems: [
    {
      shot: 2,
      kind: 'wrong',
      claim: 'almost none of it',
      problem: 'it says almost none for a real share',
      fix: 'say the share',
    },
  ],
});

await test('a line still flagged after the fix gets a second fix pass, then is dropped if its shot keeps another line', async () => {
  const second = 'That is a tiny share of the grain.';
  const again = await runWriter({
    ...passed(),
    viewer: flatViewer,
    script: twoLines(),
    'script-revise': twoLines(),
    'factcheck-2': flagged,
    'script-fix': {
      shots: [
        {
          shot: 2,
          lines: [
            { who: 'narrator', text: LINES[1]?.[0] ?? '' },
            { who: 'narrator', text: 'That is five hundred of them.' },
          ],
        },
      ],
    },
    'script-fix-2': {
      shots: [
        {
          shot: 2,
          lines: [
            { who: 'narrator', text: LINES[1]?.[0] ?? '' },
            { who: 'narrator', text: second },
          ],
        },
      ],
    },
  });
  assert.equal(again.story.shots[1]?.lines[1]?.text, second, 'the second pass is taken');
  assert.ok(
    again.logs.includes('script-fix-2: rewrote shots 2 for the fact check'),
    again.logs.join('\n'),
  );

  const dropped = await runWriter({
    ...passed(),
    viewer: flatViewer,
    script: twoLines(),
    'script-revise': twoLines(),
    'factcheck-2': flagged,
  });
  assert.deepEqual(
    dropped.story.shots[1]?.lines.map((l) => l.text),
    [LINES[1]?.[0]],
    'the flagged line is dropped; the line with the cue word stays',
  );
  assert.ok(
    dropped.logs.some((l) =>
      l.startsWith('script-fix: dropped shot 2\'s line "That is almost none'),
    ),
    dropped.logs.join('\n'),
  );
  assert.deepEqual(dropped.story.review?.factcheck2?.problems ?? [], []);
  assert.equal(dropped.story.review?.fixed2?.[0]?.dropped, true);
});

await test('a spoken number must be within 2% of the sheet, and the rounding hint stays within it', async () => {
  // 9.7 million for the sheet's 10 million: 3% off (5% used to pass it)
  const off = LINES.map((l, i): [string, string] =>
    i === 3
      ? ['Which means an atom is nine point seven million times smaller than the sand.', 'million']
      : l,
  );
  const { logs } = await runWriter({ ...passed(), 'script#1': script(off) });
  assert.match(
    logs.find((l) => l.startsWith('script rejected')) ?? '',
    /shot 4: .* says "nine point seven million", which no fact on the sheet states within 2%/,
  );
  // two digits would make 224.7 "two hundred and twenty" (2.1% off): the hint keeps three
  const hint = spokenErrors(
    [
      {
        lines: [
          { who: 'narrator', text: 'Its year lasts two hundred and twenty-four point seven days.' },
        ],
      },
    ],
    [{ text: 'A year lasts 224.7 days' }],
  ).map(String);
  assert.match(hint[0] ?? '', /\("about two hundred and twenty-five"\)/);
});
