import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { CutResult } from './engine.ts';
import type { ContentBlock, M3Request, M3Result, Message } from './minimax.ts';
import { gateValue, Review, type Gate, type HarnessCall, type ShippedStep } from './record.ts';
import { sectionsOf } from './templates.ts';

const PROMPT_FILE = new URL('./prompts/review.txt', import.meta.url);

// The engine's guide(...SECTIONS) order (engine/asset_reel.mjs), the sections fastreel's director is given.
const SECTIONS = [
  'about',
  'look',
  'motion',
  'story',
  'plan',
  'sound',
  'assets',
  'shots',
  'director',
] as const;

// Where in each shot fastreel's review() takes its three frames.
const STRIP_AT = [0.2, 0.55, 0.92] as const;
// After the cue word, the time the shot's change has to land and read (the cue-timing rule of HANDOFF T4).
const AFTER_CUE_S = 0.8;

const PlanJson = z.object({
  brief: z.string(),
  seconds: z.number(),
  story: z
    .object({
      question: z.string(),
      answer: z.string(),
      payoff: z.string().optional(),
      facts: z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
            source: z.string().optional(),
            // opaque: the writer's arithmetic as it wrote it (#45 adds units inside the string)
            calc: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  assets: z.array(z.object({ id: z.string() })),
  shots: z.array(z.object({ point: z.string().optional(), idea: z.string() })),
});

const Line = z.object({
  who: z.string(),
  text: z.string(),
  start: z.number(),
  end: z.number(),
  words: z.array(z.object({ w: z.string(), start: z.number(), end: z.number() })).optional(),
});
type Line = z.infer<typeof Line>;

const TimelineJson = z.object({
  total: z.number(),
  shots: z.array(
    z.object({
      start: z.number(),
      dur: z.number(),
      cue: z.string().optional(),
      lines: z.array(Line),
    }),
  ),
});

// The writer's fact checks in the work folder's script.json (engine/writer.mjs writeStory: story.review).
const FactCheck = z
  .object({
    problems: z
      .array(
        z.object({
          shot: z.union([z.number(), z.string()]).optional(),
          claim: z.string().optional(),
          problem: z.string().optional(),
          fix: z.string().optional(),
        }),
      )
      .optional(),
  })
  .nullish();
const ScriptJson = z.object({
  review: z
    .object({ factcheck: FactCheck, factcheck2: FactCheck, revised: z.boolean().optional() })
    .nullish(),
});

export interface ReviewInput {
  /** The cut; its folder holds reel.mp4, plan.json, timeline.json and the asset sheets. */
  cut: Pick<CutResult, 'cut' | 'dir' | 'reelPath' | 'workDir' | 'rejections'>;
  /** The steps the shipped_failing gate counted, carried-over ones included. */
  failing: readonly ShippedStep[];
  gates: readonly Gate[];
  /** The working template folder (`var/templates`); only read. */
  templatesDir: string;
  template: string;
  /** The run folder: `review-<n>.json` and the strips (`review-<n>/shot<i>.jpg`) are written here. */
  outDir: string;
  m3: (req: M3Request) => Promise<M3Result>;
}

export interface ReviewResult {
  review: Review;
  /** The path of `review-<n>.json`. */
  file: string;
  /** An approve while a blocking gate FAILs was asked once more (design §6.1). */
  reasked: boolean;
  calls: HarnessCall[];
  usd: number;
}

async function readJson<S extends z.ZodType>(file: string, schema: S): Promise<z.infer<S>> {
  const parsed = schema.safeParse(JSON.parse(await readFile(file, 'utf8')));
  if (!parsed.success) throw new Error(`${file}: ${z.prettifyError(parsed.error)}`);
  return parsed.data;
}

/** The engine's guide(...SECTIONS): per section the `_base.md` text, then the template's. */
async function templateGuide(dir: string, name: string): Promise<string> {
  const base = sectionsOf(await readFile(path.join(dir, '_base.md'), 'utf8'));
  const own = sectionsOf(await readFile(path.join(dir, `${name}.md`), 'utf8'));
  const parts = SECTIONS.map((k) => {
    const t = [base.get(k), own.get(k)].filter((x) => x !== undefined && x !== '').join('\n\n');
    return t === '' ? '' : `## ${k.toUpperCase()}\n${t}`;
  }).filter((p) => p !== '');
  return `REEL TEMPLATE "${name}". Follow these directions exactly; they override any general habit.\n\n${parts.join('\n\n')}`;
}

/** The engine's refBlock(): the Wikipedia reference the reel was written from, if it has one. */
async function referenceBlock(workDir: string): Promise<string> {
  let ref: string;
  try {
    ref = (await readFile(path.join(workDir, 'reference.txt'), 'utf8')).trim();
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') return '';
    throw e;
  }
  return ref === ''
    ? ''
    : `\n\nREFERENCE (Wikipedia). It wins over your memory: every name, position, size, proportion, shape, date and step in your lines and asset descriptions must agree with it, and a procedure uses its real steps in its order.\n${ref}`;
}

function ffmpeg(args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let stderr = '';
    p.stderr.setEncoding('utf8');
    p.stderr.on('data', (d: string) => (stderr += d));
    p.once('error', reject);
    p.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with ${String(code)}: ${stderr.trim()}`));
    });
  });
}

/** Frames of one shot (reel seconds), each 270x480, side by side in one jpg (fastreel review(), more frames). */
async function strip(reel: string, at: readonly number[], out: string): Promise<void> {
  const inputs = at.flatMap((t) => ['-ss', t.toFixed(2), '-i', reel]);
  const scaled = at.map((_, k) => `[${String(k)}:v]scale=270:480[f${String(k)}]`).join(';');
  const pads = at.map((_, k) => `[f${String(k)}]`).join('');
  await ffmpeg([
    ...['-y', '-v', 'error', ...inputs],
    ...['-filter_complex', `${scaled};${pads}hstack=inputs=${String(at.length)}`],
    ...['-frames:v', '1', out],
  ]);
}

/** One frame at the reel's own resolution, so small text can be read. */
async function fullFrame(reel: string, at: number, out: string): Promise<void> {
  await ffmpeg(['-y', '-v', 'error', '-ss', at.toFixed(2), '-i', reel, '-frames:v', '1', out]);
}

// The stage's h.cue (engine/stage_asset.html cueNorm, lineToks, cueTime): the moment a shot's lines first say the cue
// word, from the voice's word times when they match the line's words, else from each word's share of the letters.
const cueNorm = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}'\s-]/gu, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter((w) => w !== '');

function lineToks(ln: Line): { t: string; s: number }[] {
  const toks = ln.text.split(/\s+/).filter((t) => t !== '');
  const words = ln.words;
  if (words !== undefined && words.length === toks.length) {
    return toks.map((t, i) => ({ t, s: words[i]?.start ?? ln.start }));
  }
  const tot = toks.reduce((a, t) => a + t.length + 1, 0) || 1;
  const dur = Math.max(0.3, ln.end - ln.start);
  let acc = 0;
  return toks.map((t) => {
    const s = ln.start + (dur * acc) / tot;
    acc += t.length + 1;
    return { t, s };
  });
}

/** Seconds into the shot when its lines first say `word`, or null when they never do. */
function cueTime(lines: readonly Line[], word: string): number | null {
  const want = cueNorm(word);
  const all = lines.flatMap((ln) =>
    lineToks(ln).flatMap((x) => cueNorm(x.t).map((p) => ({ p, s: x.s }))),
  );
  const same = (a: string, b: string): boolean =>
    a === b ||
    (b.length >= 4 && (a.startsWith(b) || b.startsWith(a)) && Math.abs(a.length - b.length) <= 3);
  if (want.length === 0) return null;
  for (let i = 0; i + want.length <= all.length; i++) {
    if (want.every((w, k) => same(all[i + k]?.p ?? '', w))) return all[i]?.s ?? null;
  }
  return null;
}

interface Frame {
  /** Seconds into the shot. */
  t: number;
  label: string;
}

/** fastreel's three frames plus the cue word and AFTER_CUE_S later (clamped to the shot), in time order. */
function framesOf(shot: z.infer<typeof TimelineJson>['shots'][number]): {
  frames: Frame[];
  cue: string;
} {
  const last = Math.max(0, shot.dur - 1 / 30);
  const frames: Frame[] = STRIP_AT.map((f) => ({
    t: shot.dur * f,
    label: `${String(Math.round(f * 100))}%`,
  }));
  if (shot.cue === undefined) return { frames, cue: 'no cue word' };
  const at = cueTime(shot.lines, shot.cue);
  if (at === null) return { frames, cue: `its cue word "${shot.cue}" is never said in its lines` };
  frames.push(
    { t: Math.min(at, last), label: `cue "${shot.cue}"` },
    { t: Math.min(at + AFTER_CUE_S, last), label: `cue + ${String(AFTER_CUE_S)} s` },
  );
  return {
    frames: frames.sort((a, b) => a.t - b.t),
    cue: `cue word "${shot.cue}" at ${at.toFixed(2)} s`,
  };
}

/** The last fact check the writer ran on this script: its claims may be fixed, still in the lines, or wrong. */
async function factCheckProblems(workDir: string): Promise<string[]> {
  let text: string;
  try {
    text = await readFile(path.join(workDir, 'script.json'), 'utf8');
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') return [];
    throw e;
  }
  const parsed = ScriptJson.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error(`${workDir}/script.json: ${z.prettifyError(parsed.error)}`);
  const review = parsed.data.review;
  const last = review?.revised === true ? review.factcheck2 : review?.factcheck;
  return (last?.problems ?? []).map(
    (p) =>
      `shot ${String(p.shot ?? '?')}: "${p.claim ?? ''}": ${p.problem ?? ''}${p.fix === undefined ? '' : ` (its fix: "${p.fix}")`}`,
  );
}

async function jpeg(file: string): Promise<ContentBlock> {
  const data = (await readFile(file)).toString('base64');
  return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } };
}

/** `assets.jpg`, `assets_2.jpg`, ... as the engine's renderSheets names them, in page order. */
async function assetSheets(dir: string): Promise<string[]> {
  const page = (f: string) => Number(/^assets(?:_(\d+))?\.jpg$/.exec(f)?.[1] ?? 1);
  return (await readdir(dir))
    .filter((f) => /^assets(?:_\d+)?\.jpg$/.test(f))
    .sort((a, b) => page(a) - page(b))
    .map((f) => path.join(dir, f));
}

function gateLine(g: Gate): string {
  return `${g.pass ? 'PASS' : 'FAIL'} ${g.name} [${g.mode}]: ${gateValue(g.value)} (threshold ${String(g.threshold)})`;
}

function parseJson(text: string): unknown {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no JSON object in the answer');
  const json = text.slice(a, b + 1);
  try {
    return JSON.parse(json);
  } catch (e) {
    // fastreel (engine/lib.mjs extractJson): a bare "position N" made M3 return the same broken JSON again; show it the spot.
    const at = Number(/position (\d+)/.exec(String(e))?.[1] ?? -1);
    if (at < 0) throw e;
    throw new Error(
      `${String(e)}. The JSON breaks here: «${json.slice(Math.max(0, at - 90), at)}⟨HERE⟩${json.slice(at, at + 40)}». A double quote inside a string must be written \\"`,
      { cause: e },
    );
  }
}

