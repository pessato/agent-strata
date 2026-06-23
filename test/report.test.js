import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderReport } from '../src/reporter/index.js';

const inventory = {
  machine: { hostname: 'mac', platform: 'darwin', projectDir: '/proj', timestamp: '2026-06-23T00:00:00Z' },
  scopes: [{ scope: 'user', label: 'User global', present: true, path: '~/.claude/settings.json' }],
  sources: { env: { ANTHROPIC_MODEL: 'opus' }, memory: [], agents: [], skills: [], commands: [], mcp: [], hooks: [], plugins: [], rules: [], outputStyles: [], keybindings: null, worktreeInclude: null },
  layers: [],
};
const merged = { effective: {}, leaves: [{ path: 'model', type: 'scalar', winner: 'user', value: 'opus', locked: false, overrides: [] }] };

test('renderReport produces a single self-contained HTML document', () => {
  const html = renderReport(inventory, merged);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<style>/);            // CSS inlined
  assert.doesNotMatch(html, /<link |src="http/); // no external requests
  assert.match(html, /model/);              // a merged row rendered
  assert.match(html, /mac/);                // machine meta
});

test('renderReport includes the collected-sources sections', () => {
  const html = renderReport(inventory, merged);
  assert.match(html, /All configured sources/);
  assert.match(html, /Environment variables/);
  assert.match(html, /ANTHROPIC_MODEL=opus/);   // env value surfaced
  assert.match(html, /Memory/);                 // a source section header
});
