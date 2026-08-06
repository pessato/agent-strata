import claude from './claude.js';

const REGISTRY = { claude };

export const PROVIDER_IDS = Object.keys(REGISTRY);

// resolveProvider(id) → provider descriptor plus derived scope lookups.
// Throws on an unknown id so the CLI can report it rather than rendering an
// empty report.
export function resolveProvider(id = 'claude') {
  const base = REGISTRY[id];
  if (!base) {
    throw new Error(`unknown provider "${id}" (known: ${PROVIDER_IDS.join(', ')})`);
  }
  const order = base.scopes.map(s => s.id);
  const byId = new Map(base.scopes.map(s => [s.id, s]));

  return {
    ...base,
    order,
    // rank(scope) → number; lower = stronger. Unknown scopes sort last.
    rank(scope) {
      const i = order.indexOf(scope);
      return i === -1 ? order.length : i;
    },
    labelOf: scope => byId.get(scope)?.label ?? scope,
    // Unknown scopes fall back to their own id so a stray value produces an
    // inert CSS class rather than `undefined`.
    shortOf: scope => byId.get(scope)?.short ?? String(scope ?? 'unknown'),
  };
}
