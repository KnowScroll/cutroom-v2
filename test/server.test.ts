import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { rmSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parseConfig } from '../src/config.ts';
import { createM3 } from '../src/minimax.ts';
import { startWorker } from '../src/queue.ts';
import { runDir } from '../src/record.ts';
import { createApi } from '../src/server.ts';
import { syncTemplates } from '../src/templates.ts';
import { startFakeMiniMax, type Step } from './fixtures/fake-minimax.ts';

const root = await mkdtemp(path.join(tmpdir(), 'cutroom-server-'));
process.on('exit', () => {
  rmSync(root, { recursive: true, force: true });
});
const fakeEngine = path.join(import.meta.dirname, 'fixtures', 'fake-engine.mjs');
const originalsDir = path.join(root, 'templates');
await mkdir(originalsDir);
await writeFile(path.join(originalsDir, '_base.md'), '# base\n\n## story\nBASE STORY\n');
await writeFile(
  path.join(originalsDir, 'alpha.md'),
  '# alpha\n\n## about\nALPHA ABOUT\n\n## look\nALPHA LOOK\n',
);

const usage = { input_tokens: 1000, output_tokens: 100 };
const reply = (o: unknown): Step => ({ kind: 'stream', chunks: [JSON.stringify(o)], usage });
const intake = reply({
  template: 'alpha',
  fit: 'good',
  reason: 'fits',
  audience: 'curious adults',
  goal: 'show the size',
  tone: 'wondering',
  seconds: 45,
});
const review = reply({
  approve: true,
  summary: 'Ready.',
  scores: { hook: 4, clarity: 4, visual: 3, pacing: 4, audio: 4, fit: 4 },
  notes: {},
});

const TOKEN = 'test-token-0123456789';
const auth = { authorization: `Bearer ${TOKEN}` };

/** The API and a worker on a random port, a temp var folder, a fake engine and a fake MiniMax. */
async function withService(
  script: Step[],
  body: (base: string, varDir: string) => Promise<void>,
): Promise<void> {
  const varDir = await mkdtemp(path.join(root, 'var-'));
  await syncTemplates(originalsDir, path.join(varDir, 'templates'));
  const fake = await startFakeMiniMax(script);
  const worker = startWorker(
    {
      config: parseConfig({
        MINIMAX_API_KEY: 'test-key',
        CUTROOM_VAR: varDir,
        CUTROOM_ENGINE: fakeEngine,
        CUTROOM_VOICE_MODELS: 'heygen,minimax',
      }),
      m3: createM3({ apiKey: 'test-key', endpoint: fake.url, retryWaitsMs: [] }),
      originalsDir,
    },
    20,
  );
  const server = createApi({ varDir, token: TOKEN, onEnqueue: worker.wake });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await body(`http://127.0.0.1:${String((server.address() as AddressInfo).port)}`, varDir); // listening on a TCP port: AddressInfo
  } finally {
    server.closeAllConnections();
    server.close();
    await worker.stop();
    await fake.close();
  }
}

const postReel = (base: string, body: unknown, headers: Record<string, string> = auth) =>
  fetch(`${base}/reels`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

await test('401 without or with a wrong token, on every route but /health', async () => {
  await withService([], async (base) => {
    const wrong = { authorization: 'Bearer wrong' };
    for (const headers of [{}, wrong, { authorization: TOKEN }]) {
      assert.equal((await postReel(base, { request: 'x' }, headers)).status, 401);
      assert.equal((await fetch(`${base}/reels/20260101-000000-x`, { headers })).status, 401);
    }
  });
});

await test('health needs no token', async () => {
  await withService([], async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });
});

await test('400 on a bad body, nothing is queued', async () => {
  await withService([], async (base, varDir) => {
    const bad: unknown[] = [
      'not json',
      {},
      { request: '' },
      { request: 'x'.repeat(4001) },
      { request: 5 },
      { request: 'ok', seconds: 29 },
      { request: 'ok', seconds: 91 },
      { request: 'ok', template: 'no-such-template' },
      { request: 'ok', extra: 1 },
    ];
    for (const body of bad) {
      const res = await postReel(base, body);
      assert.equal(res.status, 400, JSON.stringify(body).slice(0, 60));
    }
    await assert.rejects(readFile(path.join(varDir, 'runs', 'index.jsonl')));
    const ok = await postReel(base, { request: 'x'.repeat(4000), seconds: 30, template: 'alpha' });
    assert.equal(ok.status, 202);
    // a client that escapes every non-ASCII character (Python json.dumps) sends 6 bytes per character
    const escaped = `{"request":"${'\\u00e9'.repeat(4000)}","seconds":45}`;
    assert.ok(escaped.length > 16 * 1024);
    assert.equal((await postReel(base, escaped)).status, 202);
  });
});

