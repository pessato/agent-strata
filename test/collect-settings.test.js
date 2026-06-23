import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectSettings } from '../src/collector/index.js';

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
  const { layers, scopes } = collectSettings({ platform: 'linux', home: makeHome(), projectDir: makeProject() });
  const userLayer = layers.find(l => l.scope === 'user');
  assert.deepEqual(userLayer.settings, { model: 'sonnet' });
  // user + project-shared present; managed + project-local missing; cli noted
  assert.equal(scopes.find(s => s.scope === 'user').present, true);
  assert.equal(scopes.find(s => s.scope === 'managed').present, false);
  assert.equal(scopes.find(s => s.scope === 'cli').present, false);
});
