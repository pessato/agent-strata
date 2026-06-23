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
