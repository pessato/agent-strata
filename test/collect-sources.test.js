import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect } from '../src/collector/index.js';

function home() {
  const h = mkdtempSync(join(tmpdir(), 'home-'));
  mkdirSync(join(h, '.claude', 'agents'), { recursive: true });
  writeFileSync(join(h, '.claude', 'agents', 'reviewer.md'), '# reviewer');
  writeFileSync(join(h, '.claude', 'CLAUDE.md'), '# user memory');
  return h;
}

test('collect returns a full inventory with sources and env', () => {
  const inv = collect({
    platform: 'linux', home: home(), projectDir: mkdtempSync(join(tmpdir(), 'proj-')),
    env: { ANTHROPIC_MODEL: 'opus', PATH: '/x', IGNORED: 'no' },
  });
  assert.ok(inv.machine.timestamp);
  assert.equal(inv.sources.agents.some(a => a.label.includes('reviewer')), true);
  assert.equal(inv.sources.memory.some(m => m.present && m.scope === 'user'), true);
  // only Claude-relevant env vars captured
  assert.equal(inv.sources.env.ANTHROPIC_MODEL, 'opus');
  assert.equal('IGNORED' in inv.sources.env, false);
});
