import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSecretKey, redactEnv, redactValue, REDACTED } from '../src/redact.js';
import { mergeConfig } from '../src/merge/index.js';
import { provider } from './helpers.js';

test('credential-bearing key names are recognised', () => {
  for (const k of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'AWS_SECRET_ACCESS_KEY',
    'GITHUB_TOKEN', 'MY_PASSWORD', 'GCP_CREDENTIALS', 'SSH_PRIVATE_KEY', 'token']) {
    assert.equal(isSecretKey(k), true, `${k} should be treated as secret`);
  }
});

test('lookalike keys that hold no secret stay visible', () => {
  // apiKeyHelper is a path to a script, and the rest are plain settings.
  for (const k of ['apiKeyHelper', 'ANTHROPIC_MODEL', 'CLAUDE_CODE_ENTRYPOINT',
    'keyboardShortcut', 'tokenizer', 'DISABLE_TELEMETRY']) {
    assert.equal(isSecretKey(k), false, `${k} should not be treated as secret`);
  }
});

test('redactEnv keeps every key but masks secret values', () => {
  const out = redactEnv({ ANTHROPIC_API_KEY: 'sk-ant-real-key', ANTHROPIC_MODEL: 'opus' });
  assert.equal(out.ANTHROPIC_API_KEY, REDACTED);
  assert.equal(out.ANTHROPIC_MODEL, 'opus');
  // The fact that a key is set is the diagnostic signal, so it must survive.
  assert.ok('ANTHROPIC_API_KEY' in out);
});

test('redactValue masks array entries element-wise', () => {
  assert.deepEqual(redactValue('API_TOKEN', ['a', 'b']), [REDACTED, REDACTED]);
  assert.deepEqual(redactValue('allow', ['a', 'b']), ['a', 'b']);
});

test('a secret in a settings env block never reaches the merged output', () => {
  const { leaves, effective } = mergeConfig([
    { scope: 'user', source: 'u', settings: { env: { ANTHROPIC_API_KEY: 'sk-ant-leak', ANTHROPIC_MODEL: 'opus' } } },
    { scope: 'project-shared', source: 'p', settings: { env: { ANTHROPIC_API_KEY: 'sk-ant-other' } } },
  ], provider);

  const key = leaves.find(l => l.path === 'env.ANTHROPIC_API_KEY');
  assert.equal(key.value, REDACTED);
  // The overridden value is a live credential too — it must be masked as well.
  assert.deepEqual(key.overrides.map(o => o.value), [REDACTED]);
  assert.equal(effective.env.ANTHROPIC_API_KEY, REDACTED);
  assert.equal(effective.env.ANTHROPIC_MODEL, 'opus');

  assert.doesNotMatch(JSON.stringify(leaves), /sk-ant-/);
});
