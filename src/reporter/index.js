import { esc } from './html.js';
import { renderMergedRows, renderStrata } from './sections.js';
import { renderSources } from './sources.js';

// Per-scope colour variables and the four families of swatch that use them —
// generated from the provider so adding a scope never means editing CSS.
function scopeStyles(provider) {
  const vars = provider.scopes.map(s => `--${s.short}:${s.color};`).join('');
  const rules = provider.scopes.map(s => {
    const k = s.short;
    return `.s-${k}{background:var(--${k})}.b-${k}{background:var(--${k})}` +
      `.r-${k}.win,.r-${k}.over{background:var(--${k});color:var(--${k})}`;
  }).join('\n  ');
  return { vars, rules };
}

function styles(provider) {
  const { vars, rules } = scopeStyles(provider);
  return `
  :root{
    --bg:#0b0c10; --panel:#121319; --panel2:#171922; --line:#232634;
    --txt:#e7e8ee; --dim:#9aa0b0; --faint:#5a6072; --warn:#f59e0b;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
    --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    --accent:#5eead4;
    ${vars}
  }
  *{box-sizing:border-box}
  body{margin:0;background:radial-gradient(1200px 700px at 80% -10%,#15171f 0%,var(--bg) 55%);
    color:var(--txt);font-family:var(--sans);font-size:14px;line-height:1.5}

  .main{padding:30px 38px 60px;max-width:980px;margin:0 auto}
  .top{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:8px;flex-wrap:wrap}
  .top h1{font-size:13px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);margin:0}
  .meta{font-family:var(--mono);font-size:11px;color:var(--faint);text-align:right;line-height:1.7;
    overflow-wrap:anywhere}
  .meta b{color:var(--dim);font-weight:600}

  /* overview hero: the precedence column */
  .hero{margin:20px 0 40px;background:linear-gradient(180deg,var(--panel),var(--panel2));
    border:1px solid var(--line);border-radius:16px;padding:26px 28px}
  .hero h2{margin:0 0 2px;font-size:20px}
  .hero p{margin:0 0 22px;color:var(--dim);font-size:13px}
  .strata{display:flex;flex-direction:column;gap:8px}
  .layer{display:flex;align-items:center;gap:14px}
  .layer .name{width:120px;flex:none;font-size:12px;color:var(--dim);text-align:right;font-family:var(--mono)}
  .layer .bar{flex:1;min-width:0;min-height:34px;border-radius:8px;display:flex;align-items:center;
    padding:6px 12px;font-size:11px;font-family:var(--mono);color:#0b0c10;font-weight:600;
    box-shadow:0 1px 0 rgba(255,255,255,.08) inset;overflow-wrap:anywhere}
  .layer.absent .bar{background:repeating-linear-gradient(45deg,#1a1d27,#1a1d27 7px,#15171f 7px,#15171f 14px);
    color:var(--faint);box-shadow:none;border:1px dashed var(--line)}
  .layer.broken .bar{background:#2a1f0d;color:var(--warn);border:1px solid var(--warn);box-shadow:none}
  .summary{display:flex;gap:10px;margin-top:24px;flex-wrap:wrap}
  .stat{flex:1;min-width:120px;background:#0e0f15;border:1px solid var(--line);border-radius:12px;padding:14px 16px}
  .stat .n{font-size:24px;font-weight:700;font-family:var(--mono)}
  .stat .k{font-size:11px;color:var(--faint);letter-spacing:.04em;margin-top:2px}

  /* section headers */
  .sec-h{display:flex;align-items:center;gap:12px;margin:34px 0 16px}
  .sec-h h3{margin:0;font-size:16px}
  .sec-h .pill{font-size:11px;color:#0b0c10;background:var(--accent);padding:2px 9px;border-radius:20px;font-weight:700}
  .sec-h .pill.zero{opacity:.4}

  /* merged rows */
  .row{display:flex;gap:16px;background:var(--panel);border:1px solid var(--line);border-radius:12px;
    padding:14px 16px;margin-bottom:10px;transition:.15s}
  .row:hover{border-color:#2e3344}
  .spine{display:flex;flex-direction:column;gap:3px;padding-top:2px;flex:none}
  .rung{width:8px;height:8px;border-radius:2px;background:#262a38}
  .rung.win{box-shadow:0 0 9px currentColor;transform:scale(1.35)}
  .rung.over{opacity:.55}
  .rung.none{background:transparent;border:1px solid #262a38}
  ${rules}

  .rowbody{flex:1;min-width:0}
  .keyline{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .key{font-family:var(--mono);font-weight:700;font-size:13px;overflow-wrap:anywhere}
  .tag{font-family:var(--mono);font-size:11px;color:var(--faint)}
  .src{font-size:10px;font-family:var(--mono);padding:1px 7px;border-radius:5px;color:#0b0c10;font-weight:700;flex:none}
  .lock{font-size:10px;color:var(--managed,#ef4444);font-family:var(--mono)}
  .val{font-family:var(--mono);font-size:13px;margin-top:7px;overflow-wrap:anywhere}
  .val code{background:#0e0f15;border:1px solid var(--line);padding:2px 8px;border-radius:6px}
  .why{margin-top:9px;font-size:12px;color:var(--faint);font-family:var(--mono)}
  .why.muted{opacity:.5}
  .overrides{margin-top:10px;border-left:2px solid var(--line);padding-left:12px;display:flex;flex-direction:column;gap:6px}
  .ov{font-family:var(--mono);font-size:12px;color:var(--faint);overflow-wrap:anywhere}
  .ov s{color:#6b7180}
  .ov .from{opacity:.8}

  /* value unions (permissions, and any other array-valued key) */
  .perm{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
  .tok{font-family:var(--mono);font-size:11px;background:#0e0f15;border:1px solid var(--line);
    border-radius:7px;padding:3px 9px;display:flex;align-items:center;gap:7px;overflow-wrap:anywhere}
  .tok .b{width:7px;height:7px;border-radius:2px;flex:none}

  /* inventory sections */
  .srcsec{margin-bottom:6px}
  .items{display:flex;flex-direction:column;gap:6px;margin-bottom:18px}
  .items.empty{color:var(--faint);font-family:var(--mono);font-size:12px;font-style:italic}
  .item{display:flex;align-items:center;gap:10px;background:var(--panel);border:1px solid var(--line);
    border-radius:9px;padding:8px 12px;font-size:13px}
  .item .il{font-family:var(--mono);font-weight:600;min-width:0;overflow-wrap:anywhere}
  .item .id{margin-left:auto;font-family:var(--mono);font-size:11px;color:var(--faint);white-space:nowrap;padding-left:10px}
  .footnote{margin-top:40px;color:var(--faint);font-size:11px;font-family:var(--mono);text-align:center}

  @media (max-width:640px){
    .main{padding:20px 16px 40px}
    .layer{align-items:flex-start}
    .layer .name{width:auto;min-width:74px;text-align:left}
  }
`;
}

