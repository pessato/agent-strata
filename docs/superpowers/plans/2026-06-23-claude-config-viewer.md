# Claude Config Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A read-only Node CLI that inventories every Claude Code config source on a machine and emits one self-contained HTML report ("The Cascade") showing the effective session config with full provenance.

**Architecture:** Three pure-ish units with clean interfaces — **Collector** (fs + os → `Inventory`), **Merge engine** (`layers → MergedResult`, pure), **Reporter** (`Inventory + MergedResult → HTML string`). A thin **CLI** wires them and writes the file. No build step, no runtime dependencies.

**Tech Stack:** Node.js (≥18, ESM), built-in test runner (`node --test`, `node:test` + `node:assert/strict`), hand-rolled HTML string generation. Zero npm dependencies.

---

## Data Contracts (used by every task — keep names exact)

```js
// Precedence, highest → lowest. Index = priority (0 strongest).
export const PRECEDENCE = ['managed','cli','project-local','project-shared','user','plugin'];

// A settings layer (input to the merge engine)
// { scope: <one of PRECEDENCE>, source: string, settings: object }

// A merged leaf (output of the merge engine), one of two shapes:
// scalar leaf:
//   { path:'model', type:'scalar', winner:'managed', value:any,
//     locked:boolean, overrides:[{scope, value, source}] }
// array leaf:
//   { path:'permissions.deny', type:'array', winner:null,
//     entries:[{value:any, scope, source, locked:boolean}] }

// MergedResult: { effective: object, leaves: Leaf[] }

// Inventory:
// { machine:{hostname,platform,cwd,projectDir,timestamp},
//   layers: Layer[],                       // settings layers (feeds merge)
//   scopes: [{scope,label,path,present,parse,error,settings}],  // settings file status
//   sources: {                             // non-settings surfaces
//     memory:Item[], rules:Item[], agents:Item[], commands:Item[], skills:Item[],
//     mcp:Item[], hooks:Item[], plugins:Item[], outputStyles:Item[],
//     keybindings:Item|null, worktreeInclude:Item|null, env:{KEY:value} } }
// Item: { scope, label, path, present, parse, error, data }
```

## File Structure

```
package.json                 # ESM, bin, test script, zero deps
bin/cli.js                   # CLI entry: parse args → collect → merge → render → write
src/precedence.js            # PRECEDENCE constant + scope labels
src/merge/flatten.js         # nested settings → leaf path entries
src/merge/index.js           # mergeConfig(layers) → {effective, leaves}
src/collector/paths.js       # OS-aware candidate paths per scope
src/collector/readers.js     # readJson / scanDir helpers (parse status)
src/collector/index.js       # collect(opts) → Inventory
src/reporter/html.js         # escape + small render helpers
src/reporter/sections.js     # render strata/rows/sections from data
src/reporter/index.js        # renderReport(inventory, merged) → full HTML
docs/reference/design-mockup.html   # CSS/markup source of truth (already exists)
test/*.test.js               # one file per unit
test/fixtures/               # sample scope trees
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `src/precedence.js`
- Test: `test/precedence.test.js`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "claude-config-view",
  "version": "0.1.0",
  "description": "Read-only viewer for all Claude Code configuration scopes and how they merge.",
  "type": "module",
  "bin": { "claude-config-view": "bin/cli.js" },
  "scripts": { "test": "node --test" },
  "engines": { "node": ">=18" },
  "license": "MIT"
}
```

- [ ] **Step 2: Write `src/precedence.js`**

```js
export const PRECEDENCE = ['managed','cli','project-local','project-shared','user','plugin'];

export const SCOPE_LABELS = {
  managed: 'Managed · enterprise',
  cli: 'CLI flags',
  'project-local': 'Project-local',
  'project-shared': 'Project-shared',
  user: 'User global',
  plugin: 'Plugin defaults',
};

// rank(scope) → number; lower = stronger. Unknown scopes sort last.
export function rank(scope) {
  const i = PRECEDENCE.indexOf(scope);
  return i === -1 ? PRECEDENCE.length : i;
}
```

- [ ] **Step 3: Write the failing test `test/precedence.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRECEDENCE, rank } from '../src/precedence.js';

test('managed is strongest, plugin is weakest', () => {
  assert.equal(rank('managed'), 0);
  assert.ok(rank('plugin') > rank('user'));
  assert.equal(PRECEDENCE.length, 6);
});
```

- [ ] **Step 4: Run test**

Run: `node --test`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add package.json src/precedence.js test/precedence.test.js
git commit -m "chore: scaffold project and precedence constants"
```

---

## Task 2: Flatten settings into leaf entries

Turns a nested settings object into a flat list of leaves. Scalars and arrays become leaves; plain objects recurse. Path uses dot notation.

**Files:**
- Create: `src/merge/flatten.js`
- Test: `test/flatten.test.js`

- [ ] **Step 1: Write the failing test `test/flatten.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flatten } from '../src/merge/flatten.js';

