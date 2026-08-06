import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderReport } from '../src/reporter/index.js';
import { provider } from './helpers.js';

const inventory = {
  provider: { id: 'claude', label: 'Claude Code' },
  machine: { hostname: 'mac', platform: 'darwin', projectDir: '/proj', timestamp: '2026-06-23T00:00:00Z' },
  scopes: [{ scope: 'user', label: 'User global', present: true, parse: 'ok', path: '~/.claude/settings.json' }],
  sources: {
    env: { ANTHROPIC_MODEL: 'opus' }, memory: [], agents: [], skills: [], commands: [], mcp: [],
    hooks: [], plugins: [], rules: [], outputStyles: [], keybindings: null, worktreeInclude: null,
  },
  layers: [],
};
const merged = {
  effective: {},
  leaves: [{ path: 'model', key: 'model', type: 'scalar', winner: 'user', value: 'opus', locked: false, overrides: [] }],
};

test('renderReport produces a single self-contained HTML document', () => {
  const html = renderReport(inventory, merged, provider);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<style>/);                 // CSS inlined
  assert.doesNotMatch(html, /<link |src="http/); // no external requests
  assert.match(html, /model/);                   // a merged row rendered
  assert.match(html, /mac/);                     // machine meta
});

test('renderReport includes the collected-sources sections', () => {
  const html = renderReport(inventory, merged, provider);
  assert.match(html, /All configured sources/);
  assert.match(html, /Environment variables/);
  assert.match(html, /ANTHROPIC_MODEL=opus/);
  assert.match(html, /Memory/);
});

test('scope colours are generated from the provider, so every scope can be styled', () => {
  const html = renderReport(inventory, merged, provider);
  for (const s of provider.scopes) {
    assert.ok(html.includes(`--${s.short}:${s.color}`), `missing colour var for ${s.id}`);
    assert.ok(html.includes(`.s-${s.short}{`), `missing badge rule for ${s.id}`);
  }
});

test('the report names the provider it inspected', () => {
  const html = renderReport(inventory, merged, provider);
  assert.match(html, /Claude Code/);
  assert.match(html, /<title>agent-strata/);
});