/** The answer as a Review, with every note on a shot and asset of this cut. */
function readAnswer(text: string, shots: number, assetIds: readonly string[]): Review {
  const review = Review.parse(parseJson(text));
  const { lines = {}, shots: shotNotes = {}, assets = {} } = review.notes;
  for (const k of [...Object.keys(lines), ...Object.keys(shotNotes)]) {
    if (!/^\d+$/.test(k) || Number(k) < 1 || Number(k) > shots) {
      throw new Error(`notes name shot "${k}", but the shots are 1 to ${String(shots)}`);
    }
  }
  for (const id of Object.keys(assets)) {
    if (!assetIds.includes(id)) {
      throw new Error(`notes name asset "${id}", but the assets are: ${assetIds.join(', ')}`);
    }
  }
  return review;
}

function problemOf(e: unknown): string {
  if (e instanceof z.ZodError) return z.prettifyError(e);
  return e instanceof Error ? e.message : String(e);
}

/**
 * One M3 vision review of a cut (design §6.4): the packet fastreel's review() builds, plus frames at each cue, a
 * full-size frame per shot, the fact sheet with its calcs, the writer's last fact-check flags, the gate lines and the
 * engine's rejections. One retry on an unusable answer; one re-ask when it approves while a blocking gate FAILs or
 * while it lists fact errors. Writes `review-<n>.json` (the answer as returned) and the frames into `outDir`.
 */
