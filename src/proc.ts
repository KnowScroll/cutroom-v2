import { renameSync } from 'node:fs';
import { rename } from 'node:fs/promises';

function errCode(e: unknown): string | undefined {
  return e instanceof Error && 'code' in e && typeof e.code === 'string' ? e.code : undefined;
}

/** True when a process with this pid exists (EPERM: it exists but is not ours). */
export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return errCode(e) === 'EPERM';
  }
}

// Windows refuses a rename over a file another handle has open at that instant (EPERM/EBUSY/EACCES, say a status
// reader); it clears within milliseconds. Retried for about a second.
const TRIES = 40;
const WAIT_MS = 25;
const transient = (e: unknown): boolean => ['EPERM', 'EBUSY', 'EACCES'].includes(errCode(e) ?? '');

/** Synchronous, for the engine lock (other processes hold the handle); `beforeEach` runs before every attempt. */
export function renameWithRetry(from: string, to: string, beforeEach?: () => void): void {
  for (let i = 0; ; i++) {
    beforeEach?.();
    try {
      renameSync(from, to);
      return;
    } catch (e) {
      if (i >= TRIES || !transient(e)) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, WAIT_MS);
    }
  }
}

/**
 * Asynchronous, for the job files: a reader in this same process (the service's status requests) can only close its
 * handle when the event loop runs, so the wait must not block it.
 */
export async function renameRetry(from: string, to: string): Promise<void> {
  for (let i = 0; ; i++) {
    try {
      await rename(from, to);
      return;
    } catch (e) {
      if (i >= TRIES || !transient(e)) throw e;
      await new Promise((r) => setTimeout(r, WAIT_MS));
    }
  }
}
