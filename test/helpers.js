import { resolveProvider } from '../src/providers/index.js';

// Every render/merge path is provider-driven; tests use the real Claude
// descriptor rather than a stub so the scope names stay honest.
export const provider = resolveProvider('claude');

// Making a file unreadable needs POSIX permission bits that actually bind:
// Windows ignores chmod for read access, and root bypasses the check entirely.
export const NO_CHMOD =
  process.platform === 'win32' ? 'chmod does not restrict reads on Windows'
    : process.getuid?.() === 0 ? 'running as root bypasses permission bits'
      : false;
