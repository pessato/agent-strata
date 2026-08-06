import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSources } from '../src/reporter/sources.js';
import { provider } from './helpers.js';

const render = sources => renderSources(provider, sources);

test('memory section lists present files with a size detail and a scope badge', () => {
  const html = render({
    memory: [
      { scope: 'user', label: '~/.claude/CLAUDE.md', present: true, parse: 'ok', data: 'hello' },
      { scope: 'project-shared', label: './CLAUDE.md', present: false, parse: 'missing', data: null },
    ],
  });
  assert.match(html, /Memory/);
  assert.match(html, /~\/\.claude\/CLAUDE\.md/);
  assert.match(html, /5 chars/);           // 'hello'.length
  assert.match(html, /s-user/);            // user scope badge
  assert.doesNotMatch(html, /CLAUDE\.md<\/span><span class="id">0/); // absent file not listed
});

test('dir-based sections (agents) list names with badges; empty shows a placeholder', () => {
  const html = render({
    agents: [{ scope: 'user', label: 'reviewer.md', present: true }],
    skills: [],
  });
  assert.match(html, /Subagents/);
  assert.match(html, /reviewer\.md/);
  assert.match(html, /Skills/);
  assert.match(html, /none configured/);
});

test('MCP section expands server names from mcpServers and flags unusable files', () => {
  const html = render({
    mcp: [
      { scope: 'user', label: '~/.claude.json', present: true, parse: 'ok', data: { mcpServers: { github: {}, jira: {} } } },
      { scope: 'project-shared', label: './.mcp.json', present: true, parse: 'malformed', error: 'bad', data: null },
    ],
  });
  assert.match(html, /MCP servers/);
  assert.match(html, /github/);
  assert.match(html, /jira/);
  assert.match(html, /malformed/);
});

test('hook counts reflect leaf commands, not matcher groups', () => {
  // settings.hooks.PreToolUse is a list of matchers, each holding its own hooks.
  const html = render({
    hooks: [{ scope: 'user', label: 'PreToolUse', data: [{ hooks: [{}, {}] }, { hooks: [{}] }] }],
  });
  assert.match(html, /PreToolUse/);
  assert.match(html, /3 hooks/);
});

test('plugins render their enabled state from the raw boolean map', () => {
  const html = render({
    plugins: [
      { scope: 'user', label: 'superpowers', data: true },
      { scope: 'user', label: 'retired', data: false },
    ],
  });
  assert.match(html, /superpowers/);
  assert.match(html, /enabled/);
  assert.match(html, /disabled/);
});

test('env values render as given (the collector redacts before this point)', () => {
  const html = render({ env: { ANTHROPIC_MODEL: 'opus', CLAUDE_CODE_FOO: 'bar' } });
  assert.match(html, /ANTHROPIC_MODEL=opus/);
  assert.match(html, /CLAUDE_CODE_FOO=bar/);
});

test('all user-controlled values are HTML-escaped', () => {
  const html = render({
    agents: [{ scope: 'user', label: '<script>alert(1)</script>', present: true }],
    env: { ANTHROPIC_X: '<img onerror=x>' },
  });
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<img onerror/);
  assert.match(html, /&lt;script&gt;/);
});

test('single-file sources without a scope field render with no badge and no throw', () => {
  const html = render({
    keybindings: { path: '~/.claude/keybindings.json', present: true, parse: 'ok', data: {} },
    worktreeInclude: { path: './.worktreeinclude', present: true, parse: 'ok', data: '.env\nnotes.md\n' },
  });
  assert.match(html, /Keybindings/);
  assert.match(html, /custom/);
  assert.match(html, /Worktree include/);
  assert.match(html, /2 entries/);
});

test('an MCP file present but with no mcpServers key collapses to the empty state', () => {
  const html = render({
    mcp: [{ scope: 'user', label: '~/.claude.json', present: true, parse: 'ok', data: { other: 1 } }],
  });
  assert.match(html, /MCP servers/);
  assert.match(html, /no MCP servers/);
});

test('renderSources is robust to missing/empty input (no throw)', () => {
  assert.doesNotThrow(() => renderSources(provider));
  assert.doesNotThrow(() => renderSources(provider, {}));
  assert.match(renderSources(provider, {}), /Environment variables/);
});
