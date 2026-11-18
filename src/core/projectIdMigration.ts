import type { PersistedState } from './types';

/**
 * Project-id migration between single- and multi-root naming (R-3, ADR-025) — pure.
 *
 * A project id is `<adapter>:<path>`, where the path gains a `<folder name>/` prefix only
 * while the workspace has more than one folder (VS Code's own `asRelativePath` rule). Ids
 * stored before that rule (multi-root without a prefix) or under the other folder count
 * no longer match a scanned project; this maps each such id to the project it meant.
 */

/** A scanned project as the migration sees it. */
export interface MigrationTarget {
  id: string;
  /** Its workspace folder's name (the prefix multi-root ids carry). */
  folderName: string;
  /** Its workspace folder's index — ties go to the first folder, as old ids resolved. */
  folderIndex: number;
}

/**
 * old id → new id for every stored id that no longer names a project but names one under
 * the other naming. A target that already has stored state of its own is left alone (no
 * overwrite); several candidates (the very collision this fixes) go to the first folder,
 * which is where the ambiguous old id used to resolve.
 */
export function idMigrations(storedIds: Iterable<string>, projects: readonly MigrationTarget[]): Map<string, string> {
  const stored = new Set(storedIds);
  const current = new Set(projects.map((p) => p.id));
  const migrations = new Map<string, string>();
  for (const oldId of stored) {
    const colon = oldId.indexOf(':');
    if (current.has(oldId) || colon <= 0) {
      continue;
    }
    const adapter = oldId.slice(0, colon);
    const oldPath = oldId.slice(colon + 1);
    const candidates = projects
      .filter((p) => {
        if (!p.id.startsWith(`${adapter}:`)) {
          return false;
        }
        const newPath = p.id.slice(adapter.length + 1);
        // single-root → multi-root: the new id gained the folder prefix
        // multi-root → single-root: the old id carried it
        return newPath === `${p.folderName}/${oldPath}` || oldPath === `${p.folderName}/${newPath}`;
      })
      .sort((a, b) => a.folderIndex - b.folderIndex);
    // The first folder's project is the one the old id meant. If it already has state of
    // its own, the old entry is left for reconcile — never moved to another folder's project.
    const target = candidates[0];
    if (target && !stored.has(target.id) && ![...migrations.values()].includes(target.id)) {
      migrations.set(oldId, target.id);
    }
  }
  return migrations;
}

/** Every project id the persisted state refers to (selections, overlays, active, groups). */
export function storedProjectIds(state: PersistedState): Set<string> {
  const ids = new Set([...Object.keys(state.selections ?? {}), ...Object.keys(state.invocation ?? {})]);
  if (state.activeProjectId) {
    ids.add(state.activeProjectId);
  }
  for (const group of state.groups ?? []) {
    for (const member of group.members) {
      ids.add(member.projectId);
    }
  }
  return ids;
}

/** The state with every migrated id renamed — keys, the active project, group members. */
export function applyIdMigrations(state: PersistedState, migrations: ReadonlyMap<string, string>): PersistedState {
  const rename = (id: string): string => migrations.get(id) ?? id;
  const renameKeys = <T>(record: Record<string, T> | undefined): Record<string, T> =>
    Object.fromEntries(Object.entries(record ?? {}).map(([id, value]) => [rename(id), value]));
  return {
    ...state,
    activeProjectId: state.activeProjectId ? rename(state.activeProjectId) : state.activeProjectId,
    selections: renameKeys(state.selections),
    invocation: renameKeys(state.invocation),
    groups: (state.groups ?? []).map((group) => ({
      ...group,
      members: group.members.map((member) => ({
        ...member,
        projectId: rename(member.projectId),
        dependsOn: member.dependsOn.map(rename),
      })),
    })),
  };
}
