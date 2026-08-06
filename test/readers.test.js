import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson, readText, listDir } from '../src/collector/readers.js';

const dir = mkdtempSync(join(tmpdir(), 'strata-'));
writeFileSync(join(dir, 'ok.json'), '{"model":"opus"}');
writeFileSync(join(dir, 'bad.json'), '{nope');
mkdirSync(join(dir, 'agents'));
writeFileSync(join(dir, 'agents', 'a.md'), '# a');

test('readJson reports ok / missing / malformed', () => {
  assert.deepEqual(readJson(join(dir, 'ok.json')),
    { present: true, parse: 'ok', error: null, data: { model: 'opus' } });
  assert.equal(readJson(join(dir, 'nope.json')).parse, 'missing');
  const bad = readJson(join(dir, 'bad.json'));
  assert.equal(bad.parse, 'malformed');
  assert.ok(bad.error);
});

test('a file that exists but cannot be read is unreadable, not missing',
  { skip: process.getuid?.() === 0 }, () => {
    const f = join(dir, 'locked.json');
    writeFileSync(f, '{"a":1}');
    chmodSync(f, 0o000);

    const r = readJson(f);
    assert.equal(r.parse, 'unreadable');
    assert.equal(r.present, true);
    assert.ok(r.error);
    chmodSync(f, 0o600);
  });

test('readText mirrors the same states', () => {
  assert.equal(readText(join(dir, 'ok.json')).parse, 'ok');
  assert.equal(readText(join(dir, 'nope.md')).parse, 'missing');
  assert.equal(readText(join(dir, 'nope.md')).present, false);
});

test('listDir returns entries or empty when absent', () => {
  assert.deepEqual(listDir(join(dir, 'agents')).map(e => e.name), ['a.md']);
  assert.deepEqual(listDir(join(dir, 'missing')), []);
});
