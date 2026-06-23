# Claude Code Configuration: Complete Enumeration

**Authoritative reference for every configuration source, location, field, and precedence rule in Claude Code.**

Based on official documentation as of June 2026. Source: https://code.claude.com/docs

---

## 1. SETTINGS FILES: LOCATIONS & PRECEDENCE

### 1.1 File Locations by Scope

| Scope | macOS | Linux/WSL | Windows | Precedence |
|-------|-------|-----------|---------|-----------|
| **Managed Policy** | `/Library/Application Support/ClaudeCode/` | `/etc/claude-code/` | `C:\Program Files\ClaudeCode\` | 1 (Highest) |
| **Command Line** | CLI flags (`--model`, `--effort`, etc.) | CLI flags | CLI flags | 2 |
| **Local** (Project) | `.claude/settings.local.json` | `.claude/settings.local.json` | `.claude/settings.local.json` | 3 |
| **Project** (Shared) | `.claude/settings.json` | `.claude/settings.json` | `.claude/settings.json` | 4 |
| **User** (Global) | `~/.claude/settings.json` | `~/.claude/settings.json` | `%USERPROFILE%\.claude\settings.json` | 5 (Lowest) |

### 1.2 Managed Settings Locations

- **File**: `managed-settings.json` at the system-managed location
- **Precedence**: Cannot be overridden (highest)
- **Deployment**: Via MDM, Group Policy, Ansible, or similar enterprise tools
- **Content**: Can include `claudeMd` key with inline CLAUDE.md instructions

### 1.3 Precedence Summary (Settings Only)

1. **Managed settings** (system-deployed, immutable)
2. **CLI arguments** (`--model`, `--effort`, `--settings`, etc.) — temporary session override
3. **Local project** (`.claude/settings.local.json` — gitignored, personal)
4. **Project shared** (`.claude/settings.json` — committed to git)
5. **User global** (`~/.claude/settings.json` — personal, all projects)

**Note:** Array settings (e.g., `permissions.allow`, `permissions.deny`, `env`) **merge across scopes**. Scalar settings (e.g., `model`, `outputStyle`) use the **most specific value**.

---

## 2. SETTINGS.JSON FIELDS: COMPLETE ENUMERATION

### 2.1 Core Behavior Settings

```json
{
  "model": "claude-opus-4-1",           // Model selection (string)
  "effortLevel": "high",                 // low|medium|high|xhigh|max|auto
  "outputStyle": "Default",              // Default|Explanatory|Learning|Proactive|Custom
  "autoMemoryEnabled": true,             // Enable Claude's auto-learning memory (boolean)
  "autoMemoryDirectory": "~/path",       // Custom auto-memory storage location (string/path)
  "editorMode": "vim",                   // vim|emacs|default (text editor mode)
  "enabledPlugins": {
    "plugin-name@marketplace": true,     // Plugin enable/disable map
    "context7@claude-plugins-official": true
  },
  "disableAllHooks": false,              // Disable all hooks system-wide (boolean)
  "claudeMdExcludes": [
    "**/monorepo/CLAUDE.md",             // Glob patterns to exclude from CLAUDE.md loading
    "/absolute/path/**"
  ]
}
```

### 2.2 API & Authentication

```json
{
  "apiKeyHelper": {                      // OAuth or custom API key sourcing
    "command": "op read op://vault/secret"
  }
}
```

**Note:** `ANTHROPIC_API_KEY` environment variable is the primary auth method.

### 2.3 Permissions System

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test *)",
      "Bash(npm run *)",
      "Read(~/.zshrc)",
      "Read(config/*.json)",
      "Edit(src/**/*.ts)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(curl *)",
      "Read(.env)"
    ],
    "defaultMode": "auto",               // auto|plan|dontAsk|bypassPermissions|acceptEdits
    "defaultAsk": "always"               // always|ifNoMatch (prompt if no explicit allow/deny)
  }
}
```

**Permission Classes:**
- `Bash(pattern)` — Shell commands
- `Edit(pattern)` / `Write(pattern)` — File editing/creation
- `Read(pattern)` — File reading
- `MCP(server_name.tool_name)` — MCP tool access
- `Branch` — Git branch operations
- `Commit` / `Push` — Git commits/pushes
- `Notebook` — Notebook cells
- Pattern wildcards: `*` (any), `**` (any directory), `?` (single char)

