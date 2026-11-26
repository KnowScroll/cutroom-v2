import { z } from 'zod';

// Engine price, USD per million tokens (fastreel asset_reel.mjs line 20).
export const PRICE = { in: 0.3, cached: 0.06, out: 1.2 } as const;

const ENDPOINT = 'https://api.minimax.io/anthropic/v1/messages';
const MODEL = 'MiniMax-M3';

export type ContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: { type: 'base64'; media_type: string; data: string } | { type: 'url'; url: string };
    };

export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface M3Request {
  step: string;
  system: string;
  messages: Message[];
  maxTokens?: number;
  /** `off` (default) disables thinking; anything else is the adaptive thinking effort. */
  effort?: string;
}

export interface M3Result {
  text: string;
  usage: { input: number; cached: number; output: number; thinking: number };
  usd: number;
}

export interface MiniMaxOptions {
  apiKey: string;
  endpoint?: string;
  /** Waits in ms before each network-error retry (engine: 5, 15, 30, 60, 120 s). */
  retryWaitsMs?: readonly number[];
  /** Wait in ms between quota rechecks after error 2056 (engine: 10 min). */
  quotaRecheckMs?: number;
  /** Most quota rechecks per call (engine: 144, i.e. 24 h). */
  maxQuotaRechecks?: number;
  log?: (line: string) => void;
}

const usageSchema = z.object({
  input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
  output_tokens: z.number().optional(),
  output_tokens_details: z.object({ thinking_tokens: z.number().optional() }).optional(),
});
type Usage = z.infer<typeof usageSchema>;

const eventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('message_start'),
    message: z.object({ usage: usageSchema.optional() }),
  }),
  z.object({
    type: z.literal('content_block_delta'),
    delta: z.object({ type: z.string(), text: z.string().optional() }),
  }),
  z.object({
    type: z.literal('message_delta'),
    delta: z.object({ stop_reason: z.string().nullish() }).optional(),
    usage: usageSchema.optional(),
  }),
  z.object({ type: z.literal('error') }),
]);

class MiniMaxError extends Error {
  readonly retryable: boolean;
  readonly quota: boolean;
  constructor(message: string, retryable: boolean, quota: boolean) {
    super(message);
    this.retryable = retryable;
    this.quota = quota;
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function errorText(e: unknown): string {
  if (e instanceof Error) {
    const cause = e.cause instanceof Error ? ` (${e.cause.message})` : '';
    return `${e.message}${cause}`;
  }
  return String(e);
}

/** Build the client. Same request body and retry semantics as the engine's m3Request, m3 and netRetry. */
export function createM3(options: MiniMaxOptions): (req: M3Request) => Promise<M3Result> {
  const { apiKey } = options;
  const endpoint = options.endpoint ?? ENDPOINT;
  const waits = options.retryWaitsMs ?? [5000, 15000, 30000, 60000, 120000];
  const quotaRecheckMs = options.quotaRecheckMs ?? 600_000;
  const maxQuotaRechecks = options.maxQuotaRechecks ?? 144;
  const log = options.log ?? (() => undefined);
  const redact = (s: string) => s.split(apiKey).join('[redacted]');

  async function once(body: unknown): Promise<{ text: string; usage: Usage }> {
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new MiniMaxError(redact(`network error: ${errorText(e)}`), true, false);
    }

    let text = '';
    let streamError = '';
    let raw = '';
    const usage: Usage = {};
    const consume = (line: string) => {
      if (!line.startsWith('data:')) return;
      let json: unknown;
      try {
        json = JSON.parse(line.slice(5));
      } catch {
        return;
      }
      const ev = eventSchema.safeParse(json);
      if (!ev.success) return;
      const d = ev.data;
      if (d.type === 'message_start') Object.assign(usage, d.message.usage);
      else if (d.type === 'content_block_delta') {
        if (d.delta.type === 'text_delta') text += d.delta.text ?? '';
      } else if (d.type === 'message_delta') Object.assign(usage, d.usage);
      else streamError = JSON.stringify(json);
    };
    try {
      const decoder = new TextDecoder();
      let buf = '';
      for await (const chunk of res.body ?? []) {
        const s = decoder.decode(chunk, { stream: true });
        if (res.status !== 200) {
          raw += s;
          continue;
        }
        buf += s;
        for (let i = buf.indexOf('\n'); i >= 0; i = buf.indexOf('\n')) {
          consume(buf.slice(0, i).trim());
          buf = buf.slice(i + 1);
        }
      }
      consume(buf.trim());
    } catch (e) {
      throw new MiniMaxError(redact(`network error: ${errorText(e)}`), true, false);
    }

    const err = res.status === 200 ? streamError : raw;
    if (res.status === 200 && err === '') return { text, usage };
    const quota = /\b2056\b/.test(err);
    const retryable = res.status >= 500 || res.status === 429 || res.status === 200;
    throw new MiniMaxError(
      redact(`MiniMax HTTP ${String(res.status)}: ${err.slice(0, 300)}`),
      retryable,
      quota,
    );
  }

  async function withRetry(body: unknown, step: string): Promise<{ text: string; usage: Usage }> {
    let quotaRechecks = 0;
    for (let attempt = 0; ; attempt++) {
      try {
        return await once(body);
      } catch (e) {
        if (!(e instanceof MiniMaxError)) throw e;
        if (e.quota && quotaRechecks++ < maxQuotaRechecks) {
          log(
            `${step}: MiniMax Token Plan limit reached (2056); rechecking in ${String(quotaRecheckMs)} ms`,
          );
          await sleep(quotaRecheckMs);
          attempt = -1;
          continue;
        }
        const wait = waits[attempt];
        if (!e.retryable || wait === undefined) throw e;
        log(`${step}: ${e.message.slice(0, 80)}; retrying in ${String(wait)} ms`);
        await sleep(wait);
      }
    }
  }

  return async function m3(req: M3Request): Promise<M3Result> {
    const effort = req.effort ?? 'off';
    const body = {
      model: MODEL,
      max_tokens: req.maxTokens ?? 64000,
      ...(effort === 'off'
        ? { thinking: { type: 'disabled' } }
        : { thinking: { type: 'adaptive' }, output_config: { effort } }),
      system: req.system,
      messages: req.messages,
      stream: true,
    };
    const { text, usage: u } = await withRetry(body, req.step);
    const usage = {
      input: u.input_tokens ?? 0,
      cached: u.cache_read_input_tokens ?? 0,
      output: u.output_tokens ?? 0,
      thinking: u.output_tokens_details?.thinking_tokens ?? 0,
    };
    const usd =
      (usage.input * PRICE.in + usage.cached * PRICE.cached + usage.output * PRICE.out) / 1e6;
    return { text, usage, usd };
  };
}
