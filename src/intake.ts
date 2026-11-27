import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { M3Request, M3Result } from './minimax.ts';
import { Intake } from './record.ts';

export const MIN_SECONDS = 30;
export const MAX_SECONDS = 90;
export const DEFAULT_SECONDS = 45;

// a quote field M3 leaves null is an empty quote
const Quote = z.preprocess((v) => (v === null ? '' : v), z.string());
const ModelAnswer = Intake.extend({
  seconds: z.number().optional(),
  subject: z.string(),
  subject_kind: z.string(),
  covers: Quote,
  excludes: Quote,
});
type ModelAnswer = z.infer<typeof ModelAnswer>;

const PROMPT_FILE = new URL('./prompts/intake.txt', import.meta.url);

export interface TemplateAbout {
  name: string;
  about: string;
}

export interface IntakeInput {
  request: string;
  /** Template the caller insists on (a name in `templatesDir`). */
  template?: string | undefined;
  /** Length the caller insists on, in seconds. */
  seconds?: number | undefined;
  /** A template the review found cannot show the subject (design §6.1): left out of the choice. */
  exclude?: { template: string; why: string } | undefined;
  /** The template folder (`var/templates` in a job); only read. */
  templatesDir: string;
  m3: (req: M3Request) => Promise<M3Result>;
}

export interface IntakeResult {
  intake: Intake;
  /** What goes in brief.txt (the request verbatim plus Audience, Goal, Tone lines). */
  brief: string;
  usd: number;
}

/** Every `<name>.md` in the folder except `_base.md`, with the text of its `## about` section. */
export async function listTemplates(dir: string): Promise<TemplateAbout[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort();
  const out: TemplateAbout[] = [];
  for (const file of files) {
    const text = await readFile(path.join(dir, file), 'utf8');
    const m = /^## about[ \t]*\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text);
    const about = m?.[1]?.trim();
    if (about === undefined || about === '') throw new Error(`${file}: no "## about" section`);
    out.push({ name: file.slice(0, -3), about });
  }
  if (out.length === 0) throw new Error(`no templates in ${dir}`);
  return out;
}

export function briefText(request: string, intake: Intake): string {
  return `${request}\n\nAudience: ${intake.audience}\nGoal: ${intake.goal}\nTone: ${intake.tone}\n`;
}

const clampSeconds = (s: number) => Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(s)));

const plain = (t: string): string =>
  t.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
// a quote copied with its quotation marks or its sentence's full stop still counts
const quoted = (t: string): string => plain(t).replace(/^["'\s]+|["'\s.]+$/g, '');

/**
 * Design §6.2 scope check: a fit holds only with words of the template's about that cover the subject, copied from it
 * (M3 rated a planet "good" for a template about "places ... on Earth"), and never for a subject under its "Not for".
 * Returns why the claimed fit does not hold, or null.
 */
function scopeProblem(answer: ModelAnswer, about: string): string | null {
  if (answer.fit === 'none') return null;
  // "excludes": "none" is M3 saying nothing excludes the subject
  if (!['', 'none', 'n/a'].includes(quoted(answer.excludes))) {
    return `the subject falls under the "Not for" of ${answer.template} ("${answer.excludes}"), so that template has no fit`;
  }
  const covers = quoted(answer.covers);
  if (covers === '') {
    return `"covers" is empty: no words of the description of ${answer.template} cover the subject`;
  }
  if (!plain(about).includes(covers)) {
    return `"covers" ("${answer.covers}") is not in the description of ${answer.template}; copy its exact words that cover the subject`;
  }
  return null;
}

function parseModelJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('no JSON object in the answer');
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * One M3 call (one retry on bad JSON, an unknown template or a fit its quoted words do not hold), then the code-side
 * rules of design §6.2. A fit that still fails the scope check on the second answer becomes "none" (D17).
 */
export async function runIntake(input: IntakeInput): Promise<IntakeResult> {
  const excluded = input.exclude?.template;
  const templates = (await listTemplates(input.templatesDir)).filter((t) => t.name !== excluded);
  if (templates.length === 0) throw new Error(`no template left besides "${String(excluded)}"`);
  const names = templates.map((t) => t.name);
  if (input.template !== undefined && !names.includes(input.template)) {
    throw new Error(`unknown template "${input.template}"`);
  }

  const system = await readFile(PROMPT_FILE, 'utf8');
  const list = templates.map((t) => `### ${t.name}\n${t.about}`).join('\n\n');
  const lines = [`Templates:\n\n${list}`, `Request:\n${input.request}`];
  if (input.template !== undefined) {
    lines.push(
      `The caller chose the template "${input.template}": answer with that template and judge how well it fits this request.`,
    );
  }
  if (input.exclude !== undefined) {
    lines.push(
      `A reel was already made with the template "${input.exclude.template}", and its review found that template cannot show this request's subject: ${input.exclude.why}. It is left out of the list: choose from the others.`,
    );
  }
  if (input.seconds !== undefined) {
    lines.push(`The user asked for ${String(input.seconds)} seconds: use that length.`);
  }
  const user = lines.join('\n\n');
  const step = input.exclude === undefined ? 'intake' : 'reintake';

  let usd = 0;
  let problem = '';
  let lastText = '';
  const messages: M3Request['messages'] = [{ role: 'user', content: user }];
  for (let attempt = 0; attempt < 2; attempt++) {
    if (problem !== '') {
      messages.push(
        { role: 'assistant', content: lastText || '(empty)' },
        {
          role: 'user',
          content: `Your previous answer was rejected: ${problem}. Answer again with one JSON object only; "template" must be exactly one of: ${names.join(', ')}; "covers" holds words copied exactly from that template's description, or the fit is "none".`,
        },
      );
    }
    const res = await input.m3({ step, system, messages, maxTokens: 2000 });
    usd += res.usd;
    lastText = res.text;
    try {
      const parsed = ModelAnswer.parse(parseModelJson(res.text));
      const chosen = templates.find((t) => t.name === parsed.template);
      if (chosen === undefined) throw new Error(`unknown template "${parsed.template}"`);
      if (input.template !== undefined && parsed.template !== input.template) {
        throw new Error(`the template must be "${input.template}", not "${parsed.template}"`);
      }
      const scope = scopeProblem(parsed, chosen.about);
      if (scope !== null && attempt === 0) throw new Error(scope);
      const intake: Intake = {
        ...parsed,
        ...(scope === null
          ? {}
          : { fit: 'none' as const, reason: `${parsed.reason} (scope check: ${scope})` }),
        seconds: clampSeconds(input.seconds ?? parsed.seconds ?? DEFAULT_SECONDS),
      };
      return { intake, brief: briefText(input.request, intake), usd };
    } catch (e) {
      problem =
        e instanceof z.ZodError ? z.prettifyError(e) : e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`intake failed twice: ${problem}`);
}
