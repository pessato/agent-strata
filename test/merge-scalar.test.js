import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig } from '../src/merge/index.js';

const layers = [
  { scope: 'managed', source: 'managed-settings.json', settings: { model: 'opus' } },
  { scope: 'user', source: '~/.claude/settings.json', settings: { model: 'sonnet', outputStyle: 'Explanatory' } },
];

test('higher-precedence scope wins; loser recorded as override', () => {
  const { leaves } = mergeConfig(layers);
  const model = leaves.find(l => l.path === 'model');
  assert.equal(model.type, 'scalar');
  assert.equal(model.winner, 'managed');
  assert.equal(model.value, 'opus');
  assert.equal(model.locked, true); // managed winner ⇒ locked
  assert.deepEqual(model.overrides, [{ scope: 'user', value: 'sonnet', source: '~/.claude/settings.json' }]);
});

test('value set in one scope has no overrides and is not locked', () => {
  const { leaves } = mergeConfig(layers);
  const os = leaves.find(l => l.path === 'outputStyle');
  assert.equal(os.winner, 'user');
  assert.equal(os.locked, false);
  assert.deepEqual(os.overrides, []);
});

test('effective object reconstructs nested winners', () => {
  const { effective } = mergeConfig(layers);
  assert.equal(effective.model, 'opus');
  assert.equal(effective.outputStyle, 'Explanatory');
});
