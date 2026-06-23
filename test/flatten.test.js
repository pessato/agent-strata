import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flatten } from '../src/merge/flatten.js';

test('scalars and nested objects flatten to dot paths', () => {
  const leaves = flatten({ model: 'opus', git: { includeCoAuthoredBy: true } });
  assert.deepEqual(leaves, [
    { path: 'model', value: 'opus', isArray: false },
    { path: 'git.includeCoAuthoredBy', value: true, isArray: false },
  ]);
});

test('arrays are leaves, not recursed', () => {
  const leaves = flatten({ permissions: { allow: ['Bash(ls)'] } });
  assert.deepEqual(leaves, [
    { path: 'permissions.allow', value: ['Bash(ls)'], isArray: true },
  ]);
});