**Modes:**
- `auto` — Auto-approve based on classifier + CLAUDE.md boundaries
- `plan` — Show diff/plan before executing
- `dontAsk` — Only pre-approved tools
- `acceptEdits` — Auto-approve file edits
- `bypassPermissions` — Skip all checks

### 2.4 Environment Variables

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "sk-ant-...",
    "ANTHROPIC_MODEL": "claude-opus-4-1",
    "ANTHROPIC_BASE_URL": "https://api.anthropic.com",
    "API_TIMEOUT_MS": "600000",
    "BASH_DEFAULT_TIMEOUT_MS": "120000",
    "CLAUDE_CODE_AUTO_CONNECT_IDE": "true",
    "CLAUDE_CODE_EFFORT_LEVEL": "high",
    "MAX_THINKING_TOKENS": "10000",
    "CUSTOM_VAR": "value"
  }
}
```

### 2.5 Hooks System

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "./setup.sh",
            "timeout": 30,
            "statusMessage": "Setting up environment..."
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "if": "Bash(rm *)",
        "hooks": [
          {
            "type": "command",
            "command": "./validate.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "prettier --write"
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt|idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code'"
          }
        ]
      }
    ]
  }
}
```

**Hook Types:**
- `command` — Shell script (stdin: JSON event, stdout: JSON response)
- `http` — HTTP POST to URL endpoint
- `mcp_tool` — Call tool on connected MCP server
- `prompt` — Single-turn LLM evaluation
- `agent` — Subagent with tool access

**Hook Events (Lifecycle):**
- `SessionStart` — Session begins/resumes
- `SessionEnd` — Session ends
- `UserPromptSubmit` — Before Claude processes user input
- `PreToolUse` — Before tool executes
- `PostToolUse` — After tool succeeds
- `PostToolUseFailure` — After tool fails
- `PermissionRequest` — Before permission prompt
- `Stop` — Claude finishes working
- `StopFailure` — Stop event with error
- `Notification` — Claude awaits input/permission
- `InstructionsLoaded` — CLAUDE.md files loaded
- `FileChanged` — Watched file changes
- `WorktreeCreate` — New worktree created
- `Elicitation` — MCP elicitation dialog events

### 2.6 Status Line

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx @owloops/claude-powerline@latest"
  }
}
```

**Alternative:**
```json
{
  "statusLine": "disabled"
}
```

### 2.7 Git & Attribution

```json
{
  "git": {
    "disableAttribution": false,  // Skip "Co-authored-by" trailer
    "includeCoAuthoredBy": true   // Include co-author in commits
  },
  "attribution": {
    "commit": "",  // Commit attribution string
    "pr": ""       // PR attribution string
  }
}
```

### 2.8 Context & Performance

```json
{
  "cleanupPeriodDays": 30,              // Auto-cleanup session data older than N days
  "enablePromptCaching": true,          // Use prompt caching (Anthropic-specific)
  "disablePromptCaching": false,        // Override to disable caching
  "skipAutoPermissionPrompt": true,     // Don't ask for unspecified permissions in auto mode
  "skipDangerousModePermissionPrompt": true, // Skip warning for permissive settings
  "skipWorkflowUsageWarning": false     // Skip warnings about workflow usage
}
```

### 2.9 Features & Experimental

```json
{
  "voiceEnabled": true,                 // Enable voice dictation
  "agentPushNotifEnabled": true,        // Enable push notifications for background agents
  "agentTeamsEnabled": true,            // Enable agent teams (experimental)
  "sandboxEnabled": true                // Use sandboxed execution environment
}
```

---

## 3. OTHER CONFIGURATION SURFACES (Beyond settings.json)

### 3.1 CLAUDE.md Memory Files

#### Locations & Load Order

| Scope | Location | Committed? | Load Timing | Precedence |
|-------|----------|-----------|------------|-----------|
| **Managed Policy** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) or `/etc/claude-code/CLAUDE.md` (Linux) or `C:\Program Files\ClaudeCode\CLAUDE.md` (Windows) | N/A | Session start | 1 (Earliest) |
| **User Global** | `~/.claude/CLAUDE.md` | No | Session start | 2 |
| **Project Shared** | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Yes | Session start | 3 |
| **Project Local** | `./CLAUDE.local.md` | No (gitignored) | Session start | 4 |
| **Subdirectory** | `./subdir/CLAUDE.md` | Yes | On-demand (when Claude enters subdir) | 5 |
| **User Rules** | `~/.claude/rules/` | No | Session start or on-demand | With user-level |
| **Project Rules** | `./.claude/rules/` | Yes | Session start or on-demand | With project-level |

**Note:** All files are **concatenated** (not overridden). Closest-to-working-directory files load last.

#### Import Syntax

```markdown
@README.md
@package.json
@~/.claude/shared-instructions.md
@docs/architecture.md
```

**Max depth:** 4 levels of recursive imports

#### Special Structures

```markdown
<!-- HTML comments stripped before context injection, but visible when viewing file directly -->

