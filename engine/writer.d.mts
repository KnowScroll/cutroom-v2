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
  idea?: string;
  takeaway?: string;
  wps?: number;
  shots: { point?: string; lines: Line[] }[];
  review?: {
    factcheck2?: { problems?: FactCheckProblem[] } | null;
    revised?: boolean;
    spine_rebuilt?: boolean;
  };
}
export function createWriter(E: WriterEnv): { writeStory: () => Promise<Story> };

// a shot's picture around its speech: seconds before its first line, after its last, between two lines, and the last shot's tail
export interface Pad {
  lead: number;
  tail: number;
  breath: number;
  end: number;
}
export const PAD: Pad;
export function padding(checks?: Record<string, string>): Pad;
export interface TimedShot {
  lines?: { gap_before?: number | null }[];
  hold?: number;
}
export function shotTimes(
  s: TimedShot,
  secs: number[],
  pad: Pad,
  last: boolean,
): { lines: { start: number; end: number }[]; dur: number };
export function silenceOf(shots: TimedShot[], pad: Pad): number;
export function rateMoved(story: { wps?: number } | null | undefined, wps: number): boolean;
export function repeatErrors(shots: { lines?: Line[] }[]): Problem[];
