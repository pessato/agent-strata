import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, run, USAGE } from '../bin/cli.js';

test('parseArgs applies defaults', () => {
  assert.deepEqual(parseArgs([]), {
    out: 'strata-report.html', project: process.cwd(), provider: 'claude',
    open: false, help: false, version: false,
  });
});

test('parseArgs reads every option', () => {
  const a = parseArgs(['--out', 'r.html', '--project', '/p', '--provider', 'claude', '--open']);
  assert.equal(a.out, 'r.html');
  assert.equal(a.project, '/p');
  assert.equal(a.provider, 'claude');
  assert.equal(a.open, true);
});

test('a value flag left without a value fails clearly instead of crashing later', () => {
  // `--out` last on the line used to yield undefined and blow up inside resolve().
  assert.throws(() => parseArgs(['--out']), /--out needs a value/);
  assert.throws(() => parseArgs(['--out', '--open']), /--out needs a value/);
});

test('an unknown option is rejected rather than silently ignored', () => {
  assert.throws(() => parseArgs(['--opne']), /unknown option "--opne"/);
  assert.throws(() => parseArgs(['nonsense']), /unknown option "nonsense"/);
});

test('--help and --version short-circuit without writing a report', () => {
  const lines = [];
  const log = m => lines.push(m);

  assert.equal(run(['--help'], { log }), null);
  assert.match(lines[0], /Usage/);
  assert.equal(lines[0], USAGE);

  lines.length = 0;
  assert.equal(run(['--version'], { log }), null);
  assert.match(lines[0], /^\d+\.\d+\.\d+/);
});

test('an unknown provider is reported by name', () => {
  assert.throws(() => run(['--provider', 'nope'], { log() {} }), /unknown provider "nope"/);
});
