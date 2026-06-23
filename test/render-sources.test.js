import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSources } from '../src/reporter/sources.js';

test('memory section lists present files with a size detail and a scope badge', () => {
  const html = renderSources({
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
  const html = renderSources({
    agents: [{ scope: 'user', label: 'reviewer.md', present: true }],
    skills: [],
  });
  assert.match(html, /Subagents/);
  assert.match(html, /reviewer\.md/);
  assert.match(html, /Skills/);
  assert.match(html, /none configured/);   // empty skills placeholder
});

test('MCP section expands server names from mcpServers and flags malformed files', () => {
  const html = renderSources({
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

test('hooks, plugins and env render with details', () => {
  const html = renderSources({
    hooks: [{ scope: 'user', label: 'PreToolUse', data: [{}, {}] }],
    plugins: [{ scope: 'user', label: 'superpowers', data: { enabled: true } }],
    env: { ANTHROPIC_MODEL: 'opus', CLAUDE_CODE_FOO: 'bar' },
  });
  assert.match(html, /PreToolUse/);
  assert.match(html, /2 hooks/);
  assert.match(html, /superpowers/);
  assert.match(html, /enabled/);
  assert.match(html, /ANTHROPIC_MODEL=opus/);
  assert.match(html, /CLAUDE_CODE_FOO=bar/);
});

test('all user-controlled values are HTML-escaped', () => {
  const html = renderSources({
    agents: [{ scope: 'user', label: '<script>alert(1)</script>', present: true }],
    env: { 'ANTHROPIC_X': '<img onerror=x>' },
  });
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<img onerror/);
  assert.match(html, /&lt;script&gt;/);
});

test('renderSources is robust to missing/empty input (no throw)', () => {
  assert.doesNotThrow(() => renderSources());
  assert.doesNotThrow(() => renderSources({}));
  const html = renderSources({});
  assert.match(html, /Environment variables/); // sections still render with empty state
});
