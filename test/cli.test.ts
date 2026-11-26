import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

await test('cli prints usage and exits 0', () => {
  const result = spawnSync(process.execPath, ['src/cli.ts'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^cutroom: /);
  assert.match(result.stdout, /Usage:/);
});
