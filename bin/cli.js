#!/usr/bin/env node
import { writeFileSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { collect } from '../src/collector/index.js';
import { mergeConfig } from '../src/merge/index.js';
import { renderReport } from '../src/reporter/index.js';
import { resolveProvider, PROVIDER_IDS } from '../src/providers/index.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export const USAGE = `agent-strata ${pkg.version} — see every layer of your coding agent's config, and which one wins.

Usage
  agent-strata [options]

Options
  --out <path>       Write the report here (default: strata-report.html)
  --project <dir>    Project root to inspect (default: current directory)
  --provider <id>    Agent to inspect: ${PROVIDER_IDS.join(', ')} (default: claude)
  --open             Open the report in your default browser
  -h, --help         Show this help
  -v, --version      Show the version

Read-only: it never writes to your agent's configuration.`;

const VALUE_FLAGS = { '--out': 'out', '--project': 'project', '--provider': 'provider' };

// parseArgs(argv) → options. Throws on anything it does not understand, so a
// typo'd flag fails loudly instead of silently producing a default report.
export function parseArgs(argv) {
  const out = { out: 'strata-report.html', project: process.cwd(), provider: 'claude', open: false, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const key = VALUE_FLAGS[arg];
    if (key) {
      const value = argv[++i];
      // Without this, `--out` as the final argument silently yields undefined
      // and blows up later in resolve() with an unreadable stack trace.
      if (value === undefined || value.startsWith('--')) {
        throw new Error(`${arg} needs a value`);
      }
      out[key] = value;
    } else if (arg === '--open') out.open = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--version' || arg === '-v') out.version = true;
    else throw new Error(`unknown option "${arg}"`);
  }
  return out;
}

export function run(argv = process.argv.slice(2), { log = console.log } = {}) {
  const args = parseArgs(argv);
  if (args.help) { log(USAGE); return null; }
  if (args.version) { log(pkg.version); return null; }

  const provider = resolveProvider(args.provider);
  const inventory = collect({
    platform: process.platform,
    home: homedir(),
    projectDir: resolve(args.project),
    env: process.env,
  }, provider);
  const merged = mergeConfig(inventory.layers, provider);

  const outPath = resolve(args.out);
  writeFileSync(outPath, renderReport(inventory, merged, provider));
  log(`Wrote ${outPath}`);
  if (args.open) openInBrowser(outPath);
  return outPath;
}

// Open a file in the OS default application, detached. Best-effort: failures are
// non-fatal (the report is already written and its path was printed).
export function openInBrowser(path, platform = process.platform) {
  const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
  try {
    const child = spawn(cmd, [path], { stdio: 'ignore', detached: true, shell: platform === 'win32' });
    child.on('error', () => {});
    child.unref();
  } catch {
    // ignore — opening is a convenience, not a requirement
  }
}

// Run when invoked directly — including via a symlinked bin from `npm link` or a
// global install — but not when imported by tests. Comparing resolved realpaths
// handles the symlink case, where process.argv[1] is the symlink path while
// import.meta.url is the resolved target. pathToFileURL encodes the path the same
// way import.meta.url does (spaces, etc.).
function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  try {
    run();
  } catch (e) {
    console.error(`agent-strata: ${e.message}`);
    console.error(`\nRun \`agent-strata --help\` for usage.`);
    process.exit(1);
  }
}
