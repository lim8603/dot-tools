import { DevSwitcherError } from '../core/types';

/**
 * Stub marker for adapter behavior not yet implemented in the current milestone.
 *
 * TASK-003 declares the adapter interface surface (chips, option catalogs,
 * capabilities) to confirm the LanguageAdapter contract (ASM-001/002). The
 * runtime methods land in later milestones (M2+). Returns `never` so it can
 * stand in for any declared return type.
 */
export function notImplemented(where: string, milestone: string): never {
  throw new DevSwitcherError('NOT_IMPLEMENTED', `${where} is not implemented yet (${milestone}).`);
}