@AGENTS.md  <!-- Import from AGENTS.md if existing -->
```

### 3.2 Auto Memory

#### Storage

**Location:** `~/.claude/projects/<project_id>/memory/`

- `<project_id>` derived from git repository (shared across all worktrees)
- **Entrypoint:** `MEMORY.md` (first 200 lines / 25KB loaded at session start)
- **Topic files:** `debugging.md`, `patterns.md`, etc. (loaded on-demand by Claude)

**Custom directory:** Set `autoMemoryDirectory` in settings.json

#### Load Behavior

- First session: Auto memory is **enabled by default** (as of v2.1.59+)
- Toggle: `/memory` command or `autoMemoryEnabled` setting
- Disable via env: `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`

### 3.3 Rules (Path-Scoped Instructions)

#### Location

`.claude/rules/` directory (project-level or `~/.claude/rules/` for user-level)

#### Frontmatter

```yaml
---
paths:
  - "src/api/**/*.ts"
  - "tests/**/*.test.ts"
  - "*.md"
---

# API Design Rules
...
```

**Scope:** Only load when Claude reads matching files (lazy loading)

#### Symlink Support

```bash
ln -s ~/shared-rules .claude/rules/shared
ln -s ~/company-rules/security.md .claude/rules/security.md
```

---

### 3.4 Hooks Configuration

#### File Locations

| Location | Scope | Precedence |
|----------|-------|-----------|
| `~/.claude/settings.json` `hooks` key | User | Lowest |
| `.claude/settings.json` `hooks` key | Project | Medium |
| `.claude/settings.local.json` `hooks` key | Project-Local | Medium-high |
| Plugin `hooks/hooks.json` | When plugin enabled | High |
| Skill/agent frontmatter `hook` field | While active | Inline |

#### Structure

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "Tool|Pattern",
        "if": "Bash(rm *)",  // Permission rule filter
        "hooks": [
          {
            "type": "command",
            "command": "./hook.sh",
            "timeout": 30,
            "statusMessage": "Processing..."
          }
        ]
      }
    ]
  }
}
```

**Matcher patterns:**
- `""` or omitted — Match all
- `Tool1|Tool2` — Exact match on tool name
- `^regex.*` — Regex matching
- `mcp__server__tool` — MCP tool naming

---

### 3.5 Keybindings

#### Location

`~/.claude/keybindings.json`

#### Structure

```json
{
  "$schema": "https://www.schemastore.org/claude-code-keybindings.json",
  "bindings": [
    {
      "context": "Chat",
      "bindings": {
        "ctrl+e": "chat:externalEditor",
        "ctrl+u": null,
        "shift+tab": "chat:cycleMode"
      }
    }
  ]
}
```

**Contexts:** Chat, Global, Confirmation, Settings, Help, Tabs, Transcript, HistorySearch, Task, etc. (20+ total)

**Auto-detection:** Changes applied without restart

---

### 3.6 Skills & Commands

#### Locations

- **Skills (directory-based):** `.claude/skills/my-skill/SKILL.md` or `~/.claude/skills/`
- **Commands (flat):** `.claude/commands/deploy.md` (legacy, skills preferred)
- **Plugin skills:** `plugin-dir/skills/name/SKILL.md`

#### Frontmatter

```yaml
---
description: What Claude should know about when to invoke this
user-invocable: true               # User can call via /name
disable-model-invocation: false    # Claude won't auto-invoke
argument-hint: <target>            # CLI hint for arguments
hook: PreToolUse                   # Inline hook type
---

Skill instructions...
```

#### Scope

