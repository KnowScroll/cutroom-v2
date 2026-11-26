#!/usr/bin/env node
import path from 'node:path';
import { parseArgs } from 'node:util';
import { loadConfig } from './config.ts';
import { runJob } from './job.ts';
import { createM3 } from './minimax.ts';
import { runDir } from './record.ts';

const usage = `cutroom: turn a request into a vertical reel

Usage:
  cutroom make "<request>" [--template <kind>] [--seconds <n>]

Commands:
  make   run one job in the foreground; prints the run folder and the report path
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

const [command, ...rest] = process.argv.slice(2);
if (command === 'make') {
  process.exitCode = await make(rest);
} else {
  process.stdout.write(usage);
  process.exitCode = command === undefined ? 0 : 2;
}
