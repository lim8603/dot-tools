import type { ChipValue } from './types';

/**
 * Reconcile pure core (TASK-007, 상세설계서 §6.2).
 *
 * Side-effect-free logic for pruning stale selections and resolving the active
 * project. Kept free of `vscode` (types are `import type`, erased at compile time)
 * so StateStore's vscode-wired shell can delegate here while these functions stay
 * unit-testable in plain Node.
 */

/**
 * Drop chip values that are no longer offered by their chip (e.g. a profile deleted
 * from Cargo.toml). `valid[chipId]` holds the ids the chip currently lists; a chip
 * absent from `valid` is left untouched — it was not reconciled this pass (its
 * listItems was not gathered, or failed). A multiSelect keeps its still-valid ids
 * and is dropped only when none remain; a single value is dropped when invalid.
 *
 * Returns the cleaned values plus the chip ids whose value changed (for a one-shot
 * toast, E10).
 */
export function reconcileValues(
  values: Record<string, ChipValue>,
  valid: Record<string, string[]>,
): { values: Record<string, ChipValue>; removed: string[] } {
  const result: Record<string, ChipValue> = {};
  const removed: string[] = [];

  for (const [chipId, value] of Object.entries(values)) {
    const allowed = valid[chipId];
    if (!allowed) {
      result[chipId] = value; // not reconcilable this pass — keep as-is
      continue;
    }

    if (Array.isArray(value)) {
      const kept = value.filter((id) => allowed.includes(id));
      // Keep a still-populated selection, and keep an already-empty one — `[]` is a
      // deliberate multiSelect state ('none' / cargo --no-default-features), not "unset".
      // Drop only a once-populated selection whose every id vanished (falls back to default).
      if (kept.length > 0 || value.length === 0) {
        result[chipId] = kept;
      }
      if (kept.length !== value.length) {
        removed.push(chipId);
      }
    } else if (allowed.includes(value)) {
      result[chipId] = value;
    } else {
      removed.push(chipId);
    }
  }

  return { values: result, removed };
}

/**
 * Pick the active project after a scan (상세설계서 §3.3c): keep the stored one when
 * it is still present, otherwise the first scanned project, otherwise undefined.
 */
export function resolveActiveProject(
  storedActiveId: string | undefined,
  scannedIds: string[],
): string | undefined {
  if (storedActiveId !== undefined && scannedIds.includes(storedActiveId)) {
    return storedActiveId;
  }
  return scannedIds[0];
}
