import { join } from 'node:path';

// Everything Claude Code-specific lives here. A second agent (Codex, etc.) is a
// sibling file exporting the same shape — no other module needs to change.

const MANAGED = {
  darwin: '/Library/Application Support/ClaudeCode/managed-settings.json',
  linux: '/etc/claude-code/managed-settings.json',
  win32: 'C:\\ProgramData\\ClaudeCode\\managed-settings.json',
};

export default {
  id: 'claude',
  label: 'Claude Code',

  // Order IS the precedence: strongest first. `short` keys the CSS classes and
  // `color` drives the generated palette, so adding a scope needs no CSS edit.
  scopes: [
    { id: 'managed', short: 'managed', label: 'Managed · enterprise', color: '#ef4444' },
    { id: 'cli', short: 'cli', label: 'CLI flags', color: '#f97316' },
    { id: 'project-local', short: 'plocal', label: 'Project-local', color: '#eab308' },
    { id: 'project-shared', short: 'pshared', label: 'Project-shared', color: '#22c55e' },
    { id: 'user', short: 'user', label: 'User global', color: '#3b82f6' },
    { id: 'plugin', short: 'plugin', label: 'Plugin defaults', color: '#a855f7' },
  ],

  // Scopes backed by a settings file we can actually read, strongest first.
  // 'cli' and 'plugin' are real precedence layers but not statically inspectable.
  fileScopes: ['managed', 'project-local', 'project-shared', 'user'],

  // Scopes that exist in the precedence order but cannot be read from disk,
  // with the reason shown in the report.
  virtualScopes: {
    cli: { path: '(session flags)', reason: 'CLI flags are per-session and not inspectable after start' },
  },

  settingsPaths({ platform, home, projectDir }) {
    return {
      managed: MANAGED[platform] ?? MANAGED.linux,
      user: join(home, '.claude', 'settings.json'),
      'project-shared': join(projectDir, '.claude', 'settings.json'),
      'project-local': join(projectDir, '.claude', 'settings.local.json'),
    };
  },

  // Directory-backed surfaces, listed per scope.
  sourceDirs({ home, projectDir }) {
    const u = (...p) => join(home, '.claude', ...p);
    const j = (...p) => join(projectDir, '.claude', ...p);
    return {
      agents: [{ scope: 'user', path: u('agents') }, { scope: 'project-shared', path: j('agents') }],
      commands: [{ scope: 'user', path: u('commands') }, { scope: 'project-shared', path: j('commands') }],
      skills: [{ scope: 'user', path: u('skills') }, { scope: 'project-shared', path: j('skills') }],
      rules: [{ scope: 'user', path: u('rules') }, { scope: 'project-shared', path: j('rules') }],
      outputStyles: [{ scope: 'user', path: u('output-styles') }, { scope: 'project-shared', path: j('output-styles') }],
    };
  },

  sourceFiles({ home, projectDir }) {
    return {
      keybindings: join(home, '.claude', 'keybindings.json'),
      userMcp: join(home, '.claude.json'),
      projectMcp: join(projectDir, '.mcp.json'),
      userMemory: join(home, '.claude', 'CLAUDE.md'),
      projectMemory: join(projectDir, 'CLAUDE.md'),
      projectMemoryLocal: join(projectDir, 'CLAUDE.local.md'),
      worktreeInclude: join(projectDir, '.worktreeinclude'),
    };
  },

  memoryFiles: [
    { key: 'userMemory', scope: 'user', label: '~/.claude/CLAUDE.md' },
    { key: 'projectMemory', scope: 'project-shared', label: './CLAUDE.md' },
    { key: 'projectMemoryLocal', scope: 'project-local', label: './CLAUDE.local.md' },
  ],

  mcpFiles: [
    { key: 'userMcp', scope: 'user', label: '~/.claude.json' },
    { key: 'projectMcp', scope: 'project-shared', label: './.mcp.json' },
  ],

  env: {
    prefixes: ['ANTHROPIC_', 'CLAUDE_', 'CLAUDECODE'],
    exact: ['API_TIMEOUT_MS', 'BASH_DEFAULT_TIMEOUT_MS', 'MAX_THINKING_TOKENS',
      'DISABLE_AUTOUPDATER', 'DISABLE_TELEMETRY', 'DISABLE_AUTOCOMPACT'],
  },
};
