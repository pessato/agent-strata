import { esc, spine, SHORT_SCOPE } from './html.js';

const SRC_BADGE = scope => `<span class="src s-${SHORT_SCOPE[scope]}">${esc(scope[0].toUpperCase())}</span>`;

export function renderMergedRows(leaves) {
  return leaves.map(leaf => leaf.type === 'array' ? arrayRow(leaf) : scalarRow(leaf)).join('\n');
}

function scalarRow(leaf) {
  const overridden = leaf.overrides.map(o => o.scope);
  const lock = leaf.locked ? `<span class="lock">⛒ locked</span>` : '';
  const why = leaf.overrides.length
    ? `<div class="why">${leaf.overrides.length} override${leaf.overrides.length > 1 ? 's' : ''} ▸</div>
       <div class="overrides">${leaf.overrides.map(o =>
         `<div class="ov"><s>${esc(fmt(o.value))}</s> <span class="from">· ${esc(o.scope)} · ${esc(o.source)}</span></div>`).join('')}</div>`
    : `<div class="why" style="opacity:.5">set in one scope · no overrides</div>`;
  return `<div class="row">${spine(leaf.winner, overridden)}<div class="rowbody">
    <div class="keyline"><span class="key">${esc(leaf.path)}</span>${SRC_BADGE(leaf.winner)}${lock}</div>
    <div class="val"><code>${esc(fmt(leaf.value))}</code></div>${why}</div></div>`;
}

function arrayRow(leaf) {
  const overridden = [...new Set(leaf.entries.map(e => e.scope))];
  const tokens = leaf.entries.map(e =>
    `<span class="tok"><span class="b b-${SHORT_SCOPE[e.scope]}"></span>${esc(fmt(e.value))}${e.locked ? ' <span class="lock">⛒</span>' : ''}</span>`).join('');
  return `<div class="row">${spine(null, overridden)}<div class="rowbody">
    <div class="keyline"><span class="key">${esc(leaf.path)}</span>
      <span style="font-family:var(--mono);font-size:11px;color:var(--faint)">union · ${overridden.length} source${overridden.length > 1 ? 's' : ''}</span></div>
    <div class="perm">${tokens}</div></div></div>`;
}

export function renderStrata(scopes) {
  return `<div class="strata">${scopes.map(s => s.present
    ? `<div class="layer"><div class="name">${esc(s.label)}</div><div class="bar" style="background:var(--${SHORT_SCOPE[s.scope]})">${esc(s.path)}</div></div>`
    : `<div class="layer absent"><div class="name">${esc(s.label)}</div><div class="bar">not present</div></div>`
  ).join('')}</div>`;
}

function fmt(v) { return typeof v === 'string' ? v : JSON.stringify(v); }
