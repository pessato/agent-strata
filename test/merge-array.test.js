import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig } from '../src/merge/index.js';
import { provider } from './helpers.js';

const layers = [
  { scope: 'managed', source: 'managed', settings: { permissions: { deny: ['Bash(curl *)'] } } },
  { scope: 'user', source: 'user', settings: { permissions: { allow: ['Bash(npm *)'] } } },
  { scope: 'project-shared', source: 'proj', settings: { permissions: { allow: ['Bash(npm *)', 'Edit(src/**)'] } } },
];

const merge = ls => mergeConfig(ls, provider);

test('array leaf is a union of entries tagged by source, deduped', () => {
  const allow = merge(layers).leaves.find(l => l.path === 'permissions.allow');
  assert.equal(allow.type, 'array');
  assert.deepEqual(allow.entries.map(e => e.value), ['Bash(npm *)', 'Edit(src/**)']);
  // duplicate kept the stronger scope (project-shared beats user)
  assert.equal(allow.entries.find(e => e.value === 'Bash(npm *)').scope, 'project-shared');
});

test('managed deny entries are locked', () => {
  const deny = merge(layers).leaves.find(l => l.path === 'permissions.deny');
  assert.equal(deny.entries[0].locked, true);
});

test('a deny list from a weaker scope is not locked', () => {
  const { leaves } = merge([
    { scope: 'user', source: 'u', settings: { permissions: { deny: ['Bash(rm *)'] } } },
  ]);
  assert.equal(leaves[0].entries[0].locked, false);
});

test('effective rebuilds arrays as flat value lists', () => {
  assert.deepEqual(merge(layers).effective.permissions.allow, ['Bash(npm *)', 'Edit(src/**)']);
});

test('a scalar colliding with an array is treated as a single entry, not split into characters', () => {
  const thing = merge([
    { scope: 'user', source: 'user', settings: { thing: 'scalar' } },
    { scope: 'project-shared', source: 'proj', settings: { thing: ['arrayval'] } },
  ]).leaves.find(l => l.path === 'thing');

  assert.equal(thing.type, 'array');
  // 'scalar' must appear whole — never iterated as 's','c','a','l','a','r'.
  assert.deepEqual(thing.entries.map(e => e.value), ['arrayval', 'scalar']);
});

test('object-valued array entries dedupe by content, not identity', () => {
  const { leaves } = merge([
    { scope: 'user', source: 'u', settings: { xs: [{ a: 1 }] } },
    { scope: 'project-shared', source: 'p', settings: { xs: [{ a: 1 }, { a: 2 }] } },
  ]);
  assert.deepEqual(leaves[0].entries.map(e => e.value), [{ a: 1 }, { a: 2 }]);
});
