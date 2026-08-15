import { DevSwitcherError } from './errors';
import { PROFILE_EXPORT_VERSION } from './types';
import type { InvocationConfig, PersistedState, ProfileExport } from './types';

/**
 * Profile export/import — pure, vscode-free helpers (TASK-015, F12 / 상세설계서 §6.3).
 *
 * The orchestrator owns the file dialogs and fs I/O; everything decidable without
 * `vscode` lives here so it stays unit-testable in plain Node (coding_convention:
 * "순수 함수 분리 ... VSCode API 무의존"). The wire format mirrors PersistedState's
 * two maps, so a round-trip needs no translation (C-4).
 */

/**
 * Build the export payload from current state. `activeProjectId` is dropped (it is
 * machine/session-specific); `now` is passed in (not read from the clock) so the
 * result is deterministic under test. The maps are deep-copied so later state
 * mutations can't leak into an already-built payload.
 */
export function buildProfileExport(state: PersistedState, now: string): ProfileExport {
  return {
    version: PROFILE_EXPORT_VERSION,
    exportedAt: now,
    selections: structuredClone(state.selections ?? {}),
    invocation: structuredClone(state.invocation ?? {}),
  };
}

/**
 * Parse and validate a `devswitcher.profile.json` text. Throws
 * DevSwitcherError('PROFILE_IMPORT_INVALID') on malformed JSON, an unknown version,
 * or a shape that isn't the two expected string-keyed maps — so the caller can
 * surface one clear error toast rather than a raw JSON/TypeError.
 */
export function parseProfileExport(text: string): ProfileExport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new DevSwitcherError('PROFILE_IMPORT_INVALID', 'The profile file is not valid JSON.', error);
  }

  if (!isRecord(raw)) {
    throw new DevSwitcherError('PROFILE_IMPORT_INVALID', 'The profile file is not a JSON object.');
  }
  if (raw.version !== PROFILE_EXPORT_VERSION) {
    throw new DevSwitcherError(
      'PROFILE_IMPORT_INVALID',
      `Unsupported profile version ${String(raw.version)} (expected ${PROFILE_EXPORT_VERSION}).`,
    );
  }
  if (!isNestedRecord(raw.selections) || !isNestedRecord(raw.invocation)) {
    throw new DevSwitcherError('PROFILE_IMPORT_INVALID', 'The profile file is missing valid selections/invocation maps.');
  }

  return {
    version: PROFILE_EXPORT_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    selections: raw.selections as ProfileExport['selections'],
    invocation: raw.invocation as ProfileExport['invocation'],
  };
}

/** The outcome of merging an import into current state, for the summary toast. */
export interface ImportMerge {
  next: PersistedState;
  applied: string[]; // projectIds imported (present in the current scan)
  skipped: string[]; // projectIds skipped (absent from the workspace)
}

/**
 * Merge an imported payload into current state, applying only projectIds present in
 * the current scan (§6.3) — a foreign clone's projects are reported as skipped, not
 * written. For an applied project the imported selections/invocation replace the
 * stored ones wholesale (last-writer-wins per project); `activeProjectId` and
 * untouched projects are preserved. Post-merge reconcile (the caller's refresh)
 * prunes any imported chip value no longer offered by the manifest (E10).
 */
export function mergeImport(
  current: PersistedState,
  imported: ProfileExport,
  knownProjectIds: string[],
): ImportMerge {
  const known = new Set(knownProjectIds);
  const next: PersistedState = {
    activeProjectId: current.activeProjectId,
    selections: structuredClone(current.selections ?? {}),
    invocation: structuredClone(current.invocation ?? {}),
  };
  const applied: string[] = [];
  const skipped: string[] = [];

  // Union of projectIds referenced anywhere in the import (selections or invocation).
  const importedIds = new Set([...Object.keys(imported.selections), ...Object.keys(imported.invocation)]);
  for (const projectId of importedIds) {
    if (!known.has(projectId)) {
      skipped.push(projectId);
      continue;
    }
    const selections = imported.selections[projectId];
    if (selections) {
      next.selections[projectId] = structuredClone(selections);
    }
    const invocation = imported.invocation[projectId];
    if (invocation) {
      next.invocation[projectId] = structuredClone(invocation) as Record<string, InvocationConfig>;
    }
    applied.push(projectId);
  }

  return { next, applied, skipped };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A string-keyed map whose values are themselves objects (selections/invocation). */
function isNestedRecord(value: unknown): value is Record<string, Record<string, unknown>> {
  return isRecord(value) && Object.values(value).every(isRecord);
}
