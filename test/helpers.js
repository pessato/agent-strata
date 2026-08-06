import { resolveProvider } from '../src/providers/index.js';

// Every render/merge path is provider-driven; tests use the real Claude
// descriptor rather than a stub so the scope names stay honest.
export const provider = resolveProvider('claude');
