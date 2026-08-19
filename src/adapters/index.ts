import { LanguageAdapter } from '../core/types';
import { cargoAdapter } from './cargo/cargoAdapter';
import { cmakeAdapter } from './cmake/cmakeAdapter';
import { dotnetAdapter } from './dotnet/dotnetAdapter';
import { goAdapter } from './go/goAdapter';
import { nodeAdapter } from './node/nodeAdapter';
import { pythonAdapter } from './python/pythonAdapter';
import { vsAdapter } from './vs/vsAdapter';

export { cargoAdapter, cmakeAdapter, dotnetAdapter, goAdapter, nodeAdapter, pythonAdapter, vsAdapter };

/**
 * All language adapters. TASK-003 uses this as the interface-confirmation set
 * (ASM-001/002): every entry must satisfy LanguageAdapter, so this array
 * typechecking is the proof that the contract holds across all languages,
 * including the Python litmus. The AdapterRegistry (ADR-006) consumes this;
 * the `devSwitcher.languages.enabled` setting can narrow the scanned set (B-3).
 */
export const ALL_ADAPTERS: LanguageAdapter[] = [
  cargoAdapter,
  cmakeAdapter,
  vsAdapter,
  dotnetAdapter,
  goAdapter,
  nodeAdapter,
  pythonAdapter,
];
