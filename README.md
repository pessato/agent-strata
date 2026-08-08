# agent-strata

**See every layer of your coding agent's configuration, and which one actually wins.**

Claude Code reads settings from five places on your machine. When it does something you didn't ask for — a permission you never granted, a model you didn't pick, a hook firing out of nowhere — finding out *why* means opening all five files and merging them in your head.

`agent-strata` does that merge and hands you the answer as a single HTML page: every effective setting, which layer set it, and what that layer overrode to get there.

```bash
npx agent-strata --open
```

No install, no config, nothing written to your machine except the report.

---

## What you get

One self-contained HTML file — no server, no external requests — with:

- **The precedence column.** All six layers at a glance, including the ones that aren't there. "No project settings here" is often the whole answer.
- **Every effective setting, with provenance.** Each row shows the winning value, the layer that set it, and the values it beat — struck through, with their source paths.
- **Permission unions.** `permissions.allow` and `deny` don't override, they accumulate. Each entry is tagged with where it came from, and managed-policy denials are marked locked.
- **The full inventory.** Memory files, subagents, skills, slash commands, rules, output styles, MCP servers, hooks, plugins, keybindings, and agent-related environment variables.
- **Broken layers, called out.** A settings file that exists but won't parse is flagged rather than quietly skipped — usually the bug you were looking for.

## How precedence works

Strongest first. A weaker layer only wins where no stronger one spoke.

| Layer | Source |
|---|---|
| Managed · enterprise | `/Library/Application Support/ClaudeCode/managed-settings.json` (macOS) · `/etc/claude-code/` (Linux) · `%PROGRAMDATA%\ClaudeCode\` (Windows) |
| CLI flags | Per-session, not inspectable after start — shown for completeness |
| Project-local | `.claude/settings.local.json` |
| Project-shared | `.claude/settings.json` |
| User global | `~/.claude/settings.json` |
| Plugin defaults | Supplied by enabled plugins |

## Usage

```bash
agent-strata [options]
```

| Option | Effect |
|---|---|
| `--out <path>` | Where to write the report (default `strata-report.html`) |
| `--project <dir>` | Project root to inspect (default: current directory) |
| `--provider <id>` | Which agent to inspect (default `claude`) |
| `--open` | Open the report in your default browser |
| `-h, --help` | Usage |
| `-v, --version` | Version |

Install it properly if you'll use it more than once:

```bash
npm i -g agent-strata
```

## Safety

**It only reads.** Nothing in your agent's configuration is written, moved, or changed. The only file it creates is the report.

**Secrets are redacted.** The report is meant to be shared — attached to a ticket, pasted at a colleague — so values under credential-bearing keys (`ANTHROPIC_API_KEY`, `*_TOKEN`, `*_SECRET`, and friends) are replaced with `«redacted»` before rendering. The key name survives, because *whether* it is set is the diagnostic signal; its value never is.

It does still show absolute paths and your hostname. Skim before posting it somewhere public.

## Requirements

Node 18 or newer. No dependencies.

## Adding another agent

Everything Claude-specific lives in one file: [`src/providers/claude.js`](src/providers/claude.js). It declares the precedence scopes, where each settings file lives per platform, and which directories hold skills, agents, and the rest. A second agent is a sibling file exporting the same shape plus one line in the registry — no other module changes.

Codex support is the next one planned.

## Development

```bash
node --test
```

Releases are cut from Conventional Commits — see [RELEASING.md](RELEASING.md) and the
[changelog](CHANGELOG.md).

MIT licensed.
