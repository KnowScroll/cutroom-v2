// Honest repair (findings §D, §P "Why review and repair fail"): the engine's --apply-notes round runs a review's new lines through
// the writer's line checks, revalidates kept shot code whose lines changed, and says when a redraw failed in the line the harness's
// shipped_failing gate counts. The engine run is real (Chrome, ffmpeg, checkpoints); MiniMax is the fake server, the voice cache
// is filled by the test, and nothing else may reach the network (fixtures/minimax-redirect.ts).
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { lineNoteErrors } from '../engine/writer.mjs';
import { killTree, parseLog } from '../src/engine.ts';
import { startFakeMiniMax, type Step } from './fixtures/fake-minimax.ts';
import { KIT, ball } from './fixtures/stage.ts';

const repo = path.join(import.meta.dirname, '..');
const roots: string[] = [];
after(async () => {
  for (const r of roots) await rm(r, { recursive: true, force: true });
});

const facts = [
  { id: 'f1', text: 'The Moon is 384,400 km from Earth.' },
  { id: 'f2', text: 'A person walks about 5 km an hour.' },
];
const narrator = (text: string) => ({ who: 'narrator', text });
const shots = [
  { lines: [narrator('The Moon hangs over us every night of the year.')], cue: { word: 'Moon' } },
  {
    lines: [narrator('Walking there means crossing empty space for years.')],
    cue: { word: 'walking' },
  },
  {
    lines: [narrator('Each hour of walking covers about five kilometres.')],
    cue: { word: 'hour' },
  },
];
const hard = (errs: { soft?: true }[]) => errs.filter((e) => e.soft !== true).map(String);
const soft = (errs: { soft?: true }[]) => errs.filter((e) => e.soft === true).map(String);

await test("a review's new line passes the writer's line checks or says why not", () => {
  const ok = lineNoteErrors(shots, 1, [narrator('Walking there takes years of steps.')], facts, 26);
  assert.deepEqual(ok.map(String), []);

  const untraced = lineNoteErrors(
    shots,
    1,
    [narrator('Walking there takes seventeen years.')],
    facts,
    26,
  );
  assert.deepEqual(hard(untraced), [
    `"Walking there takes seventeen years." says "seventeen", which no fact on the sheet states: use the sheet's numbers (rounding is fine) or leave the number out`,
  ]);
  // the sheet's number, rounded, is fine
  assert.deepEqual(
    lineNoteErrors(
      shots,
      1,
      [narrator('Walking three hundred eighty thousand kilometres takes years.')],
      facts,
      26,
    ).map(String),
    [],
  );

  const digits = hard(
    lineNoteErrors(shots, 1, [narrator('Walking there takes 9 years.')], facts, 26),
  );
  assert.ok(
    digits.some((e) => e.includes('has digits') && e.includes('write "9" as "nine"')),
    digits.join(' | '),
  );

  const cue = hard(
    lineNoteErrors(shots, 1, [narrator('On foot it takes years of steps.')], facts, 26),
  );
  assert.deepEqual(cue, [
    `the lines never say the shot's cue word "walking", which its picture change lands on: keep that word`,
  ]);

  const hype = lineNoteErrors(
    shots,
    1,
    [narrator('Walking there is an incredible trip.')],
    facts,
    26,
  );
  assert.deepEqual(hard(hype), []);
  assert.deepEqual(soft(hype), ['"incredible" is a hype word; say the concrete thing instead']);

  const repeat = lineNoteErrors(
    shots,
    1,
    [narrator('Walking: the Moon hangs over us every night of the year.')],
    facts,
    26,
  );
  assert.deepEqual(hard(repeat), []);
  assert.ok(
    soft(repeat).some(
      (e) => e.startsWith('shot 2:') && e.includes('says again what an earlier shot said'),
    ),
  );

  const long = lineNoteErrors(
    shots,
    1,
    [
      narrator(
        'Walking there means crossing a vast, dark and empty space for many, many long years.',
      ),
    ],
    facts,
    26,
  );
  assert.deepEqual(soft(long), [
    'the script grows to 33 words, over its budget of about 26: the reel runs long',
  ]);
});

// ---------- a real --apply-notes round ----------

const plain = (o: unknown) => JSON.stringify(o, null, 2);
// engine/audio.mjs voiceCacheKey for kokoro: the clip of a line is var/cache/voice/<sha1 of this key>.mp3
const clipName = (text: string) =>
  `${createHash('sha1').update(`kokoro-82m|mp3|bm_george|${text}`).digest('hex')}.mp3`;
