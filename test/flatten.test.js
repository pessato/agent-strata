import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flatten } from '../src/merge/flatten.js';

test('scalars and nested objects flatten to dot paths', () => {
  const leaves = flatten({ model: 'opus', git: { includeCoAuthoredBy: true } });
  assert.deepEqual(leaves, [
    { path: 'model', segments: ['model'], key: 'model', value: 'opus', isArray: false },
    { path: 'git.includeCoAuthoredBy', segments: ['git', 'includeCoAuthoredBy'], key: 'includeCoAuthoredBy', value: true, isArray: false },
  ]);
});

test('arrays are leaves, not recursed', () => {
  const leaves = flatten({ permissions: { allow: ['Bash(ls)'] } });
  assert.deepEqual(leaves, [
    { path: 'permissions.allow', segments: ['permissions', 'allow'], key: 'allow', value: ['Bash(ls)'], isArray: true },
  ]);
});

test('a key containing a dot stays a single segment', () => {
  const [leaf] = flatten({ mcpServers: { 'my.server': 'x' } });
  assert.deepEqual(leaf.segments, ['mcpServers', 'my.server']);
  assert.equal(leaf.key, 'my.server');
});
