import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../bin/cli.js';

test('parseArgs reads --out, --project, --open with defaults', () => {
  assert.deepEqual(parseArgs([]), { out: 'claude-config-report.html', project: process.cwd(), open: false });
  const a = parseArgs(['--out', 'r.html', '--project', '/p', '--open']);
  assert.deepEqual(a, { out: 'r.html', project: '/p', open: true });
});
