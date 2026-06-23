# Claude Config Viewer — Design

**Date:** 2026-06-23
**Status:** Approved design, pending implementation plan
**Author:** Brainstormed with Claude

## Summary

A read-only, cross-platform tool that inventories **every** Claude Code
configuration source on a machine and shows how they merge at session start.
It runs as a **Node CLI** that reads all config scopes, computes the effective
configuration with full provenance, and emits **one self-contained HTML file**
(data + CSS + JS inlined) viewable in any browser on any OS.

The output is a "sidebar app": navigate sections in a left rail; the centerpiece
is the **Merged session view** — for every setting, the winning value, where it
came from, and what it overrode.

## Goals

- Show all configuration scopes and what the user has configured in each.
- Show the combined "session start" picture: effective value + provenance, with
  overridden values revealable.
- Be genuinely portable: run on macOS / Linux / Windows; the HTML output opens
  on any device.
- Read-only and safe — never writes to the user's config.

## Non-Goals (YAGNI)

- No editing of configuration (read-only only).
- No live server / no auto-refresh (re-run the CLI to refresh).
- No aggregation across multiple machines (each run reflects the local machine).
- No native desktop packaging (Electron/Tauri).
- No WASM (browser sandbox can't read local files; static report needs no heavy
  compute — WASM would add friction, not remove it).

## Decisions (resolved during brainstorming)

| Question | Decision |
|----------|----------|
| Cross-device meaning | Portable viewer; reads the **local** machine's config. |
| Interaction scope | **Read-only** viewer. |
| Merge view depth | **Effective value + provenance** (winning value + overridden values + their sources). |
| Collector runtime | **Node CLI** (already present with Claude Code; fast to iterate). |
| Output | **Self-contained HTML** (single file, all inlined). |
| Layout | **Sidebar app** (left nav + main content). |
| Override display | **Collapsed by default**, with an "expand all" toggle. Settings with no overrides show only their value. |

## Architecture

Three small, independently testable units with clean interfaces:

```
  ┌────────────┐     inventory      ┌──────────────┐   merged+inventory   ┌────────────┐
  │ Collector  │ ─────────────────▶ │ Merge engine │ ───────────────────▶ │  Reporter  │
  │ (fs + os)  │                    │  (pure fn)   │                      │ (HTML out) │
  └────────────┘                    └──────────────┘                      └────────────┘
```

### Collector
- **Responsibility:** Locate and read every config source on this machine.
  OS-aware path resolution (macOS / Linux/WSL / Windows). Reads files, scans
  directories (agents, commands, skills, rules, output-styles, plugins),
  captures relevant environment variables from the live process environment.
- **Output:** A raw structured **inventory** object: per source — scope, file
  path, existence, parse status (ok / missing / malformed + error), and parsed
  content.
- **Knows nothing about** merging or HTML.
- **Design note:** Data-driven. Read whatever exists on disk; never assume a
  fixed field set. Unknown settings keys are still captured and displayed so the
  tool stays correct as Claude Code evolves.

### Merge engine
- **Responsibility:** Pure function `(inventory) -> mergedConfig`. Apply
  precedence and merge rules; produce, for every setting, the effective value
  plus an ordered list of overridden values with their sources.
- **No I/O.** Highest-value unit to unit-test against fixture inventories.

### Reporter
- **Responsibility:** Take inventory + merged result, render the self-contained
  HTML (sidebar app). All CSS/JS/data inlined into one file.
- **Knows nothing about** file reading or merge rules.

### CLI entry
- `npx claude-config-view` / `node bin/cli.js`.
- Flags (minimal): output path (default `claude-config-report.html`),
  `--open` to open in the default browser, `--project <dir>` to point at a
  project root other than cwd.
- Orchestrates collector → merge → reporter, writes the file, prints its path.

## Configuration coverage ("every possible configuration")

Grounded in `docs/reference/claude-config-reference.md` (the compiled
enumeration). The collector targets, at minimum:

- **Settings files** across all 5 scopes — Managed/enterprise, CLI flags
  (where discoverable), Project-local (`.claude/settings.local.json`),
  Project-shared (`.claude/settings.json`), User (`~/.claude/settings.json`) —
  with OS-specific managed paths.
- **All settings.json fields** — model, effortLevel, outputStyle, permissions,
  env, hooks, statusLine, apiKeyHelper, git/attribution, cleanupPeriodDays,
  enabledPlugins, claudeMdExcludes, and any others present (unknown keys
  included).
