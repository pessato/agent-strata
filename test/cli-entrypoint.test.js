import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));

test('runs when invoked directly via node bin/cli.js', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ccv-direct-'));
  const out = join(dir, 'r.html');
  const stdout = execFileSync(process.execPath, [cli, '--out', out, '--project', dir], { encoding: 'utf8' });
  assert.match(stdout, /Wrote/);
  assert.ok(existsSync(out));
});

test('runs when invoked through a symlink (npm link / global install)', () => {
  // Reproduces the npm-link scenario: the bin is reached via a symlink, so
  // process.argv[1] is the symlink path while import.meta.url is the real target.
  const dir = mkdtempSync(join(tmpdir(), 'ccv-link-'));
  const link = join(dir, 'claude-config-view');
  symlinkSync(cli, link);
  const out = join(dir, 'r.html');
  const stdout = execFileSync(process.execPath, [link, '--out', out, '--project', dir], { encoding: 'utf8' });
  assert.match(stdout, /Wrote/);
  assert.ok(existsSync(out));
});
