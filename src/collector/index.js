import { join } from 'node:path';
import { hostname } from 'node:os';
import { settingsPaths, sourceDirs, sourceFiles } from './paths.js';
import { readJson, readText, listDir } from './readers.js';
import { SCOPE_LABELS } from '../precedence.js';

// collectSettings({platform, home, projectDir}) → { layers, scopes }
export function collectSettings(ctx) {
  const paths = settingsPaths(ctx);
  const scopes = [];
  const layers = [];

  for (const scope of ['managed', 'project-local', 'project-shared', 'user']) {
    const path = paths[scope];
    const r = readJson(path);
    scopes.push({ scope, label: SCOPE_LABELS[scope], path, present: r.present, parse: r.parse, error: r.error, settings: r.data });
    if (r.parse === 'ok' && r.data && typeof r.data === 'object') {
      layers.push({ scope, source: path, settings: r.data });
    }
  }

  // CLI flags: documented scope, not recoverable from a static run.
  scopes.splice(1, 0, { scope: 'cli', label: SCOPE_LABELS.cli, path: '(session flags)', present: false, parse: 'n/a', error: 'CLI flags are per-session and not inspectable after start', settings: null });

  return { layers, scopes };
}

const ENV_PREFIXES = ['ANTHROPIC_', 'CLAUDE_', 'CLAUDECODE'];
const ENV_EXACT = ['API_TIMEOUT_MS', 'BASH_DEFAULT_TIMEOUT_MS', 'MAX_THINKING_TOKENS',
  'DISABLE_AUTOUPDATER', 'DISABLE_TELEMETRY', 'DISABLE_AUTOCOMPACT'];

function pickEnv(env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    if (ENV_PREFIXES.some(p => k.startsWith(p)) || ENV_EXACT.includes(k)) out[k] = v;
  }
  return out;
}

function dirItems(scope, dir) {
  return listDir(dir).map(e => ({
    scope, label: e.name, path: join(dir, e.name), present: true, parse: 'ok', error: null, data: null,
  }));
}

// collect({platform, home, projectDir, env}) → Inventory
export function collect(ctx) {
  const { layers, scopes } = collectSettings(ctx);
  const dirs = sourceDirs(ctx);
  const files = sourceFiles(ctx);

  const collectDirs = key => dirs[key].flatMap(d => dirItems(d.scope, d.path));

  const memory = [
    { scope: 'user', label: '~/.claude/CLAUDE.md', path: files.userMemory, ...textItem(files.userMemory) },
    { scope: 'project-shared', label: './CLAUDE.md', path: files.projectMemory, ...textItem(files.projectMemory) },
    { scope: 'project-local', label: './CLAUDE.local.md', path: files.projectMemoryLocal, ...textItem(files.projectMemoryLocal) },
  ];

  const mcp = [
    { scope: 'user', label: '~/.claude.json', path: files.userMcp, ...jsonItem(files.userMcp) },
    { scope: 'project-shared', label: './.mcp.json', path: files.projectMcp, ...jsonItem(files.projectMcp) },
  ];

  const sources = {
    memory,
    rules: collectDirs('rules'),
    agents: collectDirs('agents'),
    commands: collectDirs('commands'),
    skills: collectDirs('skills'),
    outputStyles: collectDirs('outputStyles'),
    mcp,
    hooks: hooksFromLayers(layers),
    plugins: pluginsFromLayers(layers),
    keybindings: { path: files.keybindings, ...jsonItem(files.keybindings) },
    worktreeInclude: { path: files.worktreeInclude, ...textItem(files.worktreeInclude) },
    env: pickEnv(ctx.env ?? {}),
  };

  return {
    machine: {
      hostname: ctx.hostname ?? safeHostname(),
      platform: ctx.platform,
      cwd: ctx.projectDir,
      projectDir: ctx.projectDir,
      timestamp: ctx.now ?? new Date().toISOString(),
    },
    layers, scopes, sources,
  };
}

function textItem(path) { const r = readText(path); return { present: r.present, parse: r.present ? 'ok' : 'missing', error: r.error, data: r.data }; }
function jsonItem(path) { const r = readJson(path); return { present: r.present, parse: r.parse, error: r.error, data: r.data }; }
function safeHostname() { try { return hostname(); } catch { return 'unknown'; } }

// Hooks declared inside any settings layer.
function hooksFromLayers(layers) {
  const out = [];
  for (const l of layers) {
    for (const event of Object.keys(l.settings.hooks ?? {})) {
      out.push({ scope: l.scope, label: event, path: l.source, present: true, parse: 'ok', error: null, data: l.settings.hooks[event] });
    }
  }
  return out;
}

// enabledPlugins map declared in any settings layer.
function pluginsFromLayers(layers) {
  const out = [];
  for (const l of layers) {
    for (const [name, enabled] of Object.entries(l.settings.enabledPlugins ?? {})) {
      out.push({ scope: l.scope, label: name, path: l.source, present: true, parse: 'ok', error: null, data: { enabled } });
    }
  }
  return out;
}
