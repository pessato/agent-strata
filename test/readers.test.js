import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson, listDir } from '../src/collector/readers.js';

const dir = mkdtempSync(join(tmpdir(), 'ccv-'));
writeFileSync(join(dir, 'ok.json'), '{"model":"opus"}');
writeFileSync(join(dir, 'bad.json'), '{nope');
mkdirSync(join(dir, 'agents'));
writeFileSync(join(dir, 'agents', 'a.md'), '# a');

test('readJson reports ok / missing / malformed', () => {
  assert.deepEqual(readJson(join(dir, 'ok.json')), { present: true, parse: 'ok', error: null, data: { model: 'opus' } });
  assert.equal(readJson(join(dir, 'nope.json')).parse, 'missing');
  const bad = readJson(join(dir, 'bad.json'));
  assert.equal(bad.parse, 'malformed');
  assert.ok(bad.error);
});

test('listDir returns entries or empty when absent', () => {
  assert.deepEqual(listDir(join(dir, 'agents')).map(e => e.name), ['a.md']);
  assert.deepEqual(listDir(join(dir, 'missing')), []);
});
