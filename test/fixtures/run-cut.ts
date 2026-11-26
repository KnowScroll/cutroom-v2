// A tiny harness process for tests that signal it: runs one cut from the JSON options in argv[2].
import { z } from 'zod';
import { runCut, type RunCutOptions } from '../../src/engine.ts';

const Opts = z.object({
  config: z.object({ varDir: z.string(), engineEntry: z.string() }),
  runDir: z.string(),
  briefFile: z.string(),
  template: z.string(),
  seconds: z.number(),
  cut: z.number(),
  voiceModel: z.enum(['heygen', 'minimax', 'kokoro']),
  env: z.record(z.string(), z.string()),
});

const opts: RunCutOptions = Opts.parse(JSON.parse(process.argv[2] ?? '{}'));
const result = await runCut(opts);
console.log(result.kind);
