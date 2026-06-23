export const PRECEDENCE = ['managed','cli','project-local','project-shared','user','plugin'];

export const SCOPE_LABELS = {
  managed: 'Managed · enterprise',
  cli: 'CLI flags',
  'project-local': 'Project-local',
  'project-shared': 'Project-shared',
  user: 'User global',
  plugin: 'Plugin defaults',
};

// rank(scope) → number; lower = stronger. Unknown scopes sort last.
export function rank(scope) {
  const i = PRECEDENCE.indexOf(scope);
  return i === -1 ? PRECEDENCE.length : i;
}
