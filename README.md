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
