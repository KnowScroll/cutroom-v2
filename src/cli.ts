#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig, requireApiToken } from './config.ts';
import { runJob } from './job.ts';
import { createM3 } from './minimax.ts';
import { startWorker } from './queue.ts';
import { readJob, runDir } from './record.ts';
import { createApi } from './server.ts';
import { syncTemplates } from './templates.ts';

const originalsDir = path.resolve(import.meta.dirname, '..', 'templates');

const usage = `cutroom: turn a request into a vertical reel

Usage:
  cutroom make "<request>" [--template <kind>] [--seconds <n>]
  cutroom serve
  cutroom status <id>
  cutroom sync

Commands:
  make     run one job in the foreground; prints the run folder and the report path
  serve    the HTTP API and the queue worker (CUTROOM_HOST:CUTROOM_PORT, needs CUTROOM_API_TOKEN)
  status   print a job's status, stage and error
  sync     bring <var>/templates in line with the originals and print what changed
`;

async function make(args: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    options: { template: { type: 'string' }, seconds: { type: 'string' } },
    allowPositionals: true,
  });
  const request = positionals.join(' ').trim();
  if (request === '') {
    process.stderr.write('make: a request is required\n');
    return 2;
  }
  const seconds = values.seconds === undefined ? undefined : Number(values.seconds);
  if (seconds !== undefined && !(seconds > 0)) {
    process.stderr.write('make: --seconds must be a positive number\n');
    return 2;
  }
  const config = loadConfig();
  // Tests point the client at a fake server; nothing else sets this.
  const endpoint = process.env['CUTROOM_MINIMAX_URL'];
  const m3 = createM3({
    apiKey: config.minimaxApiKey,
    ...(endpoint === undefined || endpoint === '' ? {} : { endpoint }),
    log: (line) => process.stderr.write(`${line}\n`),
  });
  const run = await runJob({
    config,
    request: {
      request,
      ...(values.template === undefined ? {} : { template: values.template }),
      ...(seconds === undefined ? {} : { seconds }),
    },
    m3,
    log: (line) => process.stdout.write(`${line}\n`),
  });
  const folder = runDir(config.varDir, run.id);
  process.stdout.write(`run folder: ${folder}\nreport: ${path.join(folder, 'report.md')}\n`);
  if (run.status === 'failed') {
    process.stderr.write(`job failed: ${run.error ?? 'no error recorded'}\n`);
    return 1;
  }
  return 0;
}

const JOB_ID = /^\d{8}-\d{6}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function m3Of(config: ReturnType<typeof loadConfig>): ReturnType<typeof createM3> {
  // Tests point the client at a fake server; nothing else sets this.
  const endpoint = process.env['CUTROOM_MINIMAX_URL'];
  return createM3({
    apiKey: config.minimaxApiKey,
    ...(endpoint === undefined || endpoint === '' ? {} : { endpoint }),
    log: (line) => process.stderr.write(`${line}\n`),
  });
}

async function sync(): Promise<number> {
  const config = loadConfig();
  const result = await syncTemplates(originalsDir, path.join(config.varDir, 'templates'));
  for (const e of result.events) process.stdout.write(`${e.action}: ${e.file} (${e.detail})\n`);
  if (result.events.length === 0) process.stdout.write('templates are in sync\n');
  for (const c of result.conflicts) process.stdout.write(`conflict: ${c}\n`);
  return result.conflicts.length === 0 ? 0 : 1;
}

async function status(args: string[]): Promise<number> {
  const id = args[0];
  if (id === undefined || !JOB_ID.test(id)) {
    process.stderr.write('status: a job id is required\n');
    return 2;
  }
  const config = loadConfig();
  let job;
  try {
    job = await readJob(config.varDir, id);
  } catch {
    process.stderr.write(`status: no job ${id}\n`);
    return 1;
  }
  process.stdout.write(`${job.id}\nstatus: ${job.status}\nstage: ${job.stage}\n`);
  if (job.error !== null) process.stdout.write(`error: ${job.error}\n`);
  process.stdout.write(`folder: ${runDir(config.varDir, id)}\n`);
  return job.status === 'failed' ? 1 : 0;
}

async function serve(): Promise<number> {
  const config = loadConfig();
  const token = requireApiToken(config);
  const log = (line: string): void => {
    process.stdout.write(`${line}\n`);
  };
  const result = await syncTemplates(originalsDir, path.join(config.varDir, 'templates'));
  for (const c of result.conflicts) log(`sync conflict: ${c}`);
  const worker = startWorker({ config, m3: m3Of(config), log });
  const server = createApi({ varDir: config.varDir, token, onEnqueue: worker.wake });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, resolve);
  });
  log(`serving on ${config.host}:${String(config.port)}`);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      server.close();
      server.closeAllConnections();
      // While an engine runs, its own handler (registered later) stops the engine's tree and exits; otherwise exit
      // now. Either way a job left running is resumed by the next start.
      if (process.listenerCount(signal) <= 1) process.exit(signal === 'SIGINT' ? 130 : 143);
    });
  }
  return await new Promise<number>(() => undefined);
}

const [command, ...rest] = process.argv.slice(2);
if (command === 'make') {
  process.exitCode = await make(rest);
} else if (command === 'serve') {
  process.exitCode = await serve();
} else if (command === 'status') {
  process.exitCode = await status(rest);
} else if (command === 'sync') {
  process.exitCode = await sync();
} else {
  process.stdout.write(usage);
  process.exitCode = command === undefined ? 0 : 2;
}
