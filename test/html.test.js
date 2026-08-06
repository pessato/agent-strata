import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, spine } from '../src/reporter/html.js';
import { provider } from './helpers.js';

test('esc neutralizes HTML special chars', () => {
  assert.equal(esc(`<b>&"'`), '&lt;b&gt;&amp;&quot;&#39;');
  assert.equal(esc(null), '');
  assert.equal(esc(undefined), '');
});

test('spine marks winner, overrides, and absent scopes', () => {
  const html = spine(provider, 'user', ['managed']);
  assert.match(html, /r-user win/);
  assert.match(html, /r-managed over/);
  assert.match(html, /r-cli none/); // not involved
});

test('spine renders one rung per precedence layer, in order', () => {
  const html = spine(provider, 'user', []);
  const rungs = html.match(/class="rung /g) ?? [];
  assert.equal(rungs.length, provider.order.length);
  assert.ok(html.indexOf('r-managed') < html.indexOf('r-user'), 'strongest scope renders first');
});