await test('POST, poll, done, and the downloaded reel equals the file', async () => {
  await withService([intake, review], async (base, varDir) => {
    const res = await postReel(base, { request: 'how big is the Sun' });
    assert.equal(res.status, 202);
    const { id } = (await res.json()) as { id: string }; // the body is what this server just sent
    assert.match(id, /^\d{8}-\d{6}-how-big-is-the-sun$/);

    let state: { status: string; stage: string; cuts: unknown[]; report: unknown } | undefined;
    for (let i = 0; i < 400; i++) {
      const r = await fetch(`${base}/reels/${id}`, { headers: auth });
      assert.equal(r.status, 200);
      state = (await r.json()) as typeof state; // this server's own JSON
      if (state?.status === 'done') break;
      assert.notEqual(state?.status, 'failed');
      await new Promise((r) => setTimeout(r, 25));
    }
    assert.equal(state?.status, 'done');
    assert.equal(state.cuts.length, 1);
    assert.notEqual(state.report, null);

    const mp4 = await fetch(`${base}/reels/${id}/reel.mp4`, { headers: auth });
    assert.equal(mp4.status, 200);
    assert.equal(mp4.headers.get('content-type'), 'video/mp4');
    const bytes = Buffer.from(await mp4.arrayBuffer());
    const file = await readFile(path.join(runDir(varDir, id), 'reel-v1', 'reel.mp4'));
    assert.ok(file.length > 0);
    assert.equal(mp4.headers.get('content-length'), String(file.length));
    assert.ok(bytes.equals(file));

    const report = await fetch(`${base}/reels/${id}/report`, { headers: auth });
    assert.equal(report.status, 200);
    const run = (await report.json()) as { id: string; status: string }; // run.json
    assert.deepEqual([run.id, run.status], [id, 'done']);
  });
});

await test('a queued job has no reel and no report yet (404)', async () => {
  await withService([], async (base, varDir) => {
    const { createJob } = await import('../src/record.ts');
    const job = await createJob(varDir, { request: 'waiting' });
    const status = await fetch(`${base}/reels/${job.id}`, { headers: auth });
    assert.equal(((await status.json()) as { status: string }).status, 'queued');
    for (const tail of ['/reel.mp4', '/report']) {
      assert.equal((await fetch(`${base}/reels/${job.id}${tail}`, { headers: auth })).status, 404);
    }
  });
});

await test('404 for an unknown id; a malformed id is refused before any file is read', async () => {
  await withService([], async (base, varDir) => {
    assert.equal(
      (await fetch(`${base}/reels/20260101-000000-nope`, { headers: auth })).status,
      404,
    );
    // a real job.json outside runs/, reachable only by walking out of the folder
    await writeFile(path.join(varDir, 'job.json'), '{}');
    await mkdir(path.join(varDir, 'runs'), { recursive: true });
    for (const id of ['..%2F..', '..%2Fjob.json', '%2e%2e', '..', 'a%2Fb', '%zz', '..%5C..']) {
      for (const tail of ['', '/report', '/reel.mp4']) {
        const res = await fetch(`${base}/reels/${id}${tail}`, { headers: auth });
        assert.equal(res.status, 404, `${id}${tail}`);
      }
    }
    assert.equal((await fetch(`${base}/nothing`, { headers: auth })).status, 404);
  });
});

await test('serve: needs the token, then serves with the templates synced', async () => {
  const varDir = await mkdtemp(path.join(root, 'var-'));
  const env = {
    ...process.env,
    CUTROOM_ENV_FILE: undefined,
    MINIMAX_API_KEY: 'test-key',
    CUTROOM_VAR: varDir,
    CUTROOM_ENGINE: fakeEngine,
    CUTROOM_PORT: '18765',
    CUTROOM_HOST: '127.0.0.1',
  };
  const cli = path.join(import.meta.dirname, '..', 'src', 'cli.ts');
  const noToken = spawn(process.execPath, [cli, 'serve'], {
    env: { ...env, CUTROOM_API_TOKEN: '' },
  });
  const code = ((await once(noToken, 'exit')) as [number | null])[0]; // 'exit' emits [code, signal]
  assert.notEqual(code, 0);

  const child = spawn(process.execPath, [cli, 'serve'], {
    env: { ...env, CUTROOM_API_TOKEN: TOKEN },
  });
  try {
    let up = false;
    for (let i = 0; i < 200 && !up; i++) {
      up = await fetch('http://127.0.0.1:18765/health').then(
        (r) => r.ok,
        () => false,
      );
      if (!up) await new Promise((r) => setTimeout(r, 50));
    }
    assert.ok(up, 'serve answered /health');
    const res = await fetch('http://127.0.0.1:18765/reels/20260101-000000-x');
    assert.equal(res.status, 401);
    // serve synced the templates before it took requests
    await readFile(path.join(varDir, 'templates', 'comic-story.md'));
  } finally {
    child.kill();
    await once(child, 'exit');
  }
});
