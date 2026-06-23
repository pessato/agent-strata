import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig } from '../src/merge/index.js';

const layers = [
  { scope: 'managed', source: 'managed', settings: { permissions: { deny: ['Bash(curl *)'] } } },
  { scope: 'user', source: 'user', settings: { permissions: { allow: ['Bash(npm *)'] } } },
  { scope: 'project-shared', source: 'proj', settings: { permissions: { allow: ['Bash(npm *)', 'Edit(src/**)'] } } },
];

test('array leaf is a union of entries tagged by source, deduped', () => {
  const { leaves } = mergeConfig(layers);
  const allow = leaves.find(l => l.path === 'permissions.allow');
  assert.equal(allow.type, 'array');
  const values = allow.entries.map(e => e.value);
  assert.deepEqual(values, ['Bash(npm *)', 'Edit(src/**)']); // deduped, order preserved
  // duplicate kept the stronger scope (project-shared beats user)
  assert.equal(allow.entries.find(e => e.value === 'Bash(npm *)').scope, 'project-shared');
});

test('managed deny entries are locked', () => {
  const { leaves } = mergeConfig(layers);
  const deny = leaves.find(l => l.path === 'permissions.deny');
  assert.equal(deny.entries[0].locked, true);
});

test('effective rebuilds arrays as flat value lists', () => {
  const { effective } = mergeConfig(layers);
  assert.deepEqual(effective.permissions.allow, ['Bash(npm *)', 'Edit(src/**)']);
});

test('a scalar colliding with an array is treated as a single entry, not split into characters', () => {
  const mixed = [
    { scope: 'user', source: 'user', settings: { thing: 'scalar' } },
    { scope: 'project-shared', source: 'proj', settings: { thing: ['arrayval'] } },
  ];
  const { leaves } = mergeConfig(mixed);
  const thing = leaves.find(l => l.path === 'thing');
  assert.equal(thing.type, 'array');
  // The scalar 'scalar' must appear whole — never iterated as 's','c','a','l','r'.
  const values = thing.entries.map(e => e.value);
  assert.deepEqual(values, ['arrayval', 'scalar']); // stronger scope (project-shared) first
});
