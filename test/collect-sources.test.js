import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect } from '../src/collector/index.js';
import { REDACTED } from '../src/redact.js';
import { provider } from './helpers.js';

function home() {
  const h = mkdtempSync(join(tmpdir(), 'home-'));
  mkdirSync(join(h, '.claude', 'agents'), { recursive: true });
  writeFileSync(join(h, '.claude', 'agents', 'reviewer.md'), '# reviewer');
  writeFileSync(join(h, '.claude', 'CLAUDE.md'), '# user memory');
  return h;
}
const project = () => mkdtempSync(join(tmpdir(), 'proj-'));

test('collect returns a full inventory with sources and env', () => {
  const inv = collect({
    platform: 'linux', home: home(), projectDir: project(),
    env: { ANTHROPIC_MODEL: 'opus', PATH: '/x', IGNORED: 'no' },
  }, provider);

  assert.ok(inv.machine.timestamp);
  assert.equal(inv.provider.id, 'claude');
  assert.equal(inv.sources.agents.some(a => a.label.includes('reviewer')), true);
  assert.equal(inv.sources.memory.some(m => m.present && m.scope === 'user'), true);
  assert.equal(inv.sources.env.ANTHROPIC_MODEL, 'opus');
  assert.equal('IGNORED' in inv.sources.env, false);
});

test('a credential in the environment never reaches the inventory', () => {
  const inv = collect({
    platform: 'linux', home: home(), projectDir: project(),
    env: { ANTHROPIC_API_KEY: 'sk-ant-secret-value', ANTHROPIC_MODEL: 'opus' },
  }, provider);

  assert.equal(inv.sources.env.ANTHROPIC_API_KEY, REDACTED);
  assert.ok('ANTHROPIC_API_KEY' in inv.sources.env, 'the key itself stays visible');
  assert.doesNotMatch(JSON.stringify(inv), /sk-ant-secret-value/);
});

test('hooks and plugins are read out of the settings layers', () => {
  const proj = project();
  mkdirSync(join(proj, '.claude'), { recursive: true });
  writeFileSync(join(proj, '.claude', 'settings.json'), JSON.stringify({
    hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo' }] }] },
    enabledPlugins: { superpowers: true },
  }));

  const inv = collect({ platform: 'linux', home: home(), projectDir: proj, env: {} }, provider);
  assert.equal(inv.sources.hooks[0].label, 'PreToolUse');
  assert.equal(inv.sources.hooks[0].scope, 'project-shared');
  assert.equal(inv.sources.plugins[0].label, 'superpowers');
  assert.equal(inv.sources.plugins[0].data, true);
});