test('scalars and nested objects flatten to dot paths', () => {
  const leaves = flatten({ model: 'opus', git: { includeCoAuthoredBy: true } });
  assert.deepEqual(leaves, [
    { path: 'model', value: 'opus', isArray: false },
    { path: 'git.includeCoAuthoredBy', value: true, isArray: false },
  ]);
});

test('arrays are leaves, not recursed', () => {
  const leaves = flatten({ permissions: { allow: ['Bash(ls)'] } });
  assert.deepEqual(leaves, [
    { path: 'permissions.allow', value: ['Bash(ls)'], isArray: true },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/flatten.test.js`
Expected: FAIL ("Cannot find module ... flatten.js").

- [ ] **Step 3: Write `src/merge/flatten.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/flatten.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/merge/flatten.js test/flatten.test.js
git commit -m "feat(merge): flatten nested settings into leaf entries"
```

---

## Task 3: Merge scalar leaves (winner + overrides + locked)

**Files:**
- Create: `src/merge/index.js`
- Test: `test/merge-scalar.test.js`

- [ ] **Step 1: Write the failing test `test/merge-scalar.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig } from '../src/merge/index.js';

const layers = [
  { scope: 'managed', source: 'managed-settings.json', settings: { model: 'opus' } },
  { scope: 'user', source: '~/.claude/settings.json', settings: { model: 'sonnet', outputStyle: 'Explanatory' } },
];

test('higher-precedence scope wins; loser recorded as override', () => {
  const { leaves } = mergeConfig(layers);
  const model = leaves.find(l => l.path === 'model');
  assert.equal(model.type, 'scalar');
  assert.equal(model.winner, 'managed');
  assert.equal(model.value, 'opus');
  assert.equal(model.locked, true); // managed winner ⇒ locked
  assert.deepEqual(model.overrides, [{ scope: 'user', value: 'sonnet', source: '~/.claude/settings.json' }]);
});

test('value set in one scope has no overrides and is not locked', () => {
  const { leaves } = mergeConfig(layers);
  const os = leaves.find(l => l.path === 'outputStyle');
  assert.equal(os.winner, 'user');
  assert.equal(os.locked, false);
  assert.deepEqual(os.overrides, []);
});

test('effective object reconstructs nested winners', () => {
  const { effective } = mergeConfig(layers);
  assert.equal(effective.model, 'opus');
  assert.equal(effective.outputStyle, 'Explanatory');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/merge-scalar.test.js`
Expected: FAIL ("Cannot find module ... merge/index.js").

- [ ] **Step 3: Write `src/merge/index.js` (scalar path only for now)**

```js
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
    if (slot.isArray) continue; // arrays handled in Task 4
    leaves.push(mergeScalar(path, slot.occurrences));
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/merge-scalar.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/merge/index.js test/merge-scalar.test.js
git commit -m "feat(merge): scalar precedence with provenance"
```

---

## Task 4: Merge array leaves (union with sources, deny lock)

Arrays (e.g. `permissions.allow/deny`) are a **union** across scopes; duplicate values keep the strongest scope; managed `deny` entries are `locked`.

**Files:**
- Modify: `src/merge/index.js`
- Test: `test/merge-array.test.js`

- [ ] **Step 1: Write the failing test `test/merge-array.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig } from '../src/merge/index.js';

const layers = [
  { scope: 'managed', source: 'managed', settings: { permissions: { deny: ['Bash(curl *)'] } } },
  { scope: 'user', source: 'user', settings: { permissions: { allow: ['Bash(npm *)'] } } },
  { scope: 'project-shared', source: 'proj', settings: { permissions: { allow: ['Bash(npm *)', 'Edit(src/**)'] } } },
];

test('array leaf is a union of entries tagged by source, deduped', () => {
  const { leaves } = mergeConfig(layers);
  const allow = leaves.find(l => l.path === 'permissions.allow');
  assert.equal(allow.type, 'array');
  const values = allow.entries.map(e => e.value);
  assert.deepEqual(values, ['Bash(npm *)', 'Edit(src/**)']); // deduped, order preserved
  // duplicate kept the stronger scope (project-shared beats user)
  assert.equal(allow.entries.find(e => e.value === 'Bash(npm *)').scope, 'project-shared');
});

test('managed deny entries are locked', () => {
  const { leaves } = mergeConfig(layers);
  const deny = leaves.find(l => l.path === 'permissions.deny');
  assert.equal(deny.entries[0].locked, true);
});

test('effective rebuilds arrays as flat value lists', () => {
  const { effective } = mergeConfig(layers);
  assert.deepEqual(effective.permissions.allow, ['Bash(npm *)', 'Edit(src/**)']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/merge-array.test.js`
Expected: FAIL (array leaves skipped, `allow` is undefined).

- [ ] **Step 3: Update `src/merge/index.js` — replace the `if (slot.isArray) continue;` block**

Replace:
```js
    if (slot.isArray) continue; // arrays handled in Task 4
    leaves.push(mergeScalar(path, slot.occurrences));
```
with:
```js
    leaves.push(slot.isArray
      ? mergeArray(path, slot.occurrences)
      : mergeScalar(path, slot.occurrences));
```

Then add this function below `mergeScalar`:
```js
function mergeArray(path, occurrences) {
  const isDeny = path.endsWith('.deny');
  const seen = new Map(); // json(value) → entry (kept = strongest scope)
  // Strongest first so the first writer of a value wins the dedupe.
  const sorted = [...occurrences].sort((a, b) => rank(a.scope) - rank(b.scope));
  for (const occ of sorted) {
    for (const value of occ.value) {
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/merge-array.test.js test/merge-scalar.test.js`
Expected: PASS (6 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/merge/index.js test/merge-array.test.js
git commit -m "feat(merge): array union with per-entry provenance and deny lock"
```

---

## Task 5: OS-aware scope paths

Returns candidate settings-file paths per scope for the current platform. Platform and home are injected for testability.

**Files:**
- Create: `src/collector/paths.js`
- Test: `test/paths.test.js`

- [ ] **Step 1: Write the failing test `test/paths.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsPaths } from '../src/collector/paths.js';

const env = { home: '/Users/x', projectDir: '/proj' };

test('macOS managed path and user/project paths', () => {
  const p = settingsPaths({ platform: 'darwin', ...env });
  assert.equal(p.managed, '/Library/Application Support/ClaudeCode/managed-settings.json');
  assert.equal(p.user, '/Users/x/.claude/settings.json');
  assert.equal(p['project-shared'], '/proj/.claude/settings.json');
  assert.equal(p['project-local'], '/proj/.claude/settings.local.json');
});

test('linux and windows managed paths differ', () => {
  assert.equal(settingsPaths({ platform: 'linux', ...env }).managed, '/etc/claude-code/managed-settings.json');
  assert.match(settingsPaths({ platform: 'win32', home: 'C:\\\\Users\\\\x', projectDir: 'C:\\\\proj' }).managed, /ClaudeCode/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/paths.test.js`
Expected: FAIL ("Cannot find module ... paths.js").

- [ ] **Step 3: Write `src/collector/paths.js`**

```js
import { join } from 'node:path';

const MANAGED = {
  darwin: '/Library/Application Support/ClaudeCode/managed-settings.json',
  linux: '/etc/claude-code/managed-settings.json',
  win32: 'C:\\ProgramData\\ClaudeCode\\managed-settings.json',
};

// settingsPaths({platform, home, projectDir}) → { scope: absolutePath }
export function settingsPaths({ platform, home, projectDir }) {
  return {
    managed: MANAGED[platform] ?? MANAGED.linux,
    user: join(home, '.claude', 'settings.json'),
    'project-shared': join(projectDir, '.claude', 'settings.json'),
    'project-local': join(projectDir, '.claude', 'settings.local.json'),
  };
}

// Directory locations for non-settings surfaces, user + project scoped.
export function sourceDirs({ home, projectDir }) {
  const u = (...p) => join(home, '.claude', ...p);
  const j = (...p) => join(projectDir, '.claude', ...p);
  return {
    agents: [{ scope: 'user', path: u('agents') }, { scope: 'project-shared', path: j('agents') }],
    commands: [{ scope: 'user', path: u('commands') }, { scope: 'project-shared', path: j('commands') }],
    skills: [{ scope: 'user', path: u('skills') }, { scope: 'project-shared', path: j('skills') }],
    rules: [{ scope: 'user', path: u('rules') }, { scope: 'project-shared', path: j('rules') }],
    outputStyles: [{ scope: 'user', path: u('output-styles') }, { scope: 'project-shared', path: j('output-styles') }],
  };
}

// Single-file locations for non-settings surfaces.
export function sourceFiles({ home, projectDir }) {
  return {
    keybindings: join(home, '.claude', 'keybindings.json'),
    userMcp: join(home, '.claude.json'),
    projectMcp: join(projectDir, '.mcp.json'),
    userMemory: join(home, '.claude', 'CLAUDE.md'),
    projectMemory: join(projectDir, 'CLAUDE.md'),
    projectMemoryLocal: join(projectDir, 'CLAUDE.local.md'),
    worktreeInclude: join(projectDir, '.worktreeinclude'),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/paths.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/collector/paths.js test/paths.test.js
git commit -m "feat(collector): OS-aware scope paths"
```

---

## Task 6: File/dir readers with parse status

**Files:**
- Create: `src/collector/readers.js`
- Test: `test/readers.test.js`

- [ ] **Step 1: Write the failing test `test/readers.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson, listDir } from '../src/collector/readers.js';

const dir = mkdtempSync(join(tmpdir(), 'ccv-'));
writeFileSync(join(dir, 'ok.json'), '{"model":"opus"}');
writeFileSync(join(dir, 'bad.json'), '{nope');
mkdirSync(join(dir, 'agents'));
writeFileSync(join(dir, 'agents', 'a.md'), '# a');

test('readJson reports ok / missing / malformed', () => {
  assert.deepEqual(readJson(join(dir, 'ok.json')), { present: true, parse: 'ok', error: null, data: { model: 'opus' } });
  assert.equal(readJson(join(dir, 'nope.json')).parse, 'missing');
  const bad = readJson(join(dir, 'bad.json'));
  assert.equal(bad.parse, 'malformed');
  assert.ok(bad.error);
});

test('listDir returns entries or empty when absent', () => {
  assert.deepEqual(listDir(join(dir, 'agents')).map(e => e.name), ['a.md']);
  assert.deepEqual(listDir(join(dir, 'missing')), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/readers.test.js`
Expected: FAIL ("Cannot find module ... readers.js").

- [ ] **Step 3: Write `src/collector/readers.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/readers.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/collector/readers.js test/readers.test.js
git commit -m "feat(collector): json/text/dir readers with parse status"
```

---

## Task 7: Collect settings layers + scope status

Reads each settings file, builds the `layers` array (for merge) and `scopes` status (for the report). The `cli` scope is documented but not collectible post-hoc — it is recorded as present:false with a note.

**Files:**
- Create: `src/collector/index.js`
- Test: `test/collect-settings.test.js`
- Test fixtures: created in the test via tmp dirs.

- [ ] **Step 1: Write the failing test `test/collect-settings.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectSettings } from '../src/collector/index.js';

function makeHome() {
  const home = mkdtempSync(join(tmpdir(), 'home-'));
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(join(home, '.claude', 'settings.json'), '{"model":"sonnet"}');
  return home;
}
function makeProject() {
  const proj = mkdtempSync(join(tmpdir(), 'proj-'));
  mkdirSync(join(proj, '.claude'), { recursive: true });
  writeFileSync(join(proj, '.claude', 'settings.json'), '{"outputStyle":"Explanatory"}');
  return proj;
}

test('builds layers for present settings files and scope status for all', () => {
  const { layers, scopes } = collectSettings({ platform: 'linux', home: makeHome(), projectDir: makeProject() });
  const userLayer = layers.find(l => l.scope === 'user');
  assert.deepEqual(userLayer.settings, { model: 'sonnet' });
  // user + project-shared present; managed + project-local missing; cli noted
  assert.equal(scopes.find(s => s.scope === 'user').present, true);
  assert.equal(scopes.find(s => s.scope === 'managed').present, false);
  assert.equal(scopes.find(s => s.scope === 'cli').present, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/collect-settings.test.js`
Expected: FAIL ("Cannot find module ... collector/index.js").

- [ ] **Step 3: Write `src/collector/index.js` (settings portion)**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/collect-settings.test.js`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/collector/index.js test/collect-settings.test.js
git commit -m "feat(collector): settings layers and scope status"
```

---

## Task 8: Collect non-settings sources + plugin default layer + env

Adds directory/file surfaces, plugin default settings (as a `plugin` layer), and relevant env vars. Builds the full `Inventory`.

**Files:**
- Modify: `src/collector/index.js`
- Test: `test/collect-sources.test.js`

- [ ] **Step 1: Write the failing test `test/collect-sources.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collect } from '../src/collector/index.js';

function home() {
  const h = mkdtempSync(join(tmpdir(), 'home-'));
  mkdirSync(join(h, '.claude', 'agents'), { recursive: true });
  writeFileSync(join(h, '.claude', 'agents', 'reviewer.md'), '# reviewer');
  writeFileSync(join(h, '.claude', 'CLAUDE.md'), '# user memory');
  return h;
}

test('collect returns a full inventory with sources and env', () => {
  const inv = collect({
    platform: 'linux', home: home(), projectDir: mkdtempSync(join(tmpdir(), 'proj-')),
    env: { ANTHROPIC_MODEL: 'opus', PATH: '/x', IGNORED: 'no' },
  });
  assert.ok(inv.machine.timestamp);
  assert.equal(inv.sources.agents.some(a => a.label.includes('reviewer')), true);
  assert.equal(inv.sources.memory.some(m => m.present && m.scope === 'user'), true);
  // only Claude-relevant env vars captured
  assert.equal(inv.sources.env.ANTHROPIC_MODEL, 'opus');
  assert.equal('IGNORED' in inv.sources.env, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/collect-sources.test.js`
Expected: FAIL ("collect is not a function").

- [ ] **Step 3: Append to `src/collector/index.js`**

Add these imports at the top (merge with existing import lines):
```js
import { sourceDirs, sourceFiles } from './paths.js';
import { readText, listDir } from './readers.js';
import { hostname } from 'node:os';
```

Add the env filter and `collect` function:
```js
const ENV_PREFIXES = ['ANTHROPIC_', 'CLAUDE_', 'CLAUDECODE'];
const ENV_EXACT = ['API_TIMEOUT_MS', 'BASH_DEFAULT_TIMEOUT_MS', 'MAX_THINKING_TOKENS',
  'DISABLE_AUTOUPDATER', 'DISABLE_TELEMETRY', 'DISABLE_AUTOCOMPACT'];

function pickEnv(env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    if (ENV_PREFIXES.some(p => k.startsWith(p)) || ENV_EXACT.includes(k)) out[k] = v;
  }
  return out;
}

function dirItems(scope, dir) {
  return listDir(dir).map(e => ({
    scope, label: e.name, path: join(dir, e.name), present: true, parse: 'ok', error: null, data: null,
  }));
}

// collect({platform, home, projectDir, env}) → Inventory
export function collect(ctx) {
  const { layers, scopes } = collectSettings(ctx);
  const dirs = sourceDirs(ctx);
  const files = sourceFiles(ctx);

  const collectDirs = key => dirs[key].flatMap(d => dirItems(d.scope, d.path));

  const memory = [
    { scope: 'user', label: '~/.claude/CLAUDE.md', path: files.userMemory, ...textItem(files.userMemory) },
    { scope: 'project-shared', label: './CLAUDE.md', path: files.projectMemory, ...textItem(files.projectMemory) },
    { scope: 'project-local', label: './CLAUDE.local.md', path: files.projectMemoryLocal, ...textItem(files.projectMemoryLocal) },
  ];

  const mcp = [
    { scope: 'user', label: '~/.claude.json', path: files.userMcp, ...jsonItem(files.userMcp) },
    { scope: 'project-shared', label: './.mcp.json', path: files.projectMcp, ...jsonItem(files.projectMcp) },
  ];

  const sources = {
    memory,
    rules: collectDirs('rules'),
    agents: collectDirs('agents'),
    commands: collectDirs('commands'),
    skills: collectDirs('skills'),
    outputStyles: collectDirs('outputStyles'),
    mcp,
    hooks: hooksFromLayers(layers),
    plugins: pluginsFromLayers(layers),
    keybindings: { path: files.keybindings, ...jsonItem(files.keybindings) },
    worktreeInclude: { path: files.worktreeInclude, ...textItem(files.worktreeInclude) },
    env: pickEnv(ctx.env ?? {}),
  };

  return {
    machine: {
      hostname: ctx.hostname ?? safeHostname(),
      platform: ctx.platform,
      cwd: ctx.projectDir,
      projectDir: ctx.projectDir,
      timestamp: ctx.now ?? new Date().toISOString(),
    },
    layers, scopes, sources,
  };
}

function textItem(path) { const r = readText(path); return { present: r.present, parse: r.present ? 'ok' : 'missing', error: r.error, data: r.data }; }
function jsonItem(path) { const r = readJson(path); return { present: r.present, parse: r.parse, error: r.error, data: r.data }; }
function safeHostname() { try { return hostname(); } catch { return 'unknown'; } }

// Hooks declared inside any settings layer.
function hooksFromLayers(layers) {
  const out = [];
  for (const l of layers) {
    for (const event of Object.keys(l.settings.hooks ?? {})) {
      out.push({ scope: l.scope, label: event, path: l.source, present: true, parse: 'ok', error: null, data: l.settings.hooks[event] });
    }
  }
  return out;
}

// enabledPlugins map declared in any settings layer.
function pluginsFromLayers(layers) {
  const out = [];
  for (const l of layers) {
    for (const [name, enabled] of Object.entries(l.settings.enabledPlugins ?? {})) {
      out.push({ scope: l.scope, label: name, path: l.source, present: true, parse: 'ok', error: null, data: { enabled } });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/collect-sources.test.js`
Expected: PASS (1 test). Also run `node --test` — all green.

- [ ] **Step 5: Commit**

```bash
git add src/collector/index.js test/collect-sources.test.js
git commit -m "feat(collector): non-settings sources, hooks, plugins, env into full inventory"
```

---

## Task 9: HTML helpers (escape + spine)

**Files:**
- Create: `src/reporter/html.js`
- Test: `test/html.test.js`

- [ ] **Step 1: Write the failing test `test/html.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, spine } from '../src/reporter/html.js';

test('esc neutralizes HTML special chars', () => {
  assert.equal(esc(`<b>&"'`), '&lt;b&gt;&amp;&quot;&#39;');
  assert.equal(esc(null), '');
});

test('spine marks winner, overrides, and absent scopes', () => {
  const html = spine('user', ['managed']); // winner user, managed overridden
  assert.match(html, /r-user win/);
  assert.match(html, /r-managed over/);
  assert.match(html, /r-cli none/); // not involved
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/html.test.js`
Expected: FAIL ("Cannot find module ... html.js").

- [ ] **Step 3: Write `src/reporter/html.js`**

```js
import { PRECEDENCE } from '../precedence.js';

const SHORT = { managed: 'managed', cli: 'cli', 'project-local': 'plocal', 'project-shared': 'pshared', user: 'user', plugin: 'plugin' };

export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// spine(winner, overriddenScopes[]) → vertical dot-ladder HTML
export function spine(winner, overridden = []) {
  return `<div class="spine">` + PRECEDENCE.map(scope => {
    const cls = scope === winner ? 'win' : overridden.includes(scope) ? 'over' : 'none';
    return `<span class="rung r-${SHORT[scope]} ${cls}"></span>`;
  }).join('') + `</div>`;
}

export const SHORT_SCOPE = SHORT;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/html.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/reporter/html.js test/html.test.js
git commit -m "feat(reporter): html escape and stack-spine helper"
```

---

## Task 10: Render merged rows + sections from data

**Files:**
- Create: `src/reporter/sections.js`
- Test: `test/sections.test.js`

- [ ] **Step 1: Write the failing test `test/sections.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMergedRows, renderStrata } from '../src/reporter/sections.js';

test('scalar row shows key, value, source, and collapsed overrides', () => {
  const html = renderMergedRows([
    { path: 'model', type: 'scalar', winner: 'managed', value: 'opus', locked: true,
      overrides: [{ scope: 'user', value: 'sonnet', source: '~/.claude/settings.json' }] },
  ]);
  assert.match(html, /model/);
  assert.match(html, /opus/);
  assert.match(html, /1 override/);
  assert.match(html, /<s>sonnet<\/s>|sonnet/);
  assert.match(html, /locked/);
});

test('array row renders union tokens', () => {
  const html = renderMergedRows([
    { path: 'permissions.allow', type: 'array', winner: null,
      entries: [{ value: 'Bash(npm *)', scope: 'user', source: 'u', locked: false }] },
  ]);
  assert.match(html, /permissions\.allow/);
  assert.match(html, /Bash\(npm \*\)/);
});

test('strata shows present and absent scopes', () => {
  const html = renderStrata([
    { scope: 'user', label: 'User global', present: true, path: '~/.claude/settings.json' },
    { scope: 'managed', label: 'Managed', present: false, path: '/x' },
  ]);
  assert.match(html, /User global/);
  assert.match(html, /absent/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sections.test.js`
Expected: FAIL ("Cannot find module ... sections.js").

- [ ] **Step 3: Write `src/reporter/sections.js`**

```js
import { esc, spine, SHORT_SCOPE } from './html.js';

const SRC_BADGE = scope => `<span class="src s-${SHORT_SCOPE[scope]}">${esc(scope[0].toUpperCase())}</span>`;

export function renderMergedRows(leaves) {
  return leaves.map(leaf => leaf.type === 'array' ? arrayRow(leaf) : scalarRow(leaf)).join('\n');
}

function scalarRow(leaf) {
  const overridden = leaf.overrides.map(o => o.scope);
  const lock = leaf.locked ? `<span class="lock">⛒ locked</span>` : '';
  const why = leaf.overrides.length
    ? `<div class="why">${leaf.overrides.length} override${leaf.overrides.length > 1 ? 's' : ''} ▸</div>
       <div class="overrides">${leaf.overrides.map(o =>
         `<div class="ov"><s>${esc(fmt(o.value))}</s> <span class="from">· ${esc(o.scope)} · ${esc(o.source)}</span></div>`).join('')}</div>`
    : `<div class="why" style="opacity:.5">set in one scope · no overrides</div>`;
  return `<div class="row">${spine(leaf.winner, overridden)}<div class="rowbody">
    <div class="keyline"><span class="key">${esc(leaf.path)}</span>${SRC_BADGE(leaf.winner)}${lock}</div>
    <div class="val"><code>${esc(fmt(leaf.value))}</code></div>${why}</div></div>`;
}

function arrayRow(leaf) {
  const overridden = [...new Set(leaf.entries.map(e => e.scope))];
  const tokens = leaf.entries.map(e =>
    `<span class="tok"><span class="b b-${SHORT_SCOPE[e.scope]}"></span>${esc(fmt(e.value))}${e.locked ? ' <span class="lock">⛒</span>' : ''}</span>`).join('');
  return `<div class="row">${spine(null, overridden)}<div class="rowbody">
    <div class="keyline"><span class="key">${esc(leaf.path)}</span>
      <span style="font-family:var(--mono);font-size:11px;color:var(--faint)">union · ${overridden.length} source${overridden.length > 1 ? 's' : ''}</span></div>
    <div class="perm">${tokens}</div></div></div>`;
}

export function renderStrata(scopes) {
  return `<div class="strata">${scopes.map(s => s.present
    ? `<div class="layer"><div class="name">${esc(s.label)}</div><div class="bar" style="background:var(--${SHORT_SCOPE[s.scope]})">${esc(s.path)}</div></div>`
    : `<div class="layer absent"><div class="name">${esc(s.label)}</div><div class="bar">not present</div></div>`
  ).join('')}</div>`;
}

function fmt(v) { return typeof v === 'string' ? v : JSON.stringify(v); }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/sections.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/reporter/sections.js test/sections.test.js
git commit -m "feat(reporter): render merged rows, spine, and strata from data"
```

---

## Task 11: Assemble the self-contained report

Wraps sections in the full HTML document, inlining the CSS from the approved mockup. The CSS is the source of truth in `docs/reference/design-mockup.html` — copy the `<style>…</style>` block verbatim into `STYLES` (it already matches the class names used by `sections.js` and `html.js`).

**Files:**
- Create: `src/reporter/index.js`
- Test: `test/report.test.js`

- [ ] **Step 1: Write the failing test `test/report.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderReport } from '../src/reporter/index.js';

const inventory = {
  machine: { hostname: 'mac', platform: 'darwin', projectDir: '/proj', timestamp: '2026-06-23T00:00:00Z' },
  scopes: [{ scope: 'user', label: 'User global', present: true, path: '~/.claude/settings.json' }],
  sources: { env: { ANTHROPIC_MODEL: 'opus' }, memory: [], agents: [], skills: [], commands: [], mcp: [], hooks: [], plugins: [], rules: [], outputStyles: [], keybindings: null, worktreeInclude: null },
  layers: [],
};
const merged = { effective: {}, leaves: [{ path: 'model', type: 'scalar', winner: 'user', value: 'opus', locked: false, overrides: [] }] };

test('renderReport produces a single self-contained HTML document', () => {
  const html = renderReport(inventory, merged);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<style>/);            // CSS inlined
  assert.doesNotMatch(html, /<link |src="http/); // no external requests
  assert.match(html, /model/);              // a merged row rendered
  assert.match(html, /mac/);                // machine meta
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/report.test.js`
Expected: FAIL ("Cannot find module ... reporter/index.js").

- [ ] **Step 3: Write `src/reporter/index.js`**

```js
import { esc } from './html.js';
import { renderMergedRows, renderStrata } from './sections.js';

// Paste the contents of the <style> block from docs/reference/design-mockup.html
// here, verbatim (without the surrounding <style> tags). Class names already align.
const STYLES = `
/* >>> paste mockup CSS here <<< */
`;

export function renderReport(inventory, merged) {
  const { machine, scopes } = inventory;
  const present = scopes.filter(s => s.present).length;
  const overridden = merged.leaves.filter(l => l.type === 'scalar' && l.overrides.length).length;
  const locked = merged.leaves.filter(l => l.locked || (l.entries ?? []).some(e => e.locked)).length;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>claude-config-view — ${esc(machine.hostname)}</title>
<style>${STYLES}</style></head><body>
<main class="main">
  <div class="top"><h1>Configuration snapshot</h1>
    <div class="meta"><b>${esc(machine.hostname)}</b> · ${esc(machine.platform)}<br>${esc(machine.projectDir)}<br>${esc(machine.timestamp)}</div></div>
  <section class="hero"><h2>What's stacked on this machine</h2>
    <p>Six precedence layers, highest on top.</p>
    ${renderStrata(scopes)}
    <div class="summary">
      <div class="stat"><div class="n">${present}</div><div class="k">scopes present</div></div>
      <div class="stat"><div class="n">${merged.leaves.length}</div><div class="k">effective keys</div></div>
      <div class="stat"><div class="n">${overridden}</div><div class="k">overridden</div></div>
      <div class="stat"><div class="n">${locked}</div><div class="k">locked by policy</div></div>
    </div></section>
  <div class="sec-h"><h3>Merged session</h3><span class="pill">★ effective + provenance</span></div>
  ${renderMergedRows(merged.leaves)}
  <div class="footnote">read-only snapshot · nothing was written · re-run to refresh</div>
</main></body></html>`;
}
```

- [ ] **Step 4: Copy the CSS**

Open `docs/reference/design-mockup.html`, copy everything between `<style>` and `</style>`, and paste it into `STYLES` (replacing the `/* >>> paste mockup CSS here <<< */` line).

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/report.test.js`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/reporter/index.js test/report.test.js
git commit -m "feat(reporter): assemble self-contained Cascade report"
```

---

## Task 12: CLI entry point

**Files:**
- Create: `bin/cli.js`
- Test: `test/cli.test.js`

- [ ] **Step 1: Write the failing test `test/cli.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../bin/cli.js';

test('parseArgs reads --out, --project, --open with defaults', () => {
  assert.deepEqual(parseArgs([]), { out: 'claude-config-report.html', project: process.cwd(), open: false });
  const a = parseArgs(['--out', 'r.html', '--project', '/p', '--open']);
  assert.deepEqual(a, { out: 'r.html', project: '/p', open: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/cli.test.js`
Expected: FAIL ("Cannot find module ... bin/cli.js" or parseArgs undefined).

- [ ] **Step 3: Write `bin/cli.js`**

```js
#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { collect } from '../src/collector/index.js';
import { mergeConfig } from '../src/merge/index.js';
import { renderReport } from '../src/reporter/index.js';

export function parseArgs(argv) {
  const out = { out: 'claude-config-report.html', project: process.cwd(), open: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') out.out = argv[++i];
    else if (argv[i] === '--project') out.project = argv[++i];
    else if (argv[i] === '--open') out.open = true;
  }
  return out;
}

export function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const inventory = collect({
    platform: process.platform,
    home: homedir(),
    projectDir: resolve(args.project),
    env: process.env,
  });
  const merged = mergeConfig(inventory.layers);
  const html = renderReport(inventory, merged);
  const outPath = resolve(args.out);
  writeFileSync(outPath, html);
  console.log(`Wrote ${outPath}`);
  return outPath;
}

// Only run when invoked directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) run();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/cli.test.js`
Expected: PASS (1 test).

- [ ] **Step 5: End-to-end smoke test (manual)**

Run: `node bin/cli.js --out /tmp/ccv.html`
Expected: prints `Wrote /tmp/ccv.html`. Open the file in a browser — sidebar-less single column for now is fine; verify the strata, stats, and merged rows render with real local config.

- [ ] **Step 6: Commit**

```bash
git add bin/cli.js test/cli.test.js
git commit -m "feat(cli): wire collect → merge → render → write"
```

---

## Task 13: Full test sweep + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the whole suite**

Run: `node --test`
Expected: all tests PASS.

- [ ] **Step 2: Write `README.md`**

````markdown
# claude-config-view

Read-only viewer for every Claude Code configuration scope on your machine, and
how they merge at session start. Generates one self-contained HTML report.

## Usage

```bash
node bin/cli.js --open
# or, after `npm link`:
npx claude-config-view --open
```

Flags:
- `--out <path>` — output file (default `claude-config-report.html`)
- `--project <dir>` — project root to inspect (default: current directory)
- `--open` — open the report in your default browser

Read-only: it never writes to your Claude Code config.

## Development

```bash
node --test
```
````

- [ ] **Step 3: Commit**

```bash
git commit -am "docs: add README"
```

---

## Self-Review Notes

- **Spec coverage:** Collector reads settings (5 scopes incl. managed/cli status), memory, rules, agents, commands, skills, mcp, hooks, plugins, output styles, keybindings, worktreeInclude, env (Tasks 7–8). Merge implements scalar override + array union + managed lock (Tasks 3–4). Reporter implements the Cascade visuals — strata, spine, rows, tokens, locked badges — self-contained (Tasks 9–11). CLI is cross-platform via injected `platform`/`home` (Tasks 5, 12).
- **`--open` implementation:** left to the engineer per-OS (`open`/`xdg-open`/`start`); optional. Not required for the smoke test.
- **CSS source of truth:** mockup file, copied verbatim in Task 11 (avoids duplicating ~200 lines of CSS here while keeping class names aligned with `sections.js`).
- **Sidebar nav:** the mockup includes a sidebar; v1 report renders the main column. Adding the static sidebar markup is a trivial follow-up using the same data and is intentionally out of the minimal vertical slice.
```