// a shot of the ball whose growth is timed to a cue word
const shotCode = (cue: string) => `function draw(ctx, lt, sh, h, kit) {
  kit.bg(ctx, lt);
  const k = h.clamp((lt - h.cue(${JSON.stringify(cue)})) / 0.4);
  h.asset('ball', 540, 960 + 20 * Math.sin(lt * 2), 0.9 + 0.3 * k);
}`;
const lines = {
  one: 'The Moon hangs over us every single night.',
  two: 'Paper maps say the walk is very long.',
  twoNew: 'On foot, the walk is very long indeed.',
  three: 'Every step covers less than a metre of ground.',
  threeNew: 'Each step covers less than a metre of ground.',
  four: 'Years would pass before the trip was over.',
};
const shot = (text: string, cue: string) => ({
  beat: 'step',
  point: 'the walk is long',
  device: 'act',
  hold: 0,
  idea: 'the ball on a starry sky',
  background: 'space',
  uses: ['ball'],
  sfx: [],
  lines: [narrator(text)],
  cue: { word: cue, show: 'the ball grows' },
});

async function setup(): Promise<{
  out: string;
  work: string;
  notes: string;
  brief: string;
  env: string;
  varDir: string;
  tplDir: string;
}> {
  const root = await mkdtemp(path.join(tmpdir(), 'cutroom-repair-'));
  roots.push(root);
  const varDir = path.join(root, 'var');
  const tplDir = path.join(root, 'templates');
  const out = path.join(varDir, 'runs', 'r', 'reel');
  const work = `${out}-work`;
  const voice = path.join(varDir, 'cache', 'voice');
  await mkdir(tplDir, { recursive: true });
  await mkdir(work, { recursive: true });
  await mkdir(voice, { recursive: true });
  await writeFile(path.join(tplDir, '_base.md'), '## look\nFlat shapes on a night sky.\n');
  await writeFile(
    path.join(tplDir, 'tiny.md'),
    '## about\nA test reel.\n\n## checks\n- reference: off\n- subject size: off\n',
  );
  const plan = {
    brief: 'How long would it take to walk to the Moon?',
    seconds: 12,
    template: 'tiny',
    title: 'Walk to the Moon',
    music: { feel: 'Driving', payoff_shot: 4 },
    story: { question: 'How long is the walk?', answer: 'Years', payoff: 'f1', facts },
    style: {
      name: 'flat',
      description: 'flat shapes',
      palette: { bg: '#141a3a', text: '#ffffff', accent: '#ffb000' },
      backgrounds: [{ name: 'space' }],
    },
    cast: { narrator: { voice: 'bm_george', asset: null } },
    assets: [
      { id: 'ball', kind: 'object', description: 'a red ball', w: ball.w, h: ball.h, params: [] },
    ],
    shots: [
      shot(lines.one, 'Moon'),
      shot(lines.two, 'walk'),
      shot(lines.three, 'step'),
      shot(lines.four, 'years'),
    ],
  };
  await writeFile(path.join(work, 'plan.json'), plain(plan));
  await writeFile(path.join(work, 'kit.js'), KIT);
  await writeFile(path.join(work, 'asset_ball.js'), ball.code);
  await writeFile(path.join(work, 'sheet-review.json'), plain({ rounds: 0 }));
  await writeFile(path.join(work, 'shot_1.js'), shotCode('Moon'));
  await writeFile(path.join(work, 'shot_2.js'), shotCode('paper')); // the code's own cue word, beside the script's "walk"
  await writeFile(path.join(work, 'shot_3.js'), shotCode('step'));
  await writeFile(path.join(work, 'shot_4.js'), shotCode('years'));
  // every line the run may voice, as a 2.2 s tone
  const tone = path.join(root, 'tone.mp3');
  const ff = spawnSync('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=220:duration=2.2',
    '-ac',
    '1',
    '-ar',
    '48000',
    tone,
  ]);
  assert.equal(ff.status, 0, String(ff.stderr));
  for (const t of Object.values(lines)) await copyFile(tone, path.join(voice, clipName(t)));
  const notes = path.join(root, 'notes-2.json');
  await writeFile(
    notes,
    plain({
      approve: false,
      lines: {
        '1': [narrator('The Moon sits seventeen kilometres above us.')], // a number no fact states
        '2': [narrator(lines.twoNew)], // keeps the script's cue "walk", drops the code's "paper"
        '3': [narrator(lines.threeNew)], // still says "step"
      },
      shots: { '4': 'Make the ball bigger.' },
      assets: {},
    }),
  );
  const brief = path.join(root, 'brief.txt');
  await writeFile(brief, plan.brief);
  const env = path.join(root, 'empty.env');
  await writeFile(env, '');
  return { out, work, notes, brief, env, varDir, tplDir };
}

// every redraw the fake hands back runs but fails a check (its two titles overlap), like the redraws of findings §D
const redraw = `function draw(ctx, lt, sh, h, kit) { kit.bg(ctx, lt); h.asset('ball', 540, 960, 1); kit.title(ctx, 'WALK', 540, 1500); kit.title(ctx, 'LONG', 540, 1510); }`;
const failing: Step = {
  kind: 'stream',
  chunks: ['```js\n', redraw, '\n```'],
  usage: { input_tokens: 10, output_tokens: 10 },
};

