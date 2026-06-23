import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRECEDENCE, rank } from '../src/precedence.js';

test('managed is strongest, plugin is weakest', () => {
  assert.equal(rank('managed'), 0);
  assert.ok(rank('plugin') > rank('user'));
  assert.equal(PRECEDENCE.length, 6);
});
