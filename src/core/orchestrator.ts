import * as vscode from 'vscode';
import type { AdapterRegistry } from './adapterRegistry';
import type { StateStore } from './stateStore';
import type { TaskRunner } from './taskRunner';
import type { InvocationConfig, LanguageAdapter, ProjectInfo } from './types';
import type { StatusBarController } from '../ui/statusBar';
import { pickChipValue } from '../ui/picks';
import { ensureExtension } from './ensureExtension';

/**
 * Orchestrator — active-context owner and command handler (상세설계서 §3.1).
 *
 * Wires the data layer (AdapterRegistry, StateStore) to the UI (StatusBarController)
 * and the TaskRunner, enforcing the one-way dependency UI → Orchestrator → Adapter
 * (INV-2). build()/run() execute real cargo tasks (TASK-010); debug() lands in TASK-011.
 */
export class Orchestrator {
  constructor(
    private readonly registry: AdapterRegistry,
    private readonly store: StateStore,
    private readonly statusBar: StatusBarController,
    private readonly taskRunner: TaskRunner,
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

  async build(): Promise<void> {
    const context = this.activeContext();
    if (context && context.adapter.actions.build) {
      await this.runCargoTask(context.project, context.adapter, 'build');
    }
  }

  async run(): Promise<void> {
    const context = this.activeContext();
    if (context) {
      await this.runCargoTask(context.project, context.adapter, 'run');
    }
  }

  /**
   * Debug flow (상세설계서 §7.4): required chips → ensure CodeLLDB → build (abort on
   * failure) → resolve executable + config → start debugging.
   */
  async debug(): Promise<void> {
    const context = this.activeContext();
    if (!context) {
      return;
    }
    const { project, adapter } = context;
    if (this.taskRunner.isRunning(project.id)) {
      void vscode.window.showInformationMessage(`DevSwitcher: a task is already running for ${project.name}.`);
      return;
    }
    if (!(await this.ensureRequiredChips(project, adapter))) {
      return;
    }
    for (const extensionId of adapter.requiredExtensions) {
      const available = await ensureExtension(
        extensionId,
        `Debugging ${adapter.displayName} needs ${extensionId}. Install it?`,
      );
      if (!available) {
        void vscode.window.showWarningMessage('DevSwitcher: debug cancelled — required extension is missing.');
        return;
      }
    }

    const selection = this.store.getSelection(project.id);
    const config = this.activeConfig(project);
    this.statusBar.markActionBusy('debug');
    try {
      if (adapter.actions.build) {
        const build = await this.taskRunner.run(adapter.createBuildTask(project, selection, config), project.id);
        if (!build.succeeded) {
          const showProblems = 'Show Problems';
          const choice = await vscode.window.showErrorMessage(
            `DevSwitcher: build failed (exit ${build.exitCode ?? 'unknown'}); cannot start debugging.`,
            showProblems,
          );
          if (choice === showProblems) {
            void vscode.commands.executeCommand('workbench.actions.view.problems');
          }
          return;
        }
      }
      const debugConfig = await adapter.createDebugConfig(project, selection, config);
      await vscode.debug.startDebugging(project.workspaceFolder, debugConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`DevSwitcher: debug failed — ${message}`);
    } finally {
      await this.renderActive();
    }
  }

  /** Build/run flow (상세설계서 §7.3): validate required chips → run → surface failure. */
  private async runCargoTask(
    project: ProjectInfo,
    adapter: LanguageAdapter,
    action: 'build' | 'run',
  ): Promise<void> {
    if (this.taskRunner.isRunning(project.id)) {
      void vscode.window.showInformationMessage(`DevSwitcher: a task is already running for ${project.name}.`);
      return;
    }
    if (!(await this.ensureRequiredChips(project, adapter))) {
      return; // user cancelled a required-chip pick (E4)
    }
    const selection = this.store.getSelection(project.id);
    const config = this.activeConfig(project);
    const task =
      action === 'build'
        ? adapter.createBuildTask(project, selection, config)
        : adapter.createRunTask(project, selection, config);

    this.statusBar.markActionBusy(action);
    try {
      const result = await this.taskRunner.run(task, project.id);
      if (!result.succeeded) {
        const showProblems = 'Show Problems';
        const choice = await vscode.window.showErrorMessage(
          `DevSwitcher: ${action} failed (exit ${result.exitCode ?? 'unknown'}).`,
          showProblems,
        );
        if (choice === showProblems) {
          void vscode.commands.executeCommand('workbench.actions.view.problems');
        }
      }
    } finally {
      await this.renderActive(); // clear the busy spinner
    }
  }

  /** E4: prompt any required chip that is unset before running; false = cancelled. */
  private async ensureRequiredChips(project: ProjectInfo, adapter: LanguageAdapter): Promise<boolean> {
    for (const chip of adapter.chips) {
      if (!chip.required || this.store.getValue(project.id, chip.id) !== undefined) {
        continue;
      }
      const value = await pickChipValue(chip, project, undefined);
      if (value === undefined) {
        return false;
      }
      await this.store.setValue(project.id, chip.id, value);
      this.statusBar.render(adapter, project, this.store.getSelection(project.id));
    }
    return true;
  }

  /** The invocation overlay for the active (project × profile) (ADR-011). */
  private activeConfig(project: ProjectInfo): InvocationConfig {
    const profile = this.store.getValue(project.id, 'profile');
    return this.store.getInvocation(project.id, typeof profile === 'string' ? profile : 'dev');
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