- User skills: `~/.claude/skills/` — All projects
- Project skills: `.claude/skills/` — This project only
- Plugin skills: `plugin-dir/skills/` — When plugin enabled

---

### 3.7 Subagents (Custom Agents)

#### Configuration Files

- **User-level:** `~/.claude/agents/agent-name/agent.json`
- **Project-level:** `.claude/agents/agent-name/agent.json`
- **Plugin-level:** `plugin-dir/agents/agent-name/agent.json`

#### Structure

```json
{
  "name": "security-reviewer",
  "description": "Audits code for security issues",
  "systemPrompt": "You are a security expert...",
  "model": "claude-opus-4-1",
  "tools": {
    "allow": ["Read", "Edit"],
    "deny": ["Bash(rm *)"]
  },
  "maxTokens": 8000,
  "autoMemoryEnabled": true,
  "autoMemoryDirectory": "~/.claude/projects/<project>/agents/security-reviewer/memory/"
}
```

#### Invocation

- **User:** `/agent agent-name`
- **Model:** Automatic delegation when task matches description
- **Subagent invocation:** `!agent:agent-name`

---

### 3.8 MCP Servers

#### Configuration Files

| Location | Scope | Precedence |
|----------|-------|-----------|
| `.mcp.json` (project root) | Project, shared | Highest |
| `~/.claude.json` (home) | User, global | Lowest |
| Plugin `.mcp.json` | When plugin enabled | Medium |

#### Structure

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "local-server": {
      "command": "/usr/local/bin/mcp-server",
      "args": ["--port", "3000"],
      "type": "stdio",
      "cwd": "/path/to/server"
    }
  }
}
```

**Env var syntax:** `${ENV_VAR}` — substituted from shell environment at startup

#### MCP Tool Access in Permissions

```json
{
  "permissions": {
    "allow": ["MCP(github.write_issue)"],
    "deny": ["MCP(github.delete_*)"]
  }
}
```

**Tool naming:** `mcp__<server>__<tool>`

---

### 3.9 Output Styles

#### Locations

| Scope | Location |
|-------|----------|
| Built-in | `Default`, `Explanatory`, `Learning`, `Proactive` |
| User | `~/.claude/output-styles/custom-style.md` |
| Project | `.claude/output-styles/custom-style.md` |
| Plugin | `plugin-dir/output-styles/style.md` |

#### Structure

```markdown
---
name: "Custom Style Name"
description: "Shown in /config picker"
keep-coding-instructions: true    # Keep software engineering defaults
force-for-plugin: false           # Auto-apply when plugin enabled
---

