import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));

test('runs when invoked directly via node bin/cli.js', () => {
  const dir = mkdtempSync(join(tmpdir(), 'strata-direct-'));
  const out = join(dir, 'r.html');
  const stdout = execFileSync(process.execPath, [cli, '--out', out, '--project', dir], { encoding: 'utf8' });
  assert.match(stdout, /Wrote/);
  assert.ok(existsSync(out));
});

test('runs when invoked through a symlink (npm link / global install)', () => {
  // Reproduces the npm-link scenario: the bin is reached via a symlink, so
  // process.argv[1] is the symlink path while import.meta.url is the real target.
  const dir = mkdtempSync(join(tmpdir(), 'strata-link-'));
  const link = join(dir, 'agent-strata');
  symlinkSync(cli, link);
  const out = join(dir, 'r.html');
  const stdout = execFileSync(process.execPath, [link, '--out', out, '--project', dir], { encoding: 'utf8' });
  assert.match(stdout, /Wrote/);
  assert.ok(existsSync(out));
});

test('--help exits 0 and prints usage', () => {
  const stdout = execFileSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.match(stdout, /Usage/);
  assert.match(stdout, /--provider/);
});

test('a bad flag exits non-zero and explains itself on stderr', () => {
  const r = spawnResult([cli, '--nope']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unknown option "--nope"/);
  assert.match(r.stderr, /--help/);
  assert.equal(r.stdout.trim(), '', 'nothing should be written to stdout on failure');
});

function spawnResult(args) {
  try {
    const stdout = execFileSync(process.execPath, args, { encoding: 'utf8', stdio: 'pipe' });
    return { status: 0, stdout, stderr: '' };
  } catch (e) {
    return { status: e.status, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}
