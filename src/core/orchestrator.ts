import * as vscode from 'vscode';
import type { AdapterRegistry } from './adapterRegistry';
import type { StateStore } from './stateStore';
import type { LanguageAdapter, ProjectInfo } from './types';
import type { StatusBarController } from '../ui/statusBar';
import { pickChipValue } from '../ui/picks';

/**
 * Orchestrator — active-context owner and command handler (TASK-009, 상세설계서 §3.1).
 *
 * Wires the data layer (AdapterRegistry, StateStore) to the UI (StatusBarController),
 * enforcing the one-way dependency UI → Orchestrator → Adapter (INV-2). Action-button
 * execution (build/run/debug) lands with the TaskRunner in MS-005; here those commands
 * just inform the user.
 */
export class Orchestrator {
  constructor(
    private readonly registry: AdapterRegistry,
    private readonly store: StateStore,
    private readonly statusBar: StatusBarController,
  ) {}

  /** First activation: scan, reconcile stored state, render (상세설계서 §3.3). */
  async initialize(): Promise<void> {
    await this.refresh();
  }

  /** Rescan and re-render — invoked on activation and on every debounced manifest change. */
  async refresh(): Promise<void> {
    const projects = await this.registry.scan();
    const validItems = await this.gatherValidItems(projects);
    const removed = await this.store.reconcile(
      projects.map((p) => p.id),
      validItems,
    );
    if (removed.length > 0) {
      void vscode.window.showInformationMessage(
        `DevSwitcher: reset ${removed.length} selection(s) no longer valid in the manifest.`,
      );
    }
    await this.renderActive();
  }

  async switchProject(): Promise<void> {
    const projects = this.registry.getProjects();
    if (projects.length === 0) {
      return;
    }
    const picked = await vscode.window.showQuickPick(
      projects.map((p) => ({ label: p.name, description: p.id, projectId: p.id })),
      { placeHolder: 'Select active project' },
    );
    if (!picked) {
      return;
    }
    await this.store.setActiveProject(picked.projectId);
    await this.renderActive();
  }

  async pickChip(chipId: string | undefined): Promise<void> {
    const context = this.activeContext();
    if (!context || chipId === undefined) {
      return;
    }
    const { project, adapter } = context;
    const chip = adapter.chips.find((c) => c.id === chipId);
    if (!chip) {
      return;
    }
    const value = await pickChipValue(chip, project, this.store.getValue(project.id, chipId));
    if (value === undefined) {
      return; // cancelled
    }
    await this.store.setValue(project.id, chipId, value);
    this.statusBar.render(adapter, project, this.store.getSelection(project.id));
  }

  /** Action buttons render in MS-004; execution (TaskRunner) is MS-005. */
  async informActionDeferred(action: string): Promise<void> {
    await vscode.window.showInformationMessage(`DevSwitcher: ${action} runs in a later milestone (MS-005).`);
  }

  private async renderActive(): Promise<void> {
    const context = this.activeContext();
    if (!context) {
      this.statusBar.hideAll();
      return;
    }
    const { project, adapter } = context;
    await this.applyDefaults(project, adapter);
    this.statusBar.render(adapter, project, this.store.getSelection(project.id));
  }

  /** Seed unset chips from their defaultValue (e.g. profile=dev, sole bin target). */
  private async applyDefaults(project: ProjectInfo, adapter: LanguageAdapter): Promise<void> {
    for (const chip of adapter.chips) {
      if (!chip.defaultValue || this.store.getValue(project.id, chip.id) !== undefined) {
        continue;
      }
      try {
        const value = await chip.defaultValue(project);
        if (value !== undefined) {
          await this.store.setValue(project.id, chip.id, value);
        }
      } catch {
        // listItems/metadata unavailable — leave unset, render shows `(label)`
      }
    }
  }

  /** listItems ids per (project × chip) for the projects that have stored selections. */
  private async gatherValidItems(
    projects: ProjectInfo[],
  ): Promise<Record<string, Record<string, string[]>>> {
    const scanned = new Map(projects.map((p) => [p.id, p]));
    const result: Record<string, Record<string, string[]>> = {};
    for (const projectId of this.store.getSelectedProjectIds()) {
      const project = scanned.get(projectId);
      if (!project) {
        continue; // not scanned this pass — reconcile keeps it as-is
      }
      const adapter = this.registry.adapterFor(project);
      if (!adapter) {
        continue;
      }
      const byChip: Record<string, string[]> = {};
      for (const chip of adapter.chips) {
        try {
          byChip[chip.id] = (await chip.listItems(project)).map((item) => item.id);
        } catch {
          // chip unavailable — omit so reconcile leaves its value untouched
        }
      }
      result[projectId] = byChip;
    }
    return result;
  }

  private activeContext(): { project: ProjectInfo; adapter: LanguageAdapter } | undefined {
    const projectId = this.store.activeProjectId;
    const project = projectId !== undefined ? this.registry.project(projectId) : undefined;
    if (!project) {
      return undefined;
    }
    const adapter = this.registry.adapterFor(project);
    return adapter ? { project, adapter } : undefined;
  }
}
