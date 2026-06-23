import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsPaths } from '../src/collector/paths.js';

const env = { home: '/Users/x', projectDir: '/proj' };

test('macOS managed path and user/project paths', () => {
  const p = settingsPaths({ platform: 'darwin', ...env });
  assert.equal(p.managed, '/Library/Application Support/ClaudeCode/managed-settings.json');
  assert.equal(p.user, '/Users/x/.claude/settings.json');
  assert.equal(p['project-shared'], '/proj/.claude/settings.json');
  assert.equal(p['project-local'], '/proj/.claude/settings.local.json');
});

test('linux and windows managed paths differ', () => {
  assert.equal(settingsPaths({ platform: 'linux', ...env }).managed, '/etc/claude-code/managed-settings.json');
  assert.match(settingsPaths({ platform: 'win32', home: 'C:\\\\Users\\\\x', projectDir: 'C:\\\\proj' }).managed, /ClaudeCode/);
});
