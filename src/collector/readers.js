import { readFileSync, readdirSync } from 'node:fs';

// readJson(path) → { present, parse:'ok'|'missing'|'malformed', error, data }
export function readJson(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return { present: false, parse: 'missing', error: null, data: null };
  }
  try {
    return { present: true, parse: 'ok', error: null, data: JSON.parse(raw) };
  } catch (e) {
    return { present: true, parse: 'malformed', error: e.message, data: null };
  }
}

// readText(path) → { present, error, data } (raw string)
export function readText(path) {
  try {
    return { present: true, error: null, data: readFileSync(path, 'utf8') };
  } catch {
    return { present: false, error: null, data: null };
  }
}

// listDir(path) → [{ name, isDir }]; [] if absent.
export function listDir(path) {
  try {
    return readdirSync(path, { withFileTypes: true }).map(e => ({ name: e.name, isDir: e.isDirectory() }));
  } catch {
    return [];
  }
}
