import { flatten } from './flatten.js';
import { redactValue } from '../redact.js';

// mergeConfig(layers, provider) → { effective, leaves }
//
// Values are redacted here rather than at render time so that nothing
// downstream — the HTML, the effective tree, a future JSON output — can leak a
// credential by forgetting to ask.
export function mergeConfig(layers, provider) {
  const rank = scope => provider.rank(scope);

  // Keyed by the segment array, not the joined path: `{a:{b:1}}` and
  // `{"a.b":1}` render the same string but are different settings.
  const bySegments = new Map();
  for (const layer of layers) {
    for (const leaf of flatten(layer.settings)) {
      const id = JSON.stringify(leaf.segments);
      const slot = bySegments.get(id) ??
        { path: leaf.path, segments: leaf.segments, key: leaf.key, isArray: leaf.isArray, occurrences: [] };
      slot.isArray = slot.isArray || leaf.isArray;
      slot.occurrences.push({
        scope: layer.scope,
        source: layer.source,
        value: redactValue(leaf.key, leaf.value),
      });
      bySegments.set(id, slot);
    }
  }

  const leaves = [];
  for (const slot of bySegments.values()) {
    leaves.push(slot.isArray ? mergeArray(slot, rank) : mergeScalar(slot, rank));
  }

  return { effective: rebuildEffective(leaves), leaves };
}

function base(slot) {
  return { path: slot.path, segments: slot.segments, key: slot.key };
}

function mergeScalar(slot, rank) {
  const sorted = [...slot.occurrences].sort((a, b) => rank(a.scope) - rank(b.scope));
  const win = sorted[0];
  const overrides = sorted.slice(1).map(o => ({ scope: o.scope, value: o.value, source: o.source }));
  return {
    ...base(slot), type: 'scalar',
    winner: win.scope, value: win.value, locked: win.scope === 'managed', overrides,
  };
}

function mergeArray(slot, rank) {
  // `permissions.deny` under managed policy cannot be relaxed by a weaker scope,
  // so those entries are flagged as locked.
  const isDeny = slot.key === 'deny';
  const seen = new Map(); // json(value) → entry (kept = strongest scope)
  // Strongest first so the first writer of a value wins the dedupe.
  const sorted = [...slot.occurrences].sort((a, b) => rank(a.scope) - rank(b.scope));
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
  return { ...base(slot), type: 'array', winner: null, entries: [...seen.values()] };
}

// Build a nested object from scalar/array leaf effective values.
function rebuildEffective(leaves) {
  const root = {};
  for (const leaf of leaves) {
    const value = leaf.type === 'array' ? leaf.entries.map(e => e.value) : leaf.value;
    let node = root;
    for (const seg of leaf.segments.slice(0, -1)) {
      // A scalar already parked here (one layer sets `a`, another sets `a.b`)
      // would otherwise be silently indexed into.
      if (!node[seg] || typeof node[seg] !== 'object') node[seg] = {};
      node = node[seg];
    }
    node[leaf.segments.at(-1)] = value;
  }
  return root;
}
