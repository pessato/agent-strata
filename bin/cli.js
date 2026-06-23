#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { collect } from '../src/collector/index.js';
import { mergeConfig } from '../src/merge/index.js';
import { renderReport } from '../src/reporter/index.js';

export function parseArgs(argv) {
  const out = { out: 'claude-config-report.html', project: process.cwd(), open: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out.out = argv[++i];
    else if (argv[i] === '--project') out.project = argv[++i];
    else if (argv[i] === '--open') out.open = true;
  }
  return out;
}

export function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const inventory = collect({
    platform: process.platform,
    home: homedir(),
    projectDir: resolve(args.project),
    env: process.env,
  });
  const merged = mergeConfig(inventory.layers);
  const html = renderReport(inventory, merged);
  const outPath = resolve(args.out);
  writeFileSync(outPath, html);
  console.log(`Wrote ${outPath}`);
  return outPath;
}

// Only run when invoked directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) run();