- **Memory** — CLAUDE.md at every scope (managed, user, project, local,
  subdirectory), `@path` imports (resolved, depth-aware), AGENTS.md.
- **Rules** — `.claude/rules/` and `~/.claude/rules/` (with path frontmatter).
- **Auto memory** — `MEMORY.md` presence per project.
- **Subagents** — `.claude/agents/`, `~/.claude/agents/`, plugin agents.
- **Slash commands & Skills** — project / user / plugin.
- **MCP servers** — `.mcp.json` (project), `~/.claude.json` (user), plugin.
- **Hooks** — all sources and events.
- **Plugins & marketplaces** — enabled plugins, `extraKnownMarketplaces`, and
  every plugin **component**: skills, commands, agents, hooks, `.mcp.json`,
  `.lsp.json` (language servers), `output-styles/`, `monitors/`, `bin/`
  (PATH additions), and the plugin's default `settings.json`.
- **Output styles, Keybindings, Status line.**
- **Worktree config** — `.worktreeinclude` (files copied into new worktrees).
- **Environment variables** — `ANTHROPIC_*`, `CLAUDE_*`, timeouts, legacy
  toggles, actually present in the environment.

> The exact field/path lists in the reference were compiled from docs and should
> be re-verified against current official docs during implementation. The
> collector's data-driven design means coverage degrades gracefully (unknown =
> still shown) rather than breaking.

## Output HTML — the sidebar app

Left sidebar navigation → main content pane. Sections:

1. **Overview** — scopes detected, presence map (which sources exist), counts.
2. **★ Merged session** — the centerpiece. Grouped by category (Core,
   Permissions, Env, Hooks, …). Each setting: effective value + source badge;
   settings that overrode others show a collapsed `N overrides ▸` (expandable),
   plus a global "expand all". Precedence legend at top.
3. **By scope** — per-file breakdown of what each scope declares.
4. **Memory** — CLAUDE.md chain (concatenation order), imports, AGENTS.md.
5. **Agents / Commands / Skills**.
6. **MCP servers**.
7. **Hooks**.
8. **Env vars**.
9. **Plugins**.
10. **Keybindings**.

## Merge rules (in the engine)

- **Scalars** (model, outputStyle, …): highest-precedence scope wins; losers
  recorded as overrides with their source.
  Precedence (high → low): Managed → CLI → Project-local → Project-shared →
  User → **Plugin defaults**. Plugin-shipped `settings.json` values act as the
  lowest layer of defaults (applied only where no user/project/managed value
  exists). Exact plugin-vs-user ordering to be re-verified during
  implementation.
- **Objects** (env, hooks config): deep-merge; provenance tracked per key.
- **Arrays** (permissions allow/deny/ask): **union** across scopes; each entry
  tagged with its source. Managed `deny` flagged as un-overridable.
- **Hooks across scopes:** all matching hooks combine (none override); order
  reflects source precedence.
- **CLAUDE.md:** concatenation order shown (managed → user → project → local →
  subdir), not override.

## Errors & edge cases

- **Missing file** → scope marked "not present" (not an error).
- **Malformed JSON** → flagged inline in that scope with the parse error; the
  rest of the report still renders.
- **No config at all** → friendly empty state.
- **Permission/read errors** → surfaced per source, non-fatal.

## Testing

- **Merge engine:** unit tests against fixture inventories (scalar override,
  object deep-merge, array union, managed-deny un-overridable, empty). Highest
  value.
- **Collector:** tested against a temp fixture directory tree (simulated scopes)
  with OS-path resolution stubbed/parameterized.
- **Reporter:** smoke test — renders without throwing; key sections present;
  output is a single self-contained file (no external references).

## Project layout (proposed)

```
bin/cli.js              # entry point
src/collector/          # fs + os reading → inventory
src/merge/              # pure merge engine
src/reporter/           # inventory + merged → self-contained HTML
test/                   # unit + fixtures
docs/reference/claude-config-reference.md
```

## Open implementation questions (defer to planning)

- Exact CLI flag surface beyond the minimal set.
- Whether to template HTML with a tiny lib or hand-roll string building (lean
  toward zero-dependency hand-roll for portability).
- How deep to resolve `@path` imports for display (cap at the documented depth).
