import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { runJob, type JobOptions } from './job.ts';
import { pidAlive } from './proc.ts';
import { createJob, readJob, setJobStatus, type Job, type JobRequest } from './record.ts';

// design §8, D18: jobs are folders in <var>/runs; one worker takes the oldest `queued` one, one at a time.

export type WorkerOptions = Omit<JobOptions, 'request' | 'jobId'>;

/** Creates a queued job folder (job.json) and returns its id. */
export async function enqueue(varDir: string, request: JobRequest): Promise<string> {
  return (await createJob(varDir, request)).id;
}

/**
 * Every job in <var>/runs, oldest first (created, then id). Files (index.jsonl), folders without a job.json and
 * folders whose job.json cannot be read are skipped: they are not jobs.
 */
export async function listJobs(varDir: string): Promise<Job[]> {
  let entries;
  try {
    entries = await readdir(path.join(varDir, 'runs'), { withFileTypes: true });
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code === 'ENOENT') return [];
    throw e;
  }
  const jobs: Job[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      jobs.push(await readJob(varDir, entry.name));
    } catch {
      // not a job folder (no job.json, or one that is not valid)
    }
  }
  return jobs.sort((a, b) =>
    a.created === b.created ? a.id.localeCompare(b.id) : a.created.localeCompare(b.created),
  );
}

/** A running job whose owner process is gone (or never recorded): the worker may resume it. A live owner keeps it. */
function orphaned(job: Job): boolean {
  return job.status === 'running' && (job.owner === null || !pidAlive(job.owner.pid));
}

/** Runs one job (new, or running = resumed after a restart). It always ends done or failed; the queue goes on. */
async function runOne(job: Job, options: WorkerOptions): Promise<void> {
  const log = options.log ?? (() => undefined);
  try {
    await runJob({ ...options, request: job.request, jobId: job.id });
  } catch (e) {
    // runJob records its own failures; this is what it could not (a corrupt loop.json, a disk error)
    const error = e instanceof Error ? e.message : String(e);
    log(`job ${job.id} failed: ${error}`);
    try {
      const now = await readJob(options.config.varDir, job.id);
      if (now.status === 'queued') await setJobStatus(options.config.varDir, job.id, 'running');
      if (now.status === 'queued' || now.status === 'running') {
        await setJobStatus(options.config.varDir, job.id, 'failed', { error });
      }
    } catch (inner) {
      log(
        `job ${job.id} could not be marked failed: ${inner instanceof Error ? inner.message : String(inner)}`,
      );
    }
  }
}

/**
 * Runs what is waiting, once: first the jobs a dead worker left `running` (resumed, oldest first), then every
 * `queued` job oldest first. A failed job does not stop the rest. Returns the ids in the order they ran.
 */
export async function drain(options: WorkerOptions): Promise<string[]> {
  const ran: string[] = [];
  for (const job of (await listJobs(options.config.varDir)).filter(orphaned)) {
    await runOne(job, options);
    ran.push(job.id);
  }
  for (;;) {
    const next = (await listJobs(options.config.varDir)).find(
      (j) => j.status === 'queued' && !ran.includes(j.id),
    );
    if (next === undefined) return ran;
    await runOne(next, options);
    ran.push(next.id);
  }
}

export interface Worker {
  /** Look for work now instead of at the next poll. */
  wake: () => void;
  /** Stop taking jobs; resolves when the job being run (if any) has finished. */
  stop: () => Promise<void>;
}

/**
 * The worker: recovers a job left `running`, then takes the oldest `queued` job whenever there is one, polling every
 * `pollMs` (and at `wake()`). A running job at start belongs to a worker that died, so this must be the only worker
 * of the var folder.
 */
export function startWorker(options: WorkerOptions, pollMs = 1000): Worker {
  const state = { stopping: false };
  let wake = (): void => undefined;
  const loop = (async () => {
    const attempted = new Set<string>();
    const take = async (status: Job['status']): Promise<boolean> => {
      const job = (await listJobs(options.config.varDir)).find(
        (j) => (status === 'running' ? orphaned(j) : j.status === status) && !attempted.has(j.id),
      );
      if (job === undefined) return false;
      attempted.add(job.id);
      await runOne(job, options);
      return true;
    };
    const log = options.log ?? (() => undefined);
    // a scan that fails (a disk error) is logged and tried again at the next poll; it must not end the worker
    const safely = async (status: Job['status']): Promise<boolean> => {
      try {
        return await take(status);
      } catch (e) {
        log(`queue scan failed: ${e instanceof Error ? e.message : String(e)}`);
        return false;
      }
    };
    while (!state.stopping && (await safely('running'))) {
      // resume every job the last worker left running
    }
    while (!state.stopping) {
      if (await safely('queued')) continue;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, pollMs);
        wake = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    }
  })();
  return {
    wake: () => {
      wake();
    },
    stop: async () => {
      state.stopping = true;
      wake();
      await loop;
    },
  };
}
