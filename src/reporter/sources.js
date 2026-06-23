import { esc, SHORT_SCOPE } from './html.js';

// A small scope badge (one letter), reusing the merged-row badge styling.
const badge = scope =>
  scope ? `<span class="src s-${SHORT_SCOPE[scope] ?? 'user'}">${esc(String(scope)[0].toUpperCase())}</span>` : '';

// One list entry: optional scope badge, a label, and an optional right-aligned detail.
function item(scope, label, detail) {
  return `<div class="item">${badge(scope)}<span class="il">${esc(label)}</span>` +
    `${detail ? `<span class="id">${esc(detail)}</span>` : ''}</div>`;
}

// A section: header + count pill, then either the body rows or an empty placeholder.
function wrap(title, count, body, empty = 'none configured') {
  const pill = count
    ? `<span class="pill">${count}</span>`
    : `<span class="pill" style="opacity:.4">0</span>`;
  const inner = count ? `<div class="items">${body}</div>` : `<div class="items empty">${esc(empty)}</div>`;
  return `<section class="srcsec"><div class="sec-h"><h3>${esc(title)}</h3>${pill}</div>${inner}</section>`;
}

// Directory-backed surfaces (agents, commands, skills, rules, output styles).
function listSection(title, list = [], empty) {
  const present = (list ?? []).filter(i => i.present !== false);
  return wrap(title, present.length, present.map(i => item(i.scope, i.label)).join(''), empty);
}

function memorySection(list = []) {
  const present = (list ?? []).filter(i => i.present);
  const body = present.map(i => item(i.scope, i.label, i.data ? `${i.data.length} chars` : '')).join('');
  return wrap('Memory · CLAUDE.md chain', present.length, body, 'no memory files');
}

function mcpSection(list = []) {
  const rows = [];
  for (const f of list ?? []) {
    if (!f.present) continue;
    if (f.parse === 'malformed') { rows.push(item(f.scope, f.label, 'malformed JSON')); continue; }
    const servers = f.data && f.data.mcpServers ? Object.keys(f.data.mcpServers) : [];
    for (const name of servers) rows.push(item(f.scope, name, f.label));
  }
  return wrap('MCP servers', rows.length, rows.join(''), 'no MCP servers');
}

function hooksSection(list = []) {
  const rows = (list ?? []).map(h => {
    const n = Array.isArray(h.data) ? h.data.length : (h.data ? 1 : 0);
    return item(h.scope, h.label, `${n} hook${n === 1 ? '' : 's'}`);
  });
  return wrap('Hooks', rows.length, rows.join(''), 'no hooks');
}

function pluginsSection(list = []) {
  const rows = (list ?? []).map(p => item(p.scope, p.label, p.data && p.data.enabled ? 'enabled' : 'disabled'));
  return wrap('Plugins', rows.length, rows.join(''), 'no plugins');
}

// Single-file surfaces (keybindings, worktree include).
function fileSection(title, file, detail, empty = 'not configured') {
  if (!file || !file.present) return wrap(title, 0, '', empty);
  return wrap(title, 1, item(file.scope, file.path, detail ? detail(file) : ''));
}

function envSection(env = {}) {
  const keys = Object.keys(env ?? {});
  const toks = keys.map(k => `<span class="tok">${esc(k)}=${esc(String(env[k]))}</span>`).join('');
  return wrap('Environment variables', keys.length, `<div class="perm">${toks}</div>`, 'no Claude-related env vars');
}

// renderSources(sources) → HTML for every non-settings surface in the inventory.
export function renderSources(sources = {}) {
  const s = sources ?? {};
  return [
    memorySection(s.memory),
    listSection('Rules', s.rules),
    listSection('Subagents', s.agents),
    listSection('Slash commands', s.commands),
    listSection('Skills', s.skills),
    listSection('Output styles', s.outputStyles),
    mcpSection(s.mcp),
    hooksSection(s.hooks),
    pluginsSection(s.plugins),
    fileSection('Keybindings', s.keybindings, f => (f.parse === 'ok' ? 'custom' : f.parse)),
    fileSection('Worktree include', s.worktreeInclude,
      f => (f.data ? `${f.data.split('\n').filter(Boolean).length} entries` : '')),
    envSection(s.env),
  ].join('\n');
}
