import type { Memento } from 'vscode';
import { PERSISTED_STATE_KEY } from './types';
import type { ChipValue, InvocationConfig, PersistedState, Selection } from './types';
import { reconcileValues, resolveActiveProject } from './stateReconcile';

/**
 * StateStore — the workspaceState persistence wrapper (TASK-007, ADR-001 / 상세설계서 §6).
 *
 * Stores selections and the invocation overlay only, never the canonical values
 * themselves (ADR-007). Keyed by machine-independent projectId, so selections
 * survive across machines. The reconcile logic proper lives in stateReconcile.ts
 * (vscode-free, unit-tested); this shell owns the Memento I/O.
 */
export class StateStore {
  private state: PersistedState;

  constructor(private readonly memento: Memento) {
    this.state = memento.get<PersistedState>(PERSISTED_STATE_KEY) ?? {
      selections: {},
      invocation: {},
    };
  }

  get activeProjectId(): string | undefined {
    return this.state.activeProjectId;
  }

  async setActiveProject(projectId: string | undefined): Promise<void> {
    this.state.activeProjectId = projectId;
    await this.persist();
  }

  /** The stored chip selection for a project (empty when none yet). */
  getSelection(projectId: string): Selection {
    return { projectId, values: this.state.selections[projectId] ?? {} };
  }

  getValue(projectId: string, chipId: string): ChipValue | undefined {
    return this.state.selections[projectId]?.[chipId];
  }

  /** Project ids that already have a stored selection (targets for reconcile). */
  getSelectedProjectIds(): string[] {
    return Object.keys(this.state.selections);
  }

  async setValue(projectId: string, chipId: string, value: ChipValue): Promise<void> {
    const values = (this.state.selections[projectId] ??= {});
    values[chipId] = value;
    await this.persist();
  }

  /** The (project × profile) invocation overlay (empty when none yet, ADR-011). */
  getInvocation(projectId: string, profile: string): InvocationConfig {
    return this.state.invocation[projectId]?.[profile] ?? {};
  }

  async setInvocation(projectId: string, profile: string, config: InvocationConfig): Promise<void> {
    const byProfile = (this.state.invocation[projectId] ??= {});
    byProfile[profile] = config;
    await this.persist();
  }

  /** A deep copy of the full persisted state — the source for a profile export (F12). */
  getState(): PersistedState {
    return structuredClone(this.state);
  }

  /**
   * Replace selections + invocation from a merged import (F12), keeping the current
   * `activeProjectId` (the import never carries one). The caller reconciles afterward
   * (orchestrator.refresh) to prune imported values the manifest no longer offers.
   */
  async importState(merged: PersistedState): Promise<void> {
    this.state = {
      activeProjectId: this.state.activeProjectId,
      selections: merged.selections,
      invocation: merged.invocation,
    };
    await this.persist();
  }

  /**
   * Prune selection values missing from their chip's current items and resolve the
   * active project against the scan (상세설계서 §6.2). `validItems` maps
   * projectId -> chipId -> valid ids, gathered by the caller via listItems; a
   * project absent from it is kept as-is (a manifest may vanish briefly on a branch
   * switch). Returns the removed (projectId, chipId) pairs for a one-shot toast (E10).
   *
   * NOTE: the 30-day GC of long-unused projects (§6.2) needs a lastUsed timestamp
   * not yet in PersistedState — deferred (a schema addition).
   */
  async reconcile(
    scannedIds: string[],
    validItems: Record<string, Record<string, string[]>>,
  ): Promise<Array<{ projectId: string; chipId: string }>> {
    const removed: Array<{ projectId: string; chipId: string }> = [];

    for (const [projectId, values] of Object.entries(this.state.selections)) {
      const valid = validItems[projectId];
      if (!valid) {
        continue; // not scanned this pass — keep as-is
      }
      const reconciled = reconcileValues(values, valid);
      this.state.selections[projectId] = reconciled.values;
      for (const chipId of reconciled.removed) {
        removed.push({ projectId, chipId });
      }
    }

    this.state.activeProjectId = resolveActiveProject(this.state.activeProjectId, scannedIds);
    await this.persist();
    return removed;
  }

  private async persist(): Promise<void> {
    await this.memento.update(PERSISTED_STATE_KEY, this.state);
  }
}
