import { esc, spine } from './html.js';

const badge = (provider, scope) =>
  `<span class="src s-${esc(provider.shortOf(scope))}">${esc(String(scope ?? '?')[0].toUpperCase())}</span>`;

export function renderMergedRows(provider, leaves) {
  return leaves
    .map(leaf => (leaf.type === 'array' ? arrayRow(provider, leaf) : scalarRow(provider, leaf)))
    .join('\n');
}

function scalarRow(provider, leaf) {
  const overridden = leaf.overrides.map(o => o.scope);
  const lock = leaf.locked ? `<span class="lock">⛒ locked</span>` : '';
  const why = leaf.overrides.length
    ? `<div class="why">${leaf.overrides.length} override${leaf.overrides.length > 1 ? 's' : ''} ▸</div>
       <div class="overrides">${leaf.overrides.map(o =>
         `<div class="ov"><s>${esc(fmt(o.value))}</s> <span class="from">· ${esc(o.scope)} · ${esc(o.source)}</span></div>`).join('')}</div>`
    : `<div class="why muted">set in one scope · no overrides</div>`;
  return `<div class="row">${spine(provider, leaf.winner, overridden)}<div class="rowbody">
    <div class="keyline"><span class="key">${esc(leaf.path)}</span>${badge(provider, leaf.winner)}${lock}</div>
    <div class="val"><code>${esc(fmt(leaf.value))}</code></div>${why}</div></div>`;
}

function arrayRow(provider, leaf) {
  const overridden = [...new Set(leaf.entries.map(e => e.scope))];
  const tokens = leaf.entries.map(e =>
    `<span class="tok"><span class="b b-${esc(provider.shortOf(e.scope))}"></span>${esc(fmt(e.value))}` +
    `${e.locked ? ' <span class="lock">⛒</span>' : ''}</span>`).join('');
  return `<div class="row">${spine(provider, null, overridden)}<div class="rowbody">
    <div class="keyline"><span class="key">${esc(leaf.path)}</span>
      <span class="tag">union · ${overridden.length} source${overridden.length > 1 ? 's' : ''}</span></div>
    <div class="perm">${tokens}</div></div></div>`;
}

// A layer that exists but failed to parse is the single most useful thing this
// report can surface, so it gets its own treatment rather than reading as
// "present" alongside healthy files.
function strataBar(provider, s) {
  if (s.parse === 'ok') {
    return `<div class="layer"><div class="name">${esc(s.label)}</div>` +
      `<div class="bar" style="background:var(--${esc(provider.shortOf(s.scope))})">${esc(s.path)}</div></div>`;
  }
  if (s.parse === 'malformed' || s.parse === 'unreadable') {
    return `<div class="layer broken"><div class="name">${esc(s.label)}</div>` +
      `<div class="bar">⚠ ${esc(s.parse)} · ${esc(s.path)}${s.error ? ` · ${esc(s.error)}` : ''}</div></div>`;
  }
  const note = s.parse === 'n/a' ? esc(s.error ?? 'not inspectable') : 'not present';
  return `<div class="layer absent"><div class="name">${esc(s.label)}</div><div class="bar">${note}</div></div>`;
}

export function renderStrata(provider, scopes) {
  return `<div class="strata">${scopes.map(s => strataBar(provider, s)).join('')}</div>`;
}

function fmt(v) { return typeof v === 'string' ? v : JSON.stringify(v); }
