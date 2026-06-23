import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMergedRows, renderStrata } from '../src/reporter/sections.js';

test('scalar row shows key, value, source, and collapsed overrides', () => {
  const html = renderMergedRows([
    { path: 'model', type: 'scalar', winner: 'managed', value: 'opus', locked: true,
      overrides: [{ scope: 'user', value: 'sonnet', source: '~/.claude/settings.json' }] },
  ]);
  assert.match(html, /model/);
  assert.match(html, /opus/);
  assert.match(html, /1 override/);
  assert.match(html, /<s>sonnet<\/s>|sonnet/);
  assert.match(html, /locked/);
});

test('array row renders union tokens', () => {
  const html = renderMergedRows([
    { path: 'permissions.allow', type: 'array', winner: null,
      entries: [{ value: 'Bash(npm *)', scope: 'user', source: 'u', locked: false }] },
  ]);
  assert.match(html, /permissions\.allow/);
  assert.match(html, /Bash\(npm \*\)/);
});

test('strata shows present and absent scopes', () => {
  const html = renderStrata([
    { scope: 'user', label: 'User global', present: true, path: '~/.claude/settings.json' },
    { scope: 'managed', label: 'Managed', present: false, path: '/x' },
  ]);
  assert.match(html, /User global/);
  assert.match(html, /absent/);
});
