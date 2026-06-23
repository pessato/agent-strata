import { settingsPaths } from './paths.js';
import { readJson } from './readers.js';
import { SCOPE_LABELS } from '../precedence.js';

// collectSettings({platform, home, projectDir}) → { layers, scopes }
export function collectSettings(ctx) {
  const paths = settingsPaths(ctx);
  const scopes = [];
  const layers = [];

  for (const scope of ['managed', 'project-local', 'project-shared', 'user']) {
    const path = paths[scope];
    const r = readJson(path);
    scopes.push({ scope, label: SCOPE_LABELS[scope], path, present: r.present, parse: r.parse, error: r.error, settings: r.data });
    if (r.parse === 'ok' && r.data && typeof r.data === 'object') {
      layers.push({ scope, source: path, settings: r.data });
    }
  }

  // CLI flags: documented scope, not recoverable from a static run.
  scopes.splice(1, 0, { scope: 'cli', label: SCOPE_LABELS.cli, path: '(session flags)', present: false, parse: 'n/a', error: 'CLI flags are per-session and not inspectable after start', settings: null });

  return { layers, scopes };
}
