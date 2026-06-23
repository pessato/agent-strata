import { PRECEDENCE } from '../precedence.js';

const SHORT = { managed: 'managed', cli: 'cli', 'project-local': 'plocal', 'project-shared': 'pshared', user: 'user', plugin: 'plugin' };

export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// spine(winner, overriddenScopes[]) → vertical dot-ladder HTML
export function spine(winner, overridden = []) {
  return `<div class="spine">` + PRECEDENCE.map(scope => {
    const cls = scope === winner ? 'win' : overridden.includes(scope) ? 'over' : 'none';
    return `<span class="rung r-${SHORT[scope]} ${cls}"></span>`;
  }).join('') + `</div>`;
}

export const SHORT_SCOPE = SHORT;
