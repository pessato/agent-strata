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
