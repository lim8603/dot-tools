import { LanguageAdapter } from '../core/types';
import { cargoAdapter } from './cargo/cargoAdapter';
import { cmakeAdapter } from './cmake/cmakeAdapter';
import { dotnetAdapter } from './dotnet/dotnetAdapter';
import { pythonAdapter } from './python/pythonAdapter';

export { cargoAdapter, cmakeAdapter, dotnetAdapter, pythonAdapter };

/**
 * All language adapters. TASK-003 uses this as the interface-confirmation set
 * (ASM-001/002): every entry must satisfy LanguageAdapter, so this array
 * typechecking is the proof that the contract holds across all four languages,
 * including the Python litmus. The AdapterRegistry (ADR-006) consumes this in a
 * later milestone.
 */
export const ALL_ADAPTERS: LanguageAdapter[] = [cargoAdapter, cmakeAdapter, dotnetAdapter, pythonAdapter];
