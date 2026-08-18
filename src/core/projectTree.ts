import type { ProjectInfo } from './types';

/**
 * Pure project-hierarchy helpers (MS-021 / ADR-019) — vscode-free so the ordering is
 * unit-testable. UIs (project QuickPick, settings Project tab) render sub-projects
 * indented directly beneath their parent; this module owns that ordering so both views
 * agree. Reads the declarative ProjectInfo fields only (INV-2).
 */

/** Minimal shape orderByHierarchy needs — ProjectInfo satisfies it. */
export interface TreeEntry {
  id: string;
  parentId?: string;
}

/**
 * Order projects for display: each top-level project followed by its sub-projects, both
 * keeping their scan order. A sub whose parent is not in the list (stale/filtered) is
 * kept as top-level rather than dropped.
 */
export function orderByHierarchy<T extends TreeEntry>(projects: T[]): T[] {
  const ids = new Set(projects.map((p) => p.id));
  const tops = projects.filter((p) => p.parentId === undefined || !ids.has(p.parentId));
  const ordered: T[] = [];
  for (const top of tops) {
    ordered.push(top);
    for (const p of projects) {
      if (p.parentId === top.id) {
        ordered.push(p);
      }
    }
  }
  return ordered;
}

/** Whether a project should show in the project QuickPick: library-only sub-projects are
 *  hidden when the "show libraries" preference is off (ADR-019). Top-level projects always
 *  show — hiding a library-only root would hide the whole project. */
export function visibleInSwitcher(project: Pick<ProjectInfo, 'parentId' | 'library'>, showLibraries: boolean): boolean {
  return showLibraries || project.parentId === undefined || project.library !== true;
}