Instructions to add to system prompt...
```

**Behavior:** Modifies system prompt (replaces existing, unless `keep-coding-instructions: true`)

---

### 3.10 Plugins

#### Manifest Location

`.claude-plugin/plugin.json` (at plugin root)

#### Structure

```json
{
  "name": "my-plugin",
  "description": "Does something useful",
  "version": "1.0.0",
  "author": {
    "name": "You",
    "email": "you@example.com"
  },
  "homepage": "https://github.com/user/my-plugin",
  "repository": "https://github.com/user/my-plugin",
  "license": "MIT"
}
```

#### Component Directories (at plugin root)

| Directory | Contents |
|-----------|----------|
| `skills/` | `skill-name/SKILL.md` + supporting files |
| `commands/` | `command-name.md` (legacy) |
| `agents/` | `agent-name/agent.json` |
| `hooks/` | `hooks.json` |
| `.mcp.json` | MCP server configs |
| `.lsp.json` | Language server configs |
| `output-styles/` | Style markdown files |
| `monitors/` | `monitors.json` for background monitoring |
| `bin/` | Executables added to Bash `PATH` |
| `settings.json` | Default settings when plugin enabled |

**Note:** `ONLY plugin.json` goes in `.claude-plugin/` directory. All other files at plugin root.

#### Plugin Marketplaces

**User config:** `~/.claude/settings.json` or `.claude/settings.json`

```json
{
  "extraKnownMarketplaces": {
    "my-marketplace": {
      "source": {
        "source": "github",
        "repo": "user/plugins-repo"
      }
    },
    "private": {
      "source": {
        "source": "url",
        "url": "https://example.com/marketplace.json"
      }
    }
  }
}
```

---

## 4. ENVIRONMENT VARIABLES

### 4.1 Precedence

1. Environment variable (e.g., `ANTHROPIC_API_KEY`)
2. CLI flag (e.g., `--model`, `--effort`)
3. `settings.json` `env` key
4. System environment
5. Default

### 4.2 All Known Environment Variables

#### Authentication & API

| Variable | Purpose | Type |
|----------|---------|------|
| `ANTHROPIC_API_KEY` | API key for Anthropic | string |
| `ANTHROPIC_AUTH_TOKEN` | OAuth or corporate proxy Bearer token | string |
| `ANTHROPIC_BASE_URL` | Custom API endpoint | URL |
| `ANTHROPIC_MODEL` | Override default model | string |

#### Behavior Control

| Variable | Purpose | Value |
|----------|---------|-------|
| `CLAUDE_CODE_EFFORT_LEVEL` | Effort level override | low\|medium\|high\|xhigh\|max\|auto |
| `CLAUDE_CODE_AUTO_CONNECT_IDE` | Auto-connect to IDE | true\|false |
| `CLAUDE_CODE_DISABLE_ARTIFACT` | Disable artifact publishing | 1 |
| `CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN` | Use classic renderer | 1 |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | Disable auto memory | 1 |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | Disable Anthropic beta headers | 1 |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | Override auto-compact threshold | number (tokens) |
| `CLAUDE_CODE_DEBUG_LOG_LEVEL` | Log level | verbose\|debug\|info\|warn\|error |
| `CLAUDE_CODE_NEW_INIT` | Interactive `/init` mode | 1 |
| `CLAUDE_CODE_PROFILE_QUERY` | Enable per-query profiling | 1 |
| `CLAUDE_CODE_STREAMING_TEXT` | Enable streaming text | 1 |
| `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` | Load CLAUDE.md from `--add-dir` | 1 |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable experimental agent teams | 1 |
| `CLAUDECODE` | Set to 1 when in Claude Code subprocess | 1 |

#### Timeouts & Performance

| Variable | Purpose | Default | Unit |
|----------|---------|---------|------|
| `API_TIMEOUT_MS` | API request timeout | 600000 | ms (10 min) |
| `BASH_DEFAULT_TIMEOUT_MS` | Bash command timeout | 120000 | ms (2 min) |
| `MAX_THINKING_TOKENS` | Extended thinking limit | 10000 | tokens |

#### Feature Toggles (Legacy)

| Variable | Disable |
|----------|---------|
| `DISABLE_AUTOUPDATER=1` | Auto-updates |
| `DISABLE_TELEMETRY=1` | Analytics/telemetry |
| `DISABLE_AUTOCOMPACT=1` | Auto-compaction |

---

## 5. MERGE & PRECEDENCE RULES

### 5.1 Settings Merging

**Scalar fields** (single value):
- Use the **most specific scope's value**
- Precedence: Managed > CLI > Local > Project > User

**Array fields** (permissions.allow, permissions.deny, env):
- **Deep merge** — values from all scopes combine
- No override; exception is explicit `deny` blocking explicit `allow` in same scope

**Example:**
```json
// User settings
{ "permissions": { "allow": ["Bash(npm *)"] } }

// Project settings
{ "permissions": { "allow": ["Bash(yarn *)"] } }

