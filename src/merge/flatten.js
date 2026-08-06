// flatten(obj) → [{ path, segments, key, value, isArray }]
// Plain objects recurse; arrays and scalars are leaves.
//
// `segments` is the authoritative path — `path` is only for display and map
// keying. A settings key may itself contain a dot (an MCP server named
// `my.server`, say), so splitting the joined string back apart would nest it
// wrongly on the way out.
export function flatten(obj, segments = []) {
  const out = [];
  for (const [key, value] of Object.entries(obj ?? {})) {
    const next = [...segments, key];
    const leaf = { path: next.join('.'), segments: next, key, value };
    if (Array.isArray(value)) {
      out.push({ ...leaf, isArray: true });
    } else if (value && typeof value === 'object') {
      out.push(...flatten(value, next));
    } else {
      out.push({ ...leaf, isArray: false });
    }
  }
  return out;
}
