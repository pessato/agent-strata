import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMergedRows, renderStrata } from '../src/reporter/sections.js';
import { provider } from './helpers.js';

test('scalar row shows key, value, source, and collapsed overrides', () => {
  const html = renderMergedRows(provider, [
    { path: 'model', key: 'model', type: 'scalar', winner: 'managed', value: 'opus', locked: true,
      overrides: [{ scope: 'user', value: 'sonnet', source: '~/.claude/settings.json' }] },
  ]);
  assert.match(html, /model/);
  assert.match(html, /opus/);
  assert.match(html, /1 override/);
  assert.match(html, /<s>sonnet<\/s>/);
  assert.match(html, /locked/);
});

test('array row renders union tokens', () => {
  const html = renderMergedRows(provider, [
    { path: 'permissions.allow', key: 'allow', type: 'array', winner: null,
      entries: [{ value: 'Bash(npm *)', scope: 'user', source: 'u', locked: false }] },
  ]);
  assert.match(html, /permissions\.allow/);
  assert.match(html, /Bash\(npm \*\)/);
});

test('merged rows escape hostile values', () => {
  const html = renderMergedRows(provider, [
    { path: '<script>x</script>', key: 'k', type: 'scalar', winner: 'user', value: '<img onerror=1>',
      locked: false, overrides: [{ scope: 'managed', value: '</style><b>', source: '<i>' }] },
  ]);
  assert.doesNotMatch(html, /<script>x/);
  assert.doesNotMatch(html, /<img onerror/);
  assert.doesNotMatch(html, /<\/style>/);
});

test('strata shows present and absent scopes', () => {
  const html = renderStrata(provider, [
    { scope: 'user', label: 'User global', present: true, parse: 'ok', path: '~/.claude/settings.json' },
    { scope: 'managed', label: 'Managed', present: false, parse: 'missing', path: '/x' },
  ]);
  assert.match(html, /User global/);
  assert.match(html, /absent/);
});

test('a malformed or unreadable layer is called out, not shown as healthy', () => {
  const html = renderStrata(provider, [
    { scope: 'user', label: 'User global', present: true, parse: 'malformed', path: '/u', error: 'Unexpected token' },
    { scope: 'managed', label: 'Managed', present: true, parse: 'unreadable', path: '/m', error: 'EACCES' },
  ]);
  assert.match(html, /layer broken/);
  assert.match(html, /malformed/);
  assert.match(html, /unreadable/);
  assert.match(html, /EACCES/);
});

test('a non-inspectable scope explains itself instead of reading as missing', () => {
  const html = renderStrata(provider, [
    { scope: 'cli', label: 'CLI flags', present: false, parse: 'n/a', path: '(session flags)',
      error: 'CLI flags are per-session and not inspectable after start' },
  ]);
  assert.match(html, /per-session/);
});
