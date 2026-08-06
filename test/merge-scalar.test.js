import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig } from '../src/merge/index.js';
import { provider } from './helpers.js';

const layers = [
  { scope: 'managed', source: 'managed-settings.json', settings: { model: 'opus' } },
  { scope: 'user', source: '~/.claude/settings.json', settings: { model: 'sonnet', outputStyle: 'Explanatory' } },
];

const merge = ls => mergeConfig(ls, provider);

test('higher-precedence scope wins; loser recorded as override', () => {
  const model = merge(layers).leaves.find(l => l.path === 'model');
  assert.equal(model.type, 'scalar');
  assert.equal(model.winner, 'managed');
  assert.equal(model.value, 'opus');
  assert.equal(model.locked, true); // managed winner ⇒ locked
  assert.deepEqual(model.overrides, [{ scope: 'user', value: 'sonnet', source: '~/.claude/settings.json' }]);
});

test('value set in one scope has no overrides and is not locked', () => {
  const os = merge(layers).leaves.find(l => l.path === 'outputStyle');
  assert.equal(os.winner, 'user');
  assert.equal(os.locked, false);
  assert.deepEqual(os.overrides, []);
});

test('layer order in the input does not change the winner', () => {
  const reversed = merge([...layers].reverse()).leaves.find(l => l.path === 'model');
  assert.equal(reversed.winner, 'managed');
});

test('effective object reconstructs nested winners', () => {
  const { effective } = merge(layers);
  assert.equal(effective.model, 'opus');
  assert.equal(effective.outputStyle, 'Explanatory');
});

test('a key containing a dot is not split into nested objects', () => {
  const { effective, leaves } = merge([
    { scope: 'user', source: 'u', settings: { mcpServers: { 'my.server': 'stdio' } } },
  ]);
  assert.equal(effective.mcpServers['my.server'], 'stdio');
  assert.equal(effective.mcpServers.my, undefined);
  assert.equal(leaves[0].path, 'mcpServers.my.server');
});

test('a scalar and an object competing for the same branch do not corrupt the tree', () => {
  const { effective } = merge([
    { scope: 'user', source: 'u', settings: { a: 'scalar' } },
    { scope: 'project-shared', source: 'p', settings: { a: { b: 1 } } },
  ]);
  assert.equal(effective.a.b, 1);
});
