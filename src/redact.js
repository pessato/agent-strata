// The report is meant to be shared — attached to a ticket, screenshotted into a
// thread, pasted at a colleague. Two paths would otherwise carry live
// credentials into it: process env (ANTHROPIC_API_KEY matches the ANTHROPIC_
// prefix the collector sweeps) and the `env` block of any settings.json.
//
// Whether a variable is *set* is the diagnostic signal; its value never is. So
// we keep the key and replace the value.

export const REDACTED = '«redacted»';

// Matches a whole word inside a SNAKE_CASE or kebab-case name. Deliberately
// anchored to separators so `apiKeyHelper` — a script path, not a secret —
// stays visible.
const SECRET_WORD =
  /(?:^|[_-])(?:api[_-]?key|auth[_-]?token|access[_-]?token|token|secret|password|passwd|credentials?|private[_-]?key)(?:$|[_-])/i;

// isSecretKey(name) → true when a value under this key must not be printed.
export function isSecretKey(name) {
  return SECRET_WORD.test(String(name ?? ''));
}

// redactEnv(env) → same keys, secret-bearing values replaced.
export function redactEnv(env = {}) {
  const out = {};
  for (const [k, v] of Object.entries(env ?? {})) {
    out[k] = isSecretKey(k) ? REDACTED : v;
  }
  return out;
}

// redactValue(key, value) → the value, or the placeholder when the key is
// secret-bearing. Arrays are redacted element-wise so a union row of tokens
// cannot leak one entry while masking another.
export function redactValue(key, value) {
  if (!isSecretKey(key)) return value;
  return Array.isArray(value) ? value.map(() => REDACTED) : REDACTED;
}
