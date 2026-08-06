export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// spine(provider, winner, overriddenScopes[]) → vertical dot-ladder showing
// every precedence layer at once: which one won, which were overridden, which
// never spoke. One glyph per scope, always in the same order, so the shape of a
// row is readable before you read a word of it.
export function spine(provider, winner, overridden = []) {
  const rungs = provider.order.map(scope => {
    const cls = scope === winner ? 'win' : overridden.includes(scope) ? 'over' : 'none';
    return `<span class="rung r-${esc(provider.shortOf(scope))} ${cls}"></span>`;
  }).join('');
  return `<div class="spine">${rungs}</div>`;
}
