import { esc } from './html.js';

// renderSources(provider, sources) → HTML for every non-settings surface.
// Everything here is an inventory rather than a merge: these surfaces stack
// additively (every skill in every scope loads) instead of overriding, so there
// is no winner to compute — only a question of what is present.
export function renderSources(provider, sources = {}) {
  const s = sources ?? {};
  const ctx = { provider };
  return [
    memorySection(ctx, s.memory),
    listSection(ctx, 'Rules', s.rules),
    listSection(ctx, 'Subagents', s.agents),
    listSection(ctx, 'Slash commands', s.commands),
    listSection(ctx, 'Skills', s.skills),
    listSection(ctx, 'Output styles', s.outputStyles),
    mcpSection(ctx, s.mcp),
    hooksSection(ctx, s.hooks),
    pluginsSection(ctx, s.plugins),
    fileSection(ctx, 'Keybindings', s.keybindings, f => (f.parse === 'ok' ? 'custom' : f.parse)),
    fileSection(ctx, 'Worktree include', s.worktreeInclude,
      f => (f.data ? `${f.data.split('\n').filter(Boolean).length} entries` : '')),
    envSection(s.env),
  ].join('\n');
}

// A small scope badge (one letter), reusing the merged-row badge styling.
const badge = ({ provider }, scope) =>
  scope ? `<span class="src s-${esc(provider.shortOf(scope))}">${esc(String(scope)[0].toUpperCase())}</span>` : '';

// One list entry: optional scope badge, a label, and an optional right-aligned detail.
function item(ctx, scope, label, detail) {
  return `<div class="item">${badge(ctx, scope)}<span class="il">${esc(label)}</span>` +
    `${detail ? `<span class="id">${esc(detail)}</span>` : ''}</div>`;
}

// A section: header + count pill, then either the body rows or an empty placeholder.
function wrap(title, count, body, empty = 'none configured') {
  const pill = `<span class="pill${count ? '' : ' zero'}">${count}</span>`;
  const inner = count ? `<div class="items">${body}</div>` : `<div class="items empty">${esc(empty)}</div>`;
  return `<section class="srcsec"><div class="sec-h"><h3>${esc(title)}</h3>${pill}</div>${inner}</section>`;
}

// Directory-backed surfaces (agents, commands, skills, rules, output styles).
function listSection(ctx, title, list = [], empty) {
  const present = (list ?? []).filter(i => i.present !== false);
  return wrap(title, present.length, present.map(i => item(ctx, i.scope, i.label)).join(''), empty);
}

function memorySection(ctx, list = []) {
  const present = (list ?? []).filter(i => i.present);
  const body = present.map(i => item(ctx, i.scope, i.label, i.data ? `${i.data.length} chars` : '')).join('');
  return wrap('Memory · CLAUDE.md chain', present.length, body, 'no memory files');
}

function mcpSection(ctx, list = []) {
  const rows = [];
  for (const f of list ?? []) {
    if (!f.present) continue;
    if (f.parse !== 'ok') { rows.push(item(ctx, f.scope, f.label, `${f.parse} JSON`)); continue; }
    for (const name of Object.keys(f.data?.mcpServers ?? {})) rows.push(item(ctx, f.scope, name, f.label));
  }
  return wrap('MCP servers', rows.length, rows.join(''), 'no MCP servers');
}

// settings.hooks is keyed by event; each event holds a list of matchers, and each
// matcher holds its own hooks. Counting matchers would understate it, so the
// leaf commands are what get counted.
function hooksSection(ctx, list = []) {
  const rows = (list ?? []).map(h => {
    const matchers = Array.isArray(h.data) ? h.data : [];
    const n = matchers.reduce((sum, m) => sum + (Array.isArray(m?.hooks) ? m.hooks.length : 0), 0);
    return item(ctx, h.scope, h.label, `${n} hook${n === 1 ? '' : 's'}`);
  });
  return wrap('Hooks', rows.length, rows.join(''), 'no hooks');
}

// enabledPlugins maps name → boolean.
function pluginsSection(ctx, list = []) {
  const rows = (list ?? []).map(p => item(ctx, p.scope, p.label, p.data === false ? 'disabled' : 'enabled'));
  return wrap('Plugins', rows.length, rows.join(''), 'no plugins');
}

// Single-file surfaces (keybindings, worktree include).
function fileSection(ctx, title, file, detail, empty = 'not configured') {
  if (!file || !file.present) return wrap(title, 0, '', empty);
  return wrap(title, 1, item(ctx, file.scope, file.path, detail ? detail(file) : ''));
}

// Values arrive already redacted from the collector; this only lays them out.
function envSection(env = {}) {
  const keys = Object.keys(env ?? {});
  const toks = keys.map(k => `<span class="tok">${esc(k)}=${esc(String(env[k]))}</span>`).join('');
  return wrap('Environment variables', keys.length, `<div class="perm">${toks}</div>`, 'no agent-related env vars');
}
