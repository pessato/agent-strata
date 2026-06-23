// flatten(obj) → [{ path, value, isArray }]
// Plain objects recurse; arrays and scalars are leaves.
export function flatten(obj, prefix = '') {
  const out = [];
  for (const [key, value] of Object.entries(obj ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      out.push({ path, value, isArray: true });
    } else if (value && typeof value === 'object') {
      out.push(...flatten(value, path));
    } else {
      out.push({ path, value, isArray: false });
    }
  }
  return out;
}
