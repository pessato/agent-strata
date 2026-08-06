import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveProvider, PROVIDER_IDS } from '../src/providers/index.js';
import { provider } from './helpers.js';

test('claude is registered and defaults', () => {
  assert.ok(PROVIDER_IDS.includes('claude'));
  assert.equal(resolveProvider().id, 'claude');
});

test('unknown provider fails loudly rather than rendering an empty report', () => {
  assert.throws(() => resolveProvider('nope'), /unknown provider "nope"/);
});

test('scope order defines precedence: managed strongest, plugin weakest', () => {
  assert.equal(provider.rank('managed'), 0);
  assert.ok(provider.rank('plugin') > provider.rank('user'));
  assert.ok(provider.rank('project-local') < provider.rank('project-shared'));
  assert.equal(provider.order.length, 6);
});

test('an unknown scope sorts last and degrades to an inert css class', () => {
  assert.equal(provider.rank('bogus'), provider.order.length);
  assert.equal(provider.shortOf('bogus'), 'bogus');
  assert.equal(provider.labelOf('bogus'), 'bogus');
});

test('macOS, linux and windows resolve different managed paths', () => {
  const base = { home: '/Users/x', projectDir: '/proj' };
  assert.equal(provider.settingsPaths({ platform: 'darwin', ...base }).managed,
    '/Library/Application Support/ClaudeCode/managed-settings.json');
  assert.equal(provider.settingsPaths({ platform: 'linux', ...base }).managed,
    '/etc/claude-code/managed-settings.json');
  assert.match(provider.settingsPaths({ platform: 'win32', ...base }).managed, /ClaudeCode/);
  // An unrecognised platform must still yield a path, not undefined.
  assert.ok(provider.settingsPaths({ platform: 'sunos', ...base }).managed);
});

test('user and project settings paths follow the documented layout', () => {
  const p = provider.settingsPaths({ platform: 'darwin', home: '/Users/x', projectDir: '/proj' });
  assert.equal(p.user, '/Users/x/.claude/settings.json');
  assert.equal(p['project-shared'], '/proj/.claude/settings.json');
  assert.equal(p['project-local'], '/proj/.claude/settings.local.json');
});

test('every scope carries the fields the reporter needs', () => {
  for (const s of provider.scopes) {
    assert.ok(s.id && s.short && s.label, `scope ${s.id} is incomplete`);
    assert.match(s.color, /^#[0-9a-f]{6}$/i, `scope ${s.id} needs a hex colour`);
  }
});
