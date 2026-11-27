import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { DEFAULT_VOICE_MODELS, loadConfig, parseConfig, requireApiToken } from '../src/config.ts';

const KEY = 'fake-minimax-value-123';

await test('defaults apply when only the required key is set', () => {
  const c = parseConfig({ MINIMAX_API_KEY: KEY });
  assert.equal(c.minimaxApiKey, KEY);
  assert.equal(c.openrouterApiKey, undefined);
  assert.equal(c.elevenlabsApiKey, undefined);
  assert.deepEqual(c.voiceModels, DEFAULT_VOICE_MODELS);
  assert.equal(c.host, '127.0.0.1');
  assert.equal(c.port, 8080);
  assert.equal(path.basename(c.varDir), 'var');
});

await test('a missing key is an error that names the key, not a value', () => {
  assert.throws(() => parseConfig({}), /missing MINIMAX_API_KEY/);
  assert.throws(() => parseConfig({ MINIMAX_API_KEY: '  ' }), /missing MINIMAX_API_KEY/);
  assert.throws(
    () => requireApiToken(parseConfig({ MINIMAX_API_KEY: KEY })),
    /missing CUTROOM_API_TOKEN/,
  );
  assert.equal(
    requireApiToken(parseConfig({ MINIMAX_API_KEY: KEY, CUTROOM_API_TOKEN: 'tok' })),
    'tok',
  );
});

await test('CUTROOM_VOICE_MODELS is an ordered list checked against the engine keys', () => {
  const c = parseConfig({ MINIMAX_API_KEY: KEY, CUTROOM_VOICE_MODELS: 'heygen, minimax ,kokoro' });
  assert.deepEqual(c.voiceModels, ['heygen', 'minimax', 'kokoro']);
  assert.throws(
    () => parseConfig({ MINIMAX_API_KEY: KEY, CUTROOM_VOICE_MODELS: 'heygen,nope' }),
    /unknown voice model "nope"/,
  );
  assert.throws(
    () => parseConfig({ MINIMAX_API_KEY: KEY, CUTROOM_VOICE_MODELS: 'heygen,heygen' }),
    /listed twice/,
  );
});

await test('port is validated; error does not echo the key', () => {
  assert.equal(parseConfig({ MINIMAX_API_KEY: KEY, CUTROOM_PORT: '9000' }).port, 9000);
  assert.throws(
    () => parseConfig({ MINIMAX_API_KEY: KEY, CUTROOM_PORT: 'abc' }),
    (e: unknown) =>
      e instanceof Error && /CUTROOM_PORT/.test(e.message) && !e.message.includes(KEY),
  );
});

await test('loadConfig reads CUTROOM_ENV_FILE', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'cutroom-config-'));
  const file = path.join(dir, 'test.env');
  writeFileSync(file, `MINIMAX_API_KEY=${KEY}\nCUTROOM_PORT=8123\nCUTROOM_VAR=${dir}\n`);
  const saved = { ...process.env };
  try {
    // loadEnvFile never overrides: the caller's own CUTROOM_VAR or CUTROOM_PORT would beat the file
    for (const k of ['MINIMAX_API_KEY', 'CUTROOM_PORT', 'CUTROOM_VAR']) {
      Reflect.deleteProperty(process.env, k);
    }
    process.env['CUTROOM_ENV_FILE'] = file;
    const c = loadConfig();
    assert.equal(c.minimaxApiKey, KEY);
    assert.equal(c.port, 8123);
    assert.equal(c.varDir, dir);
    process.env['CUTROOM_ENV_FILE'] = path.join(dir, 'missing.env');
    assert.throws(() => loadConfig(), /CUTROOM_ENV_FILE: file not found/);
  } finally {
    for (const k of ['MINIMAX_API_KEY', 'CUTROOM_PORT', 'CUTROOM_VAR', 'CUTROOM_ENV_FILE']) {
      const v = saved[k];
      if (v === undefined) Reflect.deleteProperty(process.env, k);
      else process.env[k] = v;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
