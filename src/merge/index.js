import { flatten } from './flatten.js';
import { rank } from '../precedence.js';

// mergeConfig(layers) → { effective, leaves }
export function mergeConfig(layers) {
  // Collect every leaf occurrence across layers, tagged with its scope/source.
  const byPath = new Map(); // path → { isArray, occurrences:[{scope,source,value}] }
  for (const layer of layers) {
    for (const leaf of flatten(layer.settings)) {
      const slot = byPath.get(leaf.path) ?? { isArray: leaf.isArray, occurrences: [] };
      slot.isArray = slot.isArray || leaf.isArray;
      slot.occurrences.push({ scope: layer.scope, source: layer.source, value: leaf.value });
      byPath.set(leaf.path, slot);
    }
  }

  const leaves = [];
  for (const [path, slot] of byPath) {
    leaves.push(slot.isArray
      ? mergeArray(path, slot.occurrences)
      : mergeScalar(path, slot.occurrences));
  }

  const effective = rebuildEffective(leaves);
  return { effective, leaves };
}

function mergeScalar(path, occurrences) {
  const sorted = [...occurrences].sort((a, b) => rank(a.scope) - rank(b.scope));
  const win = sorted[0];
  const overrides = sorted.slice(1).map(o => ({ scope: o.scope, value: o.value, source: o.source }));
  return { path, type: 'scalar', winner: win.scope, value: win.value, locked: win.scope === 'managed', overrides };
}

function mergeArray(path, occurrences) {
  const isDeny = path.endsWith('.deny');
  const seen = new Map(); // json(value) → entry (kept = strongest scope)
  // Strongest first so the first writer of a value wins the dedupe.
  const sorted = [...occurrences].sort((a, b) => rank(a.scope) - rank(b.scope));
  for (const occ of sorted) {
    // Tolerate a value that is a scalar in one layer and an array in another:
    // treat a non-array occurrence as a single-element array so we never iterate
    // a string character-by-character.
    const values = Array.isArray(occ.value) ? occ.value : [occ.value];
    for (const value of values) {
      const key = JSON.stringify(value);
      if (seen.has(key)) continue;
      seen.set(key, {
        value, scope: occ.scope, source: occ.source,
        locked: isDeny && occ.scope === 'managed',
      });
    }
  }
  return { path, type: 'array', winner: null, entries: [...seen.values()] };
}

// Build a nested object from scalar/array leaf effective values.
function rebuildEffective(leaves) {
  const root = {};
  for (const leaf of leaves) {
    const value = leaf.type === 'array' ? leaf.entries.map(e => e.value) : leaf.value;
    const parts = leaf.path.split('.');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {});
    node[parts.at(-1)] = value;
  }
  return root;
}
