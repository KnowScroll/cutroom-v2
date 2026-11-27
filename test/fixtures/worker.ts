// A queue worker process for tests that kill it: drains the queue of the var folder in argv[2]'s JSON, then exits.
import { z } from 'zod';
import { parseConfig } from '../../src/config.ts';
import { createM3 } from '../../src/minimax.ts';
import { drain } from '../../src/queue.ts';

const Opts = z.object({
  varDir: z.string(),
  engine: z.string(),
  voices: z.string(),
  endpoint: z.string(),
  originals: z.string(),
  env: z.record(z.string(), z.string()),
});

const opts = Opts.parse(JSON.parse(process.argv[2] ?? '{}'));
const config = parseConfig({
  MINIMAX_API_KEY: 'test-key',
  CUTROOM_VAR: opts.varDir,
  CUTROOM_ENGINE: opts.engine,
  CUTROOM_VOICE_MODELS: opts.voices,
});
const ran = await drain({
  config,
  m3: createM3({ apiKey: 'test-key', endpoint: opts.endpoint }),
  originalsDir: opts.originals,
  engineEnv: opts.env,
});
console.log(JSON.stringify(ran));