// Result: Both npm and yarn allowed
```

### 5.2 Hook Merging

**Source precedence** (all execute):
1. Managed settings hooks
2. Project settings hooks
3. Local project settings hooks
4. Plugin hooks (in load order)
5. Skill/agent inline hooks

**Matching:** All matchers evaluated; all matching hooks execute in order.

### 5.3 CLAUDE.md Loading

**Concatenation order** (all content loaded):
1. Managed policy CLAUDE.md
2. User CLAUDE.md (`~/.claude/CLAUDE.md`)
3. Project CLAUDE.md (`./CLAUDE.md` or `./.claude/CLAUDE.md`)
4. Project local CLAUDE.md (`./CLAUDE.local.md`)
5. Nested CLAUDE.md files (on-demand, by subdirectory)

**Context token budget:** CLAUDE.md survives compaction and re-injects

**Import expansion:** `@path` syntax expanded inline; max 4 levels deep

### 5.4 Plugins & Components

**Skills precedence:**
1. Project skill (`.claude/skills/name/`)
2. User skill (`~/.claude/skills/name/`)
3. Plugin skill (`plugin/skills/name/`)

If multiple match, **closest to working directory** wins.

**Agents precedence:**
1. Project agent (`.claude/agents/name/`)
2. User agent (`~/.claude/agents/name/`)
3. Plugin agent (`plugin/agents/name/`)

**Output styles precedence:**
1. Project style (`.claude/output-styles/name.md`)
2. User style (`~/.claude/output-styles/name.md`)
3. Plugin style (with `force-for-plugin: true`)
4. Built-in style

**MCP servers:** `.mcp.json` (project) overrides `~/.claude.json` (user)

---

## 6. SPECIAL PATHS & PLACEHOLDERS

### 6.1 Environment Variable Substitution

```json
{
  "env": {
    "TOKEN": "${GITHUB_TOKEN}",
    "PATH": "${PATH}:/custom/bin"
  }
}
```

**Syntax:** `${VAR_NAME}` — substituted from shell environment at session start

### 6.2 Path Placeholders

| Placeholder | Resolves To |
|-------------|------------|
| `~` | User home directory |
| `${CLAUDE_PROJECT_DIR}` | Project root (for hooks) |
| `${CLAUDE_SKILL_DIR}` | Current skill directory |
| `${CLAUDE_VAULT_DIR}` | Secrets vault (if configured) |

### 6.3 Directory Resolution

- **User settings:** `~/.claude/` expands to home directory
- **Project settings:** `.claude/` is relative to `.git` root or cwd
- **Managed settings:** System-level paths (OS-specific)

---

## 7. FILE WATCHING & RELOADING

### 7.1 Auto-Reload (No Restart Required)

- `settings.json` changes (except `model`, `outputStyle`)
- `CLAUDE.md` / `CLAUDE.local.md` (re-injected in context)
- `keybindings.json` changes
- `.claude/rules/` changes
- `.mcp.json` changes (new servers added)
- Plugin enable/disable via `/plugin`

**Exception:** `model` and `outputStyle` require new session

### 7.2 Settings That Require Restart

- `model` — Model selection
- `outputStyle` — System prompt style
- Managed settings — Cannot be overridden without restart

---

## 8. SECURITY & ISOLATION

### 8.1 Protected Paths

Managed settings can designate paths as "protected" — Claude Code prevents changes to these files regardless of permissions or hooks.

```json
{
  "protectedPaths": [
    "/etc/**",
    "~/.ssh/**"
  ]
}
```

### 8.2 Sandbox Isolation

**Setting:** `sandbox.enabled` (managed settings only)

**Effect:** File system, network, and tool access isolation via container or similar

### 8.3 Workspace Trust

- First time opening `.claude/settings.json` in a directory, prompt for trust
- Trust gates hooks and `autoMemoryDirectory` overrides
- Once trusted, settings load without prompting

---

## 9. CONFIGURATION LOADING TIMELINE

### Session Start (In Order)

1. Load managed settings (immutable)
2. Load user global settings (`~/.claude/settings.json`)
3. Load project settings (`.claude/settings.json`)
4. Load local project settings (`.claude/settings.local.json`)
5. Apply CLI flags (override all above)
6. Load CLAUDE.md files (all scopes concatenated)
7. Load user rules (unconditional)
8. Load project rules (unconditional; path-scoped rules loaded on-demand)
9. Connect MCP servers from `.mcp.json` and `~/.claude.json`
10. Enable plugins from `enabledPlugins`
11. Load plugin hooks, skills, agents, output styles
12. Register keybindings from `~/.claude/keybindings.json`
13. Set environment variables from `env` and inherited from shell
14. Start session with merged configuration

---

## 10. ENTERPRISE / MANAGED DEPLOYMENT

### 10.1 Managed Settings Deployment

**System locations:**
- **macOS:** `/Library/Application Support/ClaudeCode/managed-settings.json`
- **Linux:** `/etc/claude-code/managed-settings.json`
- **Windows:** `C:\Program Files\ClaudeCode\managed-settings.json`

**Deployment tools:**
- MDM (Mobile Device Management)
- Group Policy (Windows)
- Ansible, Chef, Puppet, etc.

### 10.2 Enforced Fields (Managed Only)

- `permissions.deny` — Block tools/commands
- `sandbox.enabled` — Enforce sandboxing
- `forceLoginMethod` — Require specific auth
- `forceLoginOrgUUID` — Lock to organization
- `claudeMd` — Inline organization-wide instructions (cannot be excluded)
- `claudeMdExcludes` — Exclude specific CLAUDE.md files

**Cannot be overridden:** Managed settings are immutable by users

### 10.3 Excluding Team CLAUDE.md Files

In monorepos, exclude irrelevant team instructions:

```json
{
  "claudeMdExcludes": [
    "**/team-a/CLAUDE.md",
    "/absolute/path/team-b/.claude/rules/**"
  ]
}
```

**Patterns:** Glob syntax, matched against absolute paths

---

## QUICK REFERENCE TABLES

### Settings Precedence (Highest to Lowest)

| Priority | Source | Override Behavior |
|----------|--------|-------------------|
| 1 | Managed settings | Immutable, cannot be overridden |
| 2 | CLI flags (`--model`) | Temporary session only |
| 3 | `.claude/settings.local.json` | Highest user-editable |
| 4 | `.claude/settings.json` | Team defaults |
| 5 | `~/.claude/settings.json` | Personal defaults |

### Configuration File Locations (Checklist)

- [ ] `managed-settings.json` (system path, enterprise only)
- [ ] `~/.claude/settings.json` (user global)
- [ ] `.claude/settings.json` (project shared)
- [ ] `.claude/settings.local.json` (project local, gitignored)
- [ ] `~/.claude/keybindings.json` (user keybindings)
- [ ] `~/.claude/output-styles/` (user output styles)
- [ ] `.claude/output-styles/` (project output styles)
- [ ] `~/.claude/CLAUDE.md` (user instructions)
- [ ] `./CLAUDE.md` or `./.claude/CLAUDE.md` (project instructions)
- [ ] `./CLAUDE.local.md` (project local instructions, gitignored)
- [ ] `.claude/rules/` (project scoped rules)
- [ ] `~/.claude/rules/` (user scoped rules)
- [ ] `.claude/skills/` (project skills)
- [ ] `~/.claude/skills/` (user skills)
- [ ] `.claude/agents/` (project agents)
- [ ] `~/.claude/agents/` (user agents)
- [ ] `.claude/commands/` (project commands — legacy)
- [ ] `.mcp.json` (project MCP servers)
- [ ] `~/.claude.json` (user MCP servers)
- [ ] `.claude/hooks/hooks.json` (plugin hooks only)
- [ ] `~/.claude/projects/<project>/memory/MEMORY.md` (auto memory)
- [ ] `.worktreeinclude` (gitignored files to copy to worktrees)

### All settings.json Top-Level Keys

```json
{
  "$schema": "",
  "model": "",
  "effortLevel": "",
  "outputStyle": "",
  "autoMemoryEnabled": true,
  "autoMemoryDirectory": "",
  "editorMode": "",
  "enabledPlugins": {},
  "disableAllHooks": false,
  "claudeMdExcludes": [],
  "apiKeyHelper": {},
  "permissions": {},
  "env": {},
  "hooks": {},
  "statusLine": {},
  "git": {},
  "attribution": {},
  "cleanupPeriodDays": 30,
  "enablePromptCaching": true,
  "disablePromptCaching": false,
  "skipAutoPermissionPrompt": false,
  "skipDangerousModePermissionPrompt": false,
  "skipWorkflowUsageWarning": false,
  "voiceEnabled": false,
  "agentPushNotifEnabled": false,
  "sandboxEnabled": false,
  "extraKnownMarketplaces": {},
  "claudeMd": ""
}
```

---

## SOURCES

- https://code.claude.com/docs/en/settings.md
- https://code.claude.com/docs/en/configuration.md
- https://code.claude.com/docs/en/keybindings.md
- https://code.claude.com/docs/en/memory.md
- https://code.claude.com/docs/en/hooks-guide.md
- https://code.claude.com/docs/en/hooks.md
- https://code.claude.com/docs/en/sub-agents.md
- https://code.claude.com/docs/en/mcp-servers.md
- https://code.claude.com/docs/en/skills.md
- https://code.claude.com/docs/en/plugins.md
- https://code.claude.com/docs/en/output-styles.md
- https://code.claude.com/docs/en/env-vars.md
- https://code.claude.com/docs/en/claude-directory.md
- https://code.claude.com/docs/en/permission-modes.md

