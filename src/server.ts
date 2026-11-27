import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { readLoop } from './loop.ts';
import { enqueue } from './queue.ts';
import { readJob, readRunRecord, runDir, type CutRecord } from './record.ts';

// design §8: the HTTP API. node:http, no framework.

const MAX_BODY_BYTES = 16 * 1024;

/** The ids createJob makes: YYYYMMDD-HHMMSS-<slug>[-n]. Anything else never reaches the filesystem. */
const JOB_ID = /^\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const PostBody = z.strictObject({
  request: z.string().min(1).max(4000),
  template: z.string().min(1).optional(),
  seconds: z.number().min(30).max(90).optional(),
});

export interface ServerOptions {
  varDir: string;
  token: string;
  /** Called after a job is queued, so the worker looks for it now. */
  onEnqueue?: () => void;
}

const digest = (s: string): Buffer => createHash('sha256').update(s).digest();

/** Constant time: both sides are hashed first so the buffers have equal length. */
function tokenMatches(header: string | undefined, token: string): boolean {
  const given = /^Bearer (.+)$/.exec(header ?? '')?.[1];
  if (given === undefined) return false;
  return timingSafeEqual(digest(given), digest(token));
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
  });
  res.end(text);
}

const fail = (res: ServerResponse, status: number, error: string): void => {
  sendJson(res, status, { error });
};

function hasCode(e: unknown, code: string): boolean {
  return e instanceof Error && 'code' in e && e.code === code;
}

async function readBody(req: IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buf.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function templateNames(varDir: string): Promise<string[]> {
  try {
    const files = await readdir(path.join(varDir, 'templates'));
    return files.filter((f) => f.endsWith('.md') && !f.startsWith('_')).map((f) => f.slice(0, -3));
  } catch (e) {
    if (hasCode(e, 'ENOENT')) return [];
    throw e;
  }
}

async function post(req: IncomingMessage, res: ServerResponse, o: ServerOptions): Promise<void> {
  const text = await readBody(req);
  if (text === null) {
    fail(res, 413, 'body too large');
    return;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    fail(res, 400, 'body is not JSON');
    return;
  }
  const body = PostBody.safeParse(json);
  if (!body.success) {
    const why = body.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`);
    fail(res, 400, why.join('; '));
    return;
  }
  const { template } = body.data;
  if (template !== undefined && !(await templateNames(o.varDir)).includes(template)) {
    fail(res, 400, `unknown template "${template}"`);
    return;
  }
  const id = await enqueue(o.varDir, body.data);
  o.onEnqueue?.();
  sendJson(res, 202, { id });
}

function cutSummary(cut: CutRecord): unknown {
  return {
    n: cut.n,
    template: cut.template,
    film_s: cut.film_s,
    wall_s: cut.wall_s,
    usd: Object.values(cut.engine_cost).reduce((a, p) => a + p.usd, 0),
    blocking_fails: cut.gates.filter((g) => g.mode === 'block' && !g.pass).length,
    review: cut.review === null ? null : { approve: cut.review.approve, scores: cut.review.scores },
  };
}

async function status(res: ServerResponse, o: ServerOptions, id: string): Promise<void> {
  const job = await readJob(o.varDir, id);
  let cuts: CutRecord[] = [];
  try {
    cuts = (await readLoop(runDir(o.varDir, id)))?.cuts ?? [];
  } catch {
    // loop.json is replaced atomically; if it still cannot be read, the cuts are not shown this time
  }
  let report: unknown = null;
  if (job.status === 'done' || job.status === 'failed') {
    try {
      const run = await readRunRecord(o.varDir, id);
      report = {
        approved: run.approved,
        selected: run.selected,
        loop_end: run.loop_end,
        totals: run.totals,
        error: run.error,
      };
    } catch (e) {
      if (!hasCode(e, 'ENOENT')) throw e;
    }
  }
  sendJson(res, 200, {
    id: job.id,
    status: job.status,
    stage: job.stage,
    created: job.created,
    started: job.started,
    finished: job.finished,
    error: job.error,
    cuts: cuts.map(cutSummary),
    report,
  });
}

async function report(res: ServerResponse, o: ServerOptions, id: string): Promise<void> {
  try {
    const text = await readFile(path.join(runDir(o.varDir, id), 'run.json'), 'utf8');
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(text),
    });
    res.end(text);
  } catch (e) {
    if (hasCode(e, 'ENOENT')) {
      fail(res, 404, 'no report yet');
      return;
    }
    throw e;
  }
}

async function reel(res: ServerResponse, o: ServerOptions, id: string): Promise<void> {
  let selected: number | undefined;
  try {
    selected = (await readRunRecord(o.varDir, id)).selected?.cut;
  } catch (e) {
    if (!hasCode(e, 'ENOENT')) throw e;
  }
  if (selected === undefined) {
    fail(res, 404, 'no reel yet');
    return;
  }
  const file = path.join(runDir(o.varDir, id), `reel-v${String(selected)}`, 'reel.mp4');
  let size: number;
  try {
    size = (await stat(file)).size;
  } catch (e) {
    if (hasCode(e, 'ENOENT')) {
      fail(res, 404, 'no reel yet');
      return;
    }
    throw e;
  }
  res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': size });
  await pipeline(createReadStream(file), res);
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return '';
  }
}

async function route(req: IncomingMessage, res: ServerResponse, o: ServerOptions): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const method = req.method ?? 'GET';
  if (url.pathname === '/health' && method === 'GET') {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (!tokenMatches(req.headers.authorization, o.token)) {
    res.setHeader('www-authenticate', 'Bearer');
    fail(res, 401, 'missing or wrong bearer token');
    return;
  }
  if (url.pathname === '/reels' && method === 'POST') return post(req, res, o);
  const m = /^\/reels\/([^/]+)(?:\/(reel\.mp4|report))?$/.exec(url.pathname);
  if (m !== null && method === 'GET') {
    // the id is checked before any path is built from it
    const id = safeDecode(m[1] ?? '');
    if (!JOB_ID.test(id)) {
      fail(res, 404, 'unknown reel');
      return;
    }
    try {
      await readJob(o.varDir, id);
    } catch (e) {
      if (hasCode(e, 'ENOENT')) {
        fail(res, 404, 'unknown reel');
        return;
      }
      throw e;
    }
    if (m[2] === 'reel.mp4') return reel(res, o, id);
    if (m[2] === 'report') return report(res, o, id);
    return status(res, o, id);
  }
  fail(res, 404, 'not found');
}

export function createApi(options: ServerOptions): Server {
  return createServer((req, res) => {
    route(req, res, options).catch((e: unknown) => {
      // the client gets no internals
      process.stderr.write(`api: request failed: ${e instanceof Error ? e.message : String(e)}\n`);
      if (!res.headersSent) fail(res, 500, 'internal error');
      else res.destroy();
    });
  });
}
