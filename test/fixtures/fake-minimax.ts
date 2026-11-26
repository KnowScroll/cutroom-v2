import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export type Step =
  | { kind: 'stream'; chunks: string[]; usage: Record<string, unknown> }
  | { kind: 'reset' }
  | { kind: 'http'; status: number; body: string };

export interface FakeRequest {
  authorization: string | undefined;
  body: unknown;
}

export interface FakeMiniMax {
  url: string;
  requests: FakeRequest[];
  close: () => Promise<void>;
}

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/** The wire format captured from one real MiniMax-M3 call (2026-11-27), text only. */
export function streamBody(chunks: string[], usage: Record<string, unknown>): string[] {
  return [
    sse('message_start', {
      type: 'message_start',
      message: {
        id: 'fake',
        type: 'message',
        role: 'assistant',
        content: [],
        model: 'MiniMax-M3',
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0, service_tier: 'standard' },
        service_tier: 'standard',
      },
    }),
    sse('ping', { type: 'ping' }),
    sse('content_block_start', {
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text', text: '' },
    }),
    ...chunks.map((text) =>
      sse('content_block_delta', {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text },
      }),
    ),
    sse('content_block_stop', { type: 'content_block_stop', index: 0 }),
    sse('message_delta', {
      type: 'message_delta',
      delta: { stop_reason: 'end_turn' },
      usage: { ...usage, service_tier: 'standard' },
    }),
    sse('message_stop', { type: 'message_stop' }),
  ];
}

/** Serves `script` one step per request (the last step repeats). */
export async function startFakeMiniMax(script: Step[]): Promise<FakeMiniMax> {
  const requests: FakeRequest[] = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (d: string) => (raw += d));
    req.on('end', () => {
      requests.push({ authorization: req.headers.authorization, body: JSON.parse(raw) as unknown });
      const step = script[Math.min(requests.length - 1, script.length - 1)];
      if (step === undefined || step.kind === 'reset') {
        req.socket.destroy();
      } else if (step.kind === 'http') {
        res.writeHead(step.status, { 'Content-Type': 'application/json' });
        res.end(step.body);
      } else {
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
        for (const part of streamBody(step.chunks, step.usage)) res.write(part);
        res.end();
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo; // listen(0) on a TCP port always yields AddressInfo
  return {
    url: `http://127.0.0.1:${String(port)}/anthropic/v1/messages`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
        server.closeAllConnections();
      }),
  };
}
