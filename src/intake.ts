import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { M3Request, M3Result } from './minimax.ts';
import { Intake } from './record.ts';

export const MIN_SECONDS = 30;
export const MAX_SECONDS = 90;
export const DEFAULT_SECONDS = 45;

const ModelAnswer = Intake.extend({ seconds: z.number().optional() });

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

function parseModelJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('no JSON object in the answer');
  return JSON.parse(text.slice(start, end + 1));
}

function templateNamedIn(request: string, names: string[]): string | undefined {
  const lower = request.toLowerCase();
  const hits = names.filter((n) => new RegExp(`(^|[^a-z0-9-])${n}($|[^a-z0-9-])`).test(lower));
  return hits.length === 1 ? hits[0] : undefined;
}

/** One M3 call (one retry on bad JSON or an unknown template), then the code-side rules of design §6.2. */
export async function runIntake(input: IntakeInput): Promise<IntakeResult> {
  const templates = await listTemplates(input.templatesDir);
  const names = templates.map((t) => t.name);
  if (input.template !== undefined && !names.includes(input.template)) {
    throw new Error(`unknown template "${input.template}"`);
  }
  const named = input.template ?? templateNamedIn(input.request, names);

  const system = await readFile(PROMPT_FILE, 'utf8');
  const list = templates.map((t) => `### ${t.name}\n${t.about}`).join('\n\n');
  const lines = [`Templates:\n\n${list}`, `Request:\n${input.request}`];
  if (named !== undefined) lines.push(`The request names the template "${named}": use it.`);
  if (input.seconds !== undefined) {
    lines.push(`The user asked for ${String(input.seconds)} seconds: use that length.`);
  }
  const user = lines.join('\n\n');

  let usd = 0;
  let problem = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const messages: M3Request['messages'] = [{ role: 'user', content: user }];
    if (problem !== '') {
      messages.push({
        role: 'user',
        content: `Your previous answer was rejected: ${problem}. Answer again with one JSON object only; "template" must be exactly one of: ${names.join(', ')}.`,
      });
    }
    const res = await input.m3({ step: 'intake', system, messages, maxTokens: 2000 });
    usd += res.usd;
    try {
      const parsed = ModelAnswer.parse(parseModelJson(res.text));
      if (!names.includes(parsed.template))
        throw new Error(`unknown template "${parsed.template}"`);
      const intake: Intake = {
        ...parsed,
        template: named ?? parsed.template,
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