export async function reviewCut(input: ReviewInput): Promise<ReviewResult> {
  const { cut } = input;
  const n = String(cut.cut);
  const plan = await readJson(path.join(cut.dir, 'plan.json'), PlanJson);
  const tl = await readJson(path.join(cut.dir, 'timeline.json'), TimelineJson);
  if (plan.shots.length !== tl.shots.length) {
    throw new Error(
      `${cut.dir}: plan.json has ${String(plan.shots.length)} shots, timeline.json ${String(tl.shots.length)}`,
    );
  }
  const assetIds = plan.assets.map((a) => a.id);
  const sheets = await assetSheets(cut.dir);
  if (assetIds.length > 0 && sheets.length === 0) throw new Error(`${cut.dir}: no assets.jpg`);

  const story = plan.story;
  const length = `Target length: ${String(plan.seconds)} s. This cut: ${tl.total.toFixed(1)} s, ${String(tl.shots.length)} shots. Cut ${n}.`;
  const question = story
    ? ` The question the reel answers: "${story.question}"; its answer: "${story.answer}".`
    : '';
  const sheetIntro =
    assetIds.length > 0
      ? ' First, the sheet of every asset (each tile is one asset):'
      : ' There are no assets in this reel: every shot draws everything itself, so put every visual fix in "shots" and leave "assets" empty.';
  const content: ContentBlock[] = [
    { type: 'text', text: `Brief: ${plan.brief}\n${length}${question}${sheetIntro}` },
  ];
  for (const f of sheets) content.push(await jpeg(f));
  if (assetIds.length > 0) {
    content.push({
      type: 'text',
      text: `Each tile is labelled "asset: pose"; characters share one scale. Asset ids: ${assetIds.join(', ')}`,
    });
  }

  const stripDir = path.join(input.outDir, `review-${n}`);
  await mkdir(stripDir, { recursive: true });
  for (const [i, s] of tl.shots.entries()) {
    const p = plan.shots[i];
    if (p === undefined) throw new Error(`plan.json: no shot ${String(i + 1)}`);
    const file = path.join(stripDir, `shot${String(i + 1)}.jpg`);
    const { frames, cue } = framesOf(s);
    await strip(
      cut.reelPath,
      frames.map((f) => s.start + f.t),
      file,
    );
    // the frame where the cue's change has landed (the middle one without a cue), at full size for small text
    const read = frames.find((f) => f.label.startsWith('cue +')) ?? {
      t: s.dur * 0.55,
      label: '55%',
    };
    const full = path.join(stripDir, `shot${String(i + 1)}-full.jpg`);
    await fullFrame(cut.reelPath, s.start + read.t, full);
    const lines = s.lines
      .map((l) => `${l.who}: "${l.text}" (${l.start.toFixed(1)}-${l.end.toFixed(1)} s)`)
      .join(' | ');
    const at = frames.map((f) => `${f.t.toFixed(2)} s (${f.label})`).join(', ');
    content.push(
      {
        type: 'text',
        text: `Shot ${String(i + 1)} (${s.dur.toFixed(1)} s, ${s.start.toFixed(1)}-${(s.start + s.dur).toFixed(1)} s of the reel).${p.point ? ` Point: ${p.point}` : ''} Storyboard: ${p.idea}\nLines (times from the shot's start): ${lines}\nThis shot has ${cue}. ${String(frames.length)} separate vertical frames, left to right, at ${at}:`,
      },
      await jpeg(file),
      {
        type: 'text',
        text: `Shot ${String(i + 1)} at ${read.t.toFixed(2)} s (${read.label}), full size, to read every label and number:`,
      },
      await jpeg(full),
    );
  }

  const facts = story?.facts ?? [];
  const payoff = story?.payoff === undefined ? '' : ` (the payoff: ${story.payoff})`;
  const rejections = [
    ...input.failing.map(
      (f) =>
        `shipped failing: ${f.step}: ${f.reason}${f.cut === cut.cut ? '' : ` (this code is unchanged since cut ${String(f.cut)}, where it failed)`}`,
    ),
    ...cut.rejections,
  ];
  const flagged = await factCheckProblems(cut.workDir);
  content.push({
    type: 'text',
    text: [
      facts.length > 0
        ? `Fact sheet the script was written from${payoff}. A "calc" is the arithmetic the writer did for a derived fact; it can be wrong (a wrong number, factor or unit):\n${facts.map((f) => `- ${f.id}${f.source ? ` [${f.source}]` : ''}: ${f.text}${f.calc === undefined ? '' : ` [calc: ${f.calc}]`}`).join('\n')}`
        : 'Fact sheet: none.',
      flagged.length > 0
        ? `The writer's last fact check flagged these claims; the lines were then rewritten or kept, so each may be fixed, still said or shown, or a wrong flag (the brief wins):\n${flagged.map((f) => `- ${f}`).join('\n')}`
        : "The writer's last fact check flagged nothing.",
      input.gates.length > 0
        ? `Measured gates:\n${input.gates.map((g) => `- ${gateLine(g)}`).join('\n')}`
        : 'Measured gates: none.',
      rejections.length > 0
        ? `Engine rejections while this cut was built:\n${rejections.map((r) => `- ${r}`).join('\n')}`
        : 'Engine rejections: none.',
      'Return only the JSON object.',
    ].join('\n\n'),
  });

  const system = `${(await readFile(PROMPT_FILE, 'utf8')).trim()}\n\nJudge the cut against the template it was made with:\n\n${await templateGuide(input.templatesDir, input.template)}${await referenceBlock(cut.workDir)}`;
  const blocking = input.gates.filter((g) => g.mode === 'block' && !g.pass).map(gateLine);
  const messages: Message[] = [{ role: 'user', content }];
  const calls: HarnessCall[] = [];
  let retried = false;
  let reasked = false;
  for (;;) {
    const res = await input.m3({ step: `review-${n}`, system, messages });
    calls.push({
      step: `review-${n}`,
      tokens_in: res.usage.input + res.usage.cached,
      tokens_out: res.usage.output,
      usd: res.usd,
    });
    let review: Review;
    try {
      review = readAnswer(res.text, tl.shots.length, assetIds);
    } catch (e) {
      if (retried)
        throw new Error(`review of cut ${n}: no usable answer twice: ${problemOf(e)}`, {
          cause: e,
        });
      retried = true;
      messages.push(
        { role: 'assistant', content: res.text || '(empty)' },
        { role: 'user', content: `Not usable: ${problemOf(e)}. Return only the JSON object.` },
      );
      continue;
    }
    const wrong = review.fact_errors ?? [];
    if (review.approve && (blocking.length > 0 || wrong.length > 0) && !reasked) {
      reasked = true;
      const why = [
        ...(blocking.length > 0
          ? [`these [block] gates FAIL:\n${blocking.map((l) => `- ${l}`).join('\n')}`]
          : []),
        ...(wrong.length > 0
          ? [`you listed fact errors:\n${wrong.map((l) => `- ${l}`).join('\n')}`]
          : []),
      ];
      messages.push(
        { role: 'assistant', content: res.text },
        {
          role: 'user',
          content: `approve is not allowed: ${why.join('\nand ')}\nReturn the JSON object again, with notes that fix them where the reel can.`,
        },
      );
      continue;
    }
    const file = path.join(input.outDir, `review-${n}.json`);
    await writeFile(`${file}.tmp`, `${JSON.stringify(review, null, 2)}\n`);
    await rename(`${file}.tmp`, file);
    return { review, file, reasked, calls, usd: calls.reduce((a, c) => a + c.usd, 0) };
  }
}
