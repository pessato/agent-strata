import { readFileSync, readdirSync } from 'node:fs';

// A file that exists but cannot be read is not the same as one that is absent —
// reporting EACCES on managed-settings.json as "not present" would tell an
// engineer their enterprise policy is off when it is merely unreadable.
function classify(e) {
  return e && e.code === 'ENOENT'
    ? { present: false, parse: 'missing', error: null, data: null }
    : { present: true, parse: 'unreadable', error: e?.message ?? String(e), data: null };
}

// readJson(path) → { present, parse:'ok'|'missing'|'unreadable'|'malformed', error, data }
export function readJson(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    return classify(e);
  }
  try {
    return { present: true, parse: 'ok', error: null, data: JSON.parse(raw) };
  } catch (e) {
    return { present: true, parse: 'malformed', error: e.message, data: null };
  }
}

// readText(path) → { present, parse, error, data } (raw string)
export function readText(path) {
  try {
    return { present: true, parse: 'ok', error: null, data: readFileSync(path, 'utf8') };
  } catch (e) {
    return classify(e);
  }
}

// listDir(path) → [{ name, isDir }]; [] if absent or unreadable.
export function listDir(path) {
  try {
    return readdirSync(path, { withFileTypes: true }).map(e => ({ name: e.name, isDir: e.isDirectory() }));
  } catch {
    return [];
  }
}
