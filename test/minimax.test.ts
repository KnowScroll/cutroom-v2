import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createM3 } from '../src/minimax.ts';
import { startFakeMiniMax, type Step } from './fixtures/fake-minimax.ts';

const KEY = 'sk-fake-key-9f8e7d6c5b4a';
const usage = { input_tokens: 1000, cache_read_input_tokens: 500, output_tokens: 200 };
const ok: Step = { kind: 'stream', chunks: ['Hel', 'lo ', 'world'], usage };
const req = { step: 'test', system: 'sys', messages: [{ role: 'user' as const, content: 'hi' }] };

async function withServer<T>(
  script: Step[],
  run: (
    url: string,
    requests: { authorization: string | undefined; body: unknown }[],
  ) => Promise<T>,
): Promise<T> {
  const fake = await startFakeMiniMax(script);
  try {
    return await run(fake.url, fake.requests);
  } finally {
    await fake.close();
  }
}

const fast = { retryWaitsMs: [5, 5, 5], quotaRecheckMs: 5 };

await test('text is assembled from the stream, with usage and USD', async () => {
  await withServer([ok], async (endpoint, requests) => {
    const m3 = createM3({ apiKey: KEY, endpoint, ...fast });
    const r = await m3({ ...req, maxTokens: 123 });
    assert.equal(r.text, 'Hello world');
    assert.deepEqual(r.usage, { input: 1000, cached: 500, output: 200, thinking: 0 });
    assert.ok(Math.abs(r.usd - (1000 * 0.3 + 500 * 0.06 + 200 * 1.2) / 1e6) < 1e-12);
    const sent = requests[0];
    assert.equal(sent?.authorization, `Bearer ${KEY}`);
    assert.deepEqual(sent.body, {
      model: 'MiniMax-M3',
      max_tokens: 123,
      thinking: { type: 'disabled' },
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
    });
  });
});

await test('thinking effort and image blocks reach the request body', async () => {
  await withServer([ok], async (endpoint, requests) => {
    const m3 = createM3({ apiKey: KEY, endpoint, ...fast });
    const image = {
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/png', data: 'AAAA' },
    };
    await m3({
      ...req,
      effort: 'high',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'look' }, image] }],
    });
    const body = requests[0]?.body as {
      thinking: unknown;
      output_config: unknown;
      messages: unknown;
    };
    assert.deepEqual(body.thinking, { type: 'adaptive' });
    assert.deepEqual(body.output_config, { effort: 'high' });
    assert.deepEqual(body.messages, [
      { role: 'user', content: [{ type: 'text', text: 'look' }, image] },
    ]);
  });
});

await test('a connection reset is retried, then succeeds', async () => {
  await withServer([{ kind: 'reset' }, ok], async (endpoint, requests) => {
    const logs: string[] = [];
    const m3 = createM3({ apiKey: KEY, endpoint, ...fast, log: (l) => logs.push(l) });
    const r = await m3(req);
    assert.equal(r.text, 'Hello world');
    assert.equal(requests.length, 2);
    assert.equal(logs.length, 1);
  });
});

await test('error 2056 waits and rechecks, then succeeds', async () => {
  const quota: Step = {
    kind: 'http',
    status: 429,
    body: '{"type":"error","error":{"type":"rate_limit_error","message":"usage limit exceeded (2056)"}}',
  };
  await withServer([quota, quota, ok], async (endpoint, requests) => {
    const m3 = createM3({ apiKey: KEY, endpoint, ...fast, retryWaitsMs: [] });
    const r = await m3(req);
    assert.equal(r.text, 'Hello world');
    assert.equal(requests.length, 3);
  });
});

await test('a 400 is not retried', async () => {
  const bad: Step = { kind: 'http', status: 400, body: '{"error":"bad request"}' };
  await withServer([bad, ok], async (endpoint, requests) => {
    const m3 = createM3({ apiKey: KEY, endpoint, ...fast });
    await assert.rejects(m3(req), /MiniMax HTTP 400/);
    assert.equal(requests.length, 1);
  });
});

await test('a 500 is retried and gives up after the waits run out', async () => {
  const down: Step = { kind: 'http', status: 500, body: 'oops' };
  await withServer([down], async (endpoint, requests) => {
    const m3 = createM3({ apiKey: KEY, endpoint, ...fast });
    await assert.rejects(m3(req), /MiniMax HTTP 500/);
    assert.equal(requests.length, 4);
  });
});

await test('the key never appears in an error or a log line, even if the server echoes it', async () => {
  const echo: Step = {
    kind: 'http',
    status: 400,
    body: `{"error":"invalid Authorization Bearer ${KEY}"}`,
  };
  const reset: Step = { kind: 'reset' };
  await withServer([reset, echo], async (endpoint) => {
    const logs: string[] = [];
    const m3 = createM3({ apiKey: KEY, endpoint, ...fast, log: (l) => logs.push(l) });
    const err = await m3(req).then(
      () => undefined,
      (e: unknown) => e,
    );
    assert.ok(err instanceof Error);
    assert.match(err.message, /\[redacted\]/);
    assert.ok(![err.message, ...logs].some((s) => s.includes(KEY)));
  });
});
