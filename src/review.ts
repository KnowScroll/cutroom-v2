import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { CutResult } from './engine.ts';
import type { ContentBlock, M3Request, M3Result, Message } from './minimax.ts';
import { gateValue, Review, type Gate, type HarnessCall } from './record.ts';

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

const PlanJson = z.object({
  brief: z.string(),
  seconds: z.number(),
  story: z
    .object({
      question: z.string(),
      answer: z.string(),
      payoff: z.string().optional(),
      facts: z
        .array(z.object({ id: z.string(), text: z.string(), source: z.string().optional() }))
        .optional(),
    })
    .optional(),
  assets: z.array(z.object({ id: z.string() })),
  shots: z.array(z.object({ point: z.string().optional(), idea: z.string() })),
});

const TimelineJson = z.object({
  total: z.number(),
  shots: z.array(
    z.object({
      start: z.number(),
      dur: z.number(),
      lines: z.array(
        z.object({ who: z.string(), text: z.string(), start: z.number(), end: z.number() }),
      ),
    }),
  ),
});

export interface ReviewInput {
  /** The cut; its folder holds reel.mp4, plan.json, timeline.json and the asset sheets. */
  cut: Pick<CutResult, 'cut' | 'dir' | 'reelPath' | 'workDir' | 'rejections' | 'failingSteps'>;
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

/** The engine's parseMd: `## name` starts a section; a repeated name starts it again. */
function sectionsOf(text: string): Map<string, string> {
  const lines = new Map<string, string[]>();
  let cur: string[] | null = null;
  for (const ln of text.split(/\r?\n/)) {
    const m = /^##\s+(\w+)\s*$/.exec(ln);
    if (m?.[1] !== undefined) {
      cur = [];
      lines.set(m[1].toLowerCase(), cur);
    } else if (cur !== null) cur.push(ln);
  }
  return new Map([...lines].map(([k, v]) => [k, v.join('\n').trim()]));
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

/** Three frames of one shot, each 270x480, side by side in one jpg (fastreel review()). */
async function strip(reel: string, start: number, dur: number, out: string): Promise<void> {
  const inputs = STRIP_AT.flatMap((f) => ['-ss', (start + dur * f).toFixed(2), '-i', reel]);
  const scaled = STRIP_AT.map((_, k) => `[${String(k)}:v]scale=270:480[f${String(k)}]`).join(';');
  await ffmpeg([
    ...['-y', '-v', 'error', ...inputs],
    ...['-filter_complex', `${scaled};[f0][f1][f2]hstack=inputs=3`, '-frames:v', '1', out],
  ]);
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
 * One M3 vision review of a cut (design §6.4): the packet fastreel's review() builds plus the fact sheet, the gate
 * lines and the engine's rejections. One retry on an unusable answer; one re-ask when it approves while a blocking
 * gate FAILs. Writes `review-<n>.json` (the answer as returned) and the strips into `outDir`.
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
    await strip(cut.reelPath, s.start, s.dur, file);
    const lines = s.lines
      .map((l) => `${l.who}: "${l.text}" (${l.start.toFixed(1)}-${l.end.toFixed(1)} s)`)
      .join(' | ');
    content.push(
      {
        type: 'text',
        text: `Shot ${String(i + 1)} (${s.dur.toFixed(1)} s, ${s.start.toFixed(1)}-${(s.start + s.dur).toFixed(1)} s of the reel).${p.point ? ` Point: ${p.point}` : ''} Storyboard: ${p.idea}\nLines (times from the shot's start): ${lines}\nThree separate vertical frames at 20%, 55% and 92%:`,
      },
      await jpeg(file),
    );
  }

  const facts = story?.facts ?? [];
  const payoff = story?.payoff === undefined ? '' : ` (the payoff: ${story.payoff})`;
  const rejections = [
    ...cut.failingSteps.map((f) => `shipped failing: ${f.step}: ${f.reason}`),
    ...cut.rejections,
  ];
  content.push({
    type: 'text',
    text: [
      facts.length > 0
        ? `Fact sheet the script was written from${payoff}:\n${facts.map((f) => `- ${f.id}${f.source ? ` [${f.source}]` : ''}: ${f.text}`).join('\n')}`
        : 'Fact sheet: none.',
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
    if (review.approve && blocking.length > 0 && !reasked) {
      reasked = true;
      messages.push(
        { role: 'assistant', content: res.text },
        {
          role: 'user',
          content: `approve is not allowed: these [block] gates FAIL:\n${blocking.map((l) => `- ${l}`).join('\n')}\nReturn the JSON object again, with notes that fix them where the reel can.`,
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