// renderReport(inventory, merged, provider) → a complete, self-contained page.
export function renderReport(inventory, merged, provider) {
  const { machine, scopes } = inventory;
  const readable = scopes.filter(s => s.parse === 'ok').length;
  const overridden = merged.leaves.filter(l => l.type === 'scalar' && l.overrides.length).length;
  const locked = merged.leaves.filter(l => l.locked || (l.entries ?? []).some(e => e.locked)).length;
  const title = `agent-strata — ${inventory.provider.label} — ${machine.hostname}`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>${styles(provider)}</style></head><body>
<main class="main">
  <div class="top"><h1>${esc(inventory.provider.label)} · configuration snapshot</h1>
    <div class="meta"><b>${esc(machine.hostname)}</b> · ${esc(machine.platform)}<br>${esc(machine.projectDir)}<br>${esc(machine.timestamp)}</div></div>
  <section class="hero"><h2>What's stacked on this machine</h2>
    <p>${provider.order.length} precedence layers, strongest on top. A lower layer only wins where no higher one spoke.</p>
    ${renderStrata(provider, scopes)}
    <div class="summary">
      <div class="stat"><div class="n">${readable}</div><div class="k">layers in effect</div></div>
      <div class="stat"><div class="n">${merged.leaves.length}</div><div class="k">effective keys</div></div>
      <div class="stat"><div class="n">${overridden}</div><div class="k">overridden</div></div>
      <div class="stat"><div class="n">${locked}</div><div class="k">locked by policy</div></div>
    </div></section>
  <div class="sec-h"><h3>Merged session</h3><span class="pill">effective + provenance</span></div>
  ${renderMergedRows(provider, merged.leaves)}
  <div class="sec-h"><h3>All configured sources</h3><span class="pill">inventory</span></div>
  ${renderSources(provider, inventory.sources)}
  <div class="footnote">read-only snapshot · nothing was written · secrets redacted · re-run to refresh</div>
</main></body></html>`;
}
