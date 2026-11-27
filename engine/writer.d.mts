// Types for what test/ imports from engine/writer.mjs (engine/ is plain JavaScript and tsconfig has no allowJs).

export interface Fact {
  id: string;
  text: string;
  source: 'reference' | 'brief' | 'general' | 'derived';
  calc?: string;
  quote?: string;
}
export interface FactSheet {
  facts: Fact[];
  question: string;
  answer: string;
  payoff: string;
  yardstick?: string;
  need?: unknown[];
}
// a problem message; a soft one carries `soft`, and `drop` names the fact (or "yardstick") dropped after the last try
export interface Problem {
  toString(): string;
  readonly soft?: true;
  readonly drop?: string;
}
export function factErrors(
  f: FactSheet,
  E: {
    brief: string;
    hasRef: () => boolean;
    numbersNotIn: (texts: string[]) => string[];
    refBlock?: () => string;
  },
): Problem[];
export function numbersNotInSource(src: string, texts: string[]): string[];
// the brief without the intake's Audience / Goal / Tone lines
export function requestOf(brief: string): string;

export interface Message {
  role: string;
  content: string;
}
export interface WriterEnv {
  brief: string;
  seconds: number;
  budget: number;
  m3: (
    step: string,
    system: string,
    messages: Message[],
    maxTokens: number,
    efforts?: string[],
  ) => Promise<string>;
  prompt: (name: string) => string;
  guide: (...sections: string[]) => string;
  checks: () => Record<string, string>;
  range: (s: string | undefined) => [number, number] | null;
  list: (s: string | undefined) => string[];
  ckSave: (name: string, data: unknown) => void;
  ckLoad: (name: string) => string | null;
  log: (msg: string) => void;
  extractJson: (text: string) => unknown;
  refBlock: () => string;
  hasRef: () => boolean;
  addArticles: (needs: unknown[]) => Promise<number>;
  numbersNotIn: (texts: string[]) => string[];
  voiceGuide: string;
  feels: string;
  wpsOf: (p: unknown) => number;
  padOf: (shots: unknown[]) => number;
}
export interface Line {
  who: string;
  text: string;
  tone?: string;
}
export interface FactCheckProblem {
  shot?: number | string;
  kind?: string;
  claim?: string;
  problem?: string;
  fix?: string;
}
export interface Story {
  shots: { lines: Line[] }[];
  review?: { factcheck2?: { problems?: FactCheckProblem[] } | null };
}
export function createWriter(E: WriterEnv): { writeStory: () => Promise<Story> };
