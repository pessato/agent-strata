import { join } from 'node:path';
import { hostname } from 'node:os';
import { readJson, readText, listDir } from './readers.js';
import { redactEnv } from '../redact.js';

// collectSettings(ctx, provider) → { layers, scopes }
// `scopes` is every precedence layer in order, present or not — the report shows
// absent ones too, since "no project settings here" is itself the answer to a
// lot of questions. `layers` is the subset that parsed and can actually merge.
export function collectSettings(ctx, provider) {
  const paths = provider.settingsPaths(ctx);
  const scopes = [];
  const layers = [];

  for (const id of provider.order) {
    const virtual = provider.virtualScopes?.[id];
    if (virtual) {
      scopes.push({
        scope: id, label: provider.labelOf(id), path: virtual.path,
        present: false, parse: 'n/a', error: virtual.reason, settings: null,
      });
      continue;
    }
    if (!provider.fileScopes.includes(id)) continue;

    const path = paths[id];
    const r = readJson(path);
    scopes.push({
      scope: id, label: provider.labelOf(id), path,
      present: r.present, parse: r.parse, error: r.error, settings: r.data,
    });
    if (r.parse === 'ok' && r.data && typeof r.data === 'object') {
      layers.push({ scope: id, source: path, settings: r.data });
    }
  }

  return { layers, scopes };
}

function pickEnv(env, { prefixes, exact }) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    if (prefixes.some(p => k.startsWith(p)) || exact.includes(k)) out[k] = v;
  }
  return redactEnv(out);
}

function dirItems(scope, dir) {
  return listDir(dir).map(e => ({
    scope, label: e.name, path: join(dir, e.name), present: true, parse: 'ok', error: null, data: null,
  }));
}

const textItem = path => { const r = readText(path); return { present: r.present, parse: r.parse, error: r.error, data: r.data }; };
const jsonItem = path => { const r = readJson(path); return { present: r.present, parse: r.parse, error: r.error, data: r.data }; };
const safeHostname = () => { try { return hostname(); } catch { return 'unknown'; } };

// Hooks and plugins are declared inside settings rather than in their own files,
// so they are read back out of the parsed layers instead of off disk.
function fromLayers(layers, pick) {
  const out = [];
  for (const l of layers) {
    for (const [label, data] of Object.entries(pick(l.settings) ?? {})) {
      out.push({ scope: l.scope, label, path: l.source, present: true, parse: 'ok', error: null, data });
    }
  }
  return out;
}

// collect({platform, home, projectDir, env}, provider) → Inventory
export function collect(ctx, provider) {
  const { layers, scopes } = collectSettings(ctx, provider);
  const dirs = provider.sourceDirs(ctx);
  const files = provider.sourceFiles(ctx);

  const collectDirs = key => (dirs[key] ?? []).flatMap(d => dirItems(d.scope, d.path));
  const fileList = (specs, read) => specs.map(s =>
    ({ scope: s.scope, label: s.label, path: files[s.key], ...read(files[s.key]) }));

  const sources = {
    memory: fileList(provider.memoryFiles, textItem),
    rules: collectDirs('rules'),
    agents: collectDirs('agents'),
    commands: collectDirs('commands'),
    skills: collectDirs('skills'),
    outputStyles: collectDirs('outputStyles'),
    mcp: fileList(provider.mcpFiles, jsonItem),
    hooks: fromLayers(layers, s => s.hooks),
    plugins: fromLayers(layers, s => s.enabledPlugins),
    keybindings: { path: files.keybindings, ...jsonItem(files.keybindings) },
    worktreeInclude: { path: files.worktreeInclude, ...textItem(files.worktreeInclude) },
    env: pickEnv(ctx.env ?? {}, provider.env),
  };

  return {
    provider: { id: provider.id, label: provider.label },
    machine: {
      hostname: ctx.hostname ?? safeHostname(),
      platform: ctx.platform,
      projectDir: ctx.projectDir,
      timestamp: ctx.now ?? new Date().toISOString(),
    },
    layers, scopes, sources,
  };
}
