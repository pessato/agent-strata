import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectSettings } from '../src/collector/index.js';
import { provider, NO_CHMOD } from './helpers.js';

function makeHome() {
  const home = mkdtempSync(join(tmpdir(), 'home-'));
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(join(home, '.claude', 'settings.json'), '{"model":"sonnet"}');
  return home;
}
function makeProject() {
  const proj = mkdtempSync(join(tmpdir(), 'proj-'));
  mkdirSync(join(proj, '.claude'), { recursive: true });
  writeFileSync(join(proj, '.claude', 'settings.json'), '{"outputStyle":"Explanatory"}');
  return proj;
}

test('builds layers for present settings files and scope status for all', () => {
  const { layers, scopes } = collectSettings(
    { platform: 'linux', home: makeHome(), projectDir: makeProject() }, provider);
  assert.deepEqual(layers.find(l => l.scope === 'user').settings, { model: 'sonnet' });
  assert.equal(scopes.find(s => s.scope === 'user').present, true);
  assert.equal(scopes.find(s => s.scope === 'managed').present, false);
  assert.equal(scopes.find(s => s.scope === 'cli').present, false);
});

test('scopes come back in precedence order, strongest first', () => {
  const { scopes } = collectSettings(
    { platform: 'linux', home: makeHome(), projectDir: makeProject() }, provider);
  const ranks = scopes.map(s => provider.rank(s.scope));
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
});

test('a malformed layer is reported and excluded from the merge', () => {
  const proj = mkdtempSync(join(tmpdir(), 'proj-'));
  mkdirSync(join(proj, '.claude'), { recursive: true });
  writeFileSync(join(proj, '.claude', 'settings.json'), '{oops');

  const { layers, scopes } = collectSettings(
    { platform: 'linux', home: makeHome(), projectDir: proj }, provider);
  const shared = scopes.find(s => s.scope === 'project-shared');
  assert.equal(shared.parse, 'malformed');
  assert.ok(shared.error);
  assert.equal(layers.some(l => l.scope === 'project-shared'), false);
});

test('an unreadable layer is not misreported as absent', { skip: NO_CHMOD }, () => {
  const proj = mkdtempSync(join(tmpdir(), 'proj-'));
  mkdirSync(join(proj, '.claude'), { recursive: true });
  const f = join(proj, '.claude', 'settings.json');
  writeFileSync(f, '{"model":"opus"}');
  chmodSync(f, 0o000);

  const { scopes } = collectSettings(
    { platform: 'linux', home: makeHome(), projectDir: proj }, provider);
  const shared = scopes.find(s => s.scope === 'project-shared');
  // "not present" would tell the user their project config is gone when it is
  // merely locked down.
  assert.equal(shared.parse, 'unreadable');
  assert.equal(shared.present, true);
  chmodSync(f, 0o600);
});