function runEngine(
  s: Awaited<ReturnType<typeof setup>>,
  fakeUrl: string,
): Promise<{ code: number | null; log: string }> {
  // no keys at all: the env file is empty and none comes from the environment
  const env: NodeJS.ProcessEnv = {
    ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.endsWith('_API_KEY'))),
    CUTROOM_VAR: s.varDir,
    CUTROOM_TEMPLATE_DIR: s.tplDir,
    CUTROOM_ENV_FILE: s.env,
    FAKE_MINIMAX_URL: fakeUrl,
  };
  // the harness's --apply-notes command (design §4.1), with kokoro's voice cache and the synth bed
  const args = [
    '--import',
    pathToFileURL(path.join(repo, 'test', 'fixtures', 'minimax-redirect.ts')).href,
    path.join(repo, 'engine', 'asset_reel.mjs'),
    ...['--brief-file', s.brief, '--template', 'tiny', '--seconds', '12', '--rounds', '0'],
    ...['--out', s.out, '--cut', '2', '--voice-model', 'kokoro', '--music-source', 'synth'],
    ...['--apply-notes', s.notes],
  ];
  const child = spawn(process.execPath, args, {
    cwd: repo,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
    windowsHide: true,
  });
  let log = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (d: string) => (log += d));
  child.stderr.on('data', (d: string) => (log += d));
  const timer = setTimeout(() => {
    if (child.pid !== undefined) void killTree(child.pid);
  }, 240_000);
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => {
      clearTimeout(timer);
      resolve({ code, log });
    });
  });
}

const WorkPlan = z.object({
  shots: z.array(z.object({ lines: z.array(z.object({ text: z.string() })) })),
});

await test(
  'an --apply-notes round rejects a line with an untraced number, catches kept code whose cue word left its line, and never keeps a failed redraw silently',
  { timeout: 300_000 },
  async () => {
    const s = await setup();
    const fake = await startFakeMiniMax([failing]);
    try {
      const { code, log } = await runEngine(s, fake.url);
      assert.equal(code, 0, log);
      const has = (re: RegExp): void => {
        assert.ok(
          log.split('\n').some((l) => re.test(l)),
          `no line matches ${String(re)}\n${log}`,
        );
      };

      // the line note with an untraced number is rejected, logged, and the old line kept
      has(
        /director lines for shot 1 rejected: "The Moon sits seventeen kilometres above us\." says "seventeen", which no fact on the sheet states.*; the old lines are kept$/,
      );
      const plan = WorkPlan.parse(
        JSON.parse(await readFile(path.join(s.work, 'plan.json'), 'utf8')),
      );
      assert.deepEqual(
        plan.shots.map((x) => x.lines.map((l) => l.text)),
        [[lines.one], [lines.twoNew], [lines.threeNew], [lines.four]],
      );

      // kept code whose cue word is no longer said fails revalidation and is redrawn; a kept shot that still passes is not
      has(
        /shot2 kept code rejected: .*h\.cue\("paper"\): this shot's lines never say "paper".*; redrawing it for the new lines$/,
      );
      has(/shot3: its lines changed and its code still passes every check; kept$/);
      assert.equal(
        fake.requests.length,
        6,
        'three attempts each for shot 2 and shot 4, none for shot 3',
      );

      // shot 2's old code fails against its new line: its failed redraw ships failing, in the line the shipped_failing gate
      // counts, and the last redraw that runs replaces the stale code. Shot 4's old code still passes: it stays, and the note
      // that could not be applied is a rejection the next review reads, not a step shipped failing (design §6.3)
      const { failingSteps, rejections } = parseLog(log);
      assert.deepEqual(
        failingSteps.map((f) => f.step),
        ['shot2-rev'],
      );
      const reason = failingSteps[0]?.reason ?? '';
      assert.ok(reason.startsWith('text "WALK" overlaps text "LONG"'), reason);
      assert.match(reason, /; the previous code fails too: .*this shot's lines never say "paper"/);
      has(
        /shot4-rev rejected: no redraw passed every check \(text "WALK" overlaps text "LONG" at lt=[\d.]+s: .*\), so the note is not applied; the previous code still passes and is kept$/,
      );
      assert.ok(rejections.some((r) => r.startsWith('shot4-rev rejected:')));
      assert.ok(rejections.some((r) => r.startsWith('director lines for shot 1 rejected:')));
      assert.ok(rejections.some((r) => r.startsWith('shot2 kept code rejected:')));
      const shotFile = (k: number) => readFile(path.join(s.work, `shot_${String(k)}.js`), 'utf8');
      assert.equal((await shotFile(2)).trim(), redraw);
      assert.equal(await shotFile(3), shotCode('step'));
      assert.equal(await shotFile(4), shotCode('years'));
    } finally {
      await fake.close();
    }
  },
);
