import * as vscode from 'vscode';
import type { AdapterRegistry } from './adapterRegistry';
import type { StateStore } from './stateStore';
import type { TaskRunner } from './taskRunner';
import type { DiagnosticItem, DiagnosticResolution, InvocationConfig, LanguageAdapter, ProjectInfo } from './types';
import type { StatusBarController } from '../ui/statusBar';
import { pickChipValue } from '../ui/picks';
import { pickDiagnostic } from '../ui/doctorPick';
import { ensureExtension } from './ensureExtension';
import { buildProfileExport, mergeImport, parseProfileExport } from './profileExport';
import { buildDiagnostics, worstStatus } from './diagnostics';
import { createBuildEventTask, type BuildEventPhase } from './buildEvents';

/** Default filename offered by the export/import dialogs (F12). */
const DEFAULT_PROFILE_FILE = 'devswitcher.profile.json';

/**
 * Orchestrator — active-context owner and command handler (상세설계서 §3.1).
 *
 * Wires the data layer (AdapterRegistry, StateStore) to the UI (StatusBarController)
 * and the TaskRunner, enforcing the one-way dependency UI → Orchestrator → Adapter
 * (INV-2). build()/run() execute real cargo tasks (TASK-010); debug() lands in TASK-011.
 */
export class Orchestrator {
  /** Notified after any state change so open views (settings page) can re-sync. */
  private viewSync: () => void = () => {};

  /** Latest Doctor diagnostics — computed on initialize and after each Doctor fix (F19). */
  private diagnostics: DiagnosticItem[] = [];

  constructor(
    private readonly registry: AdapterRegistry,
    private readonly store: StateStore,
    private readonly statusBar: StatusBarController,
    private readonly taskRunner: TaskRunner,
  ) {}

  /** Register a view-sync callback (e.g. the settings page) invoked on every re-render. */
  setViewSync(callback: () => void): void {
    this.viewSync = callback;
  }

  /** First activation: scan, reconcile stored state, render, then check the toolchain (E1). */
  async initialize(): Promise<void> {
    await this.refresh();
    await this.refreshDiagnostics();
  }

  /**
   * Run every present adapter's checks (F19, §13.5), classify them (core/diagnostics),
   * and drive the E1 toolchain warning chip from the worst status. Uses detectAdapters
   * (not scan) so a present Cargo.toml with a missing cargo still reports E1. Stub
   * adapters contribute nothing (they return []).
   */
  async refreshDiagnostics(): Promise<void> {
    const adapters = await this.registry.detectAdapters();
    const probeLists = await Promise.all(adapters.map((a) => a.collectDiagnostics()));
    this.diagnostics = buildDiagnostics(probeLists.flat());
    this.statusBar.setToolchainWarning(worstStatus(this.diagnostics) === 'error');
  }

  /**
   * Doctor (§13.5): show the diagnostics QuickPick and resolve the picked item. Entry
   * points: command palette, E1 chip, on-demand install cancel. After a resolution we
   * rescan + re-check so a freshly installed tool/extension clears its warning.
   */
  async doctor(): Promise<void> {
    await this.refreshDiagnostics();
    if (this.diagnostics.length === 0) {
      void vscode.window.showInformationMessage('DevSwitcher: no environment checks for this workspace.');
      return;
    }
    const picked = await pickDiagnostic(this.diagnostics);
    if (!picked?.resolution) {
      return; // cancelled, or an ok item with nothing to fix
    }
    await this.resolveDiagnostic(picked.resolution);
    await this.refresh();
    await this.refreshDiagnostics();
  }

  /** Carry out one diagnostic resolution (§13.2 automation tiers). */
  private async resolveDiagnostic(resolution: DiagnosticResolution): Promise<void> {
    switch (resolution.kind) {
      case 'installExtension':
        await ensureExtension(resolution.extensionId, `DevSwitcher: install ${resolution.extensionId}?`);
        break;
      case 'openUrl':
        await vscode.env.openExternal(vscode.Uri.parse(resolution.url));
        break;
      case 'runCommand': {
        const terminal = vscode.window.createTerminal('DevSwitcher Doctor');
        terminal.show();
        terminal.sendText([resolution.command, ...resolution.args].join(' '));
        break;
      }
      case 'installTarget':
        // Handled by the Architecture chip's install flow (TASK-018); point the user there.
        void vscode.window.showInformationMessage(
          `DevSwitcher: pick target ${resolution.triple} from the Architecture chip to install it.`,
        );
        break;
    }
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
    // Post-pick hook (e.g. rustup target add for a not-installed target, §13.4);
    // false = install declined/failed, so the pick is not stored.
    if (chip.onPick && !(await chip.onPick(project, value))) {
      return;
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
        const runDoctor = 'Run Doctor';
        const choice = await vscode.window.showWarningMessage(
          'DevSwitcher: debug cancelled — required extension is missing.',
          runDoctor,
        );
        if (choice === runDoctor) {
          void this.doctor();
        }
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

  /**
   * Export selections + invocation overlays to a `devswitcher.profile.json` (F12,
   * 상세설계서 §6.3). projectIds are machine-independent, so the file shares across
   * clones. activeProjectId is dropped by buildProfileExport.
   */
  async exportProfile(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    const defaultUri = folder ? vscode.Uri.joinPath(folder.uri, DEFAULT_PROFILE_FILE) : undefined;
    const target = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { 'DevSwitcher profile': ['json'] },
      saveLabel: 'Export DevSwitcher profile',
    });
    if (!target) {
      return; // cancelled
    }
    const payload = buildProfileExport(this.store.getState(), new Date().toISOString());
    const text = JSON.stringify(payload, null, 2);
    try {
      await vscode.workspace.fs.writeFile(target, Buffer.from(text, 'utf8'));
      void vscode.window.showInformationMessage(`DevSwitcher: exported profile to ${target.fsPath}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`DevSwitcher: export failed — ${message}`);
    }
  }

  /**
   * Import a `devswitcher.profile.json` (F12, §6.3): read → parse/validate → merge
   * (only projectIds present in the current scan) → persist → refresh (reconciles
   * away values the manifest no longer offers). Foreign-clone projects are reported
   * as skipped, not written.
   */
  async importProfile(): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    const picked = await vscode.window.showOpenDialog({
      defaultUri: folder?.uri,
      canSelectMany: false,
      filters: { 'DevSwitcher profile': ['json'] },
      openLabel: 'Import DevSwitcher profile',
    });
    const source = picked?.[0];
    if (!source) {
      return; // cancelled
    }
    try {
      const bytes = await vscode.workspace.fs.readFile(source);
      const imported = parseProfileExport(Buffer.from(bytes).toString('utf8'));
      const knownIds = this.registry.getProjects().map((p) => p.id);
      const merge = mergeImport(this.store.getState(), imported, knownIds);
      await this.store.importState(merge.next);
      await this.refresh(); // reconcile imported values + re-render + view-sync
      const summary =
        merge.skipped.length > 0
          ? `imported ${merge.applied.length} project(s); skipped ${merge.skipped.length} not in this workspace.`
          : `imported ${merge.applied.length} project(s).`;
      void vscode.window.showInformationMessage(`DevSwitcher: ${summary}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`DevSwitcher: import failed — ${message}`);
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
      // Pre-build commands (F21/C-5) run first; a failure aborts the build.
      if (!(await this.runBuildEvents(project, config.preBuild, 'pre'))) {
        return;
      }
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
        return;
      }
      // Post-build commands run only after the build/run succeeds.
      await this.runBuildEvents(project, config.postBuild, 'post');
    } finally {
      await this.renderActive(); // clear the busy spinner
    }
  }

  /**
   * Run each pre/post-build command in order (F21/C-5), aborting on the first failure.
   * Shares the project's run lock, so the commands and the main task stay serialized.
   * Returns false when a command fails (the caller aborts the build).
   */
  private async runBuildEvents(
    project: ProjectInfo,
    commands: string[] | undefined,
    phase: BuildEventPhase,
  ): Promise<boolean> {
    for (const commandLine of commands ?? []) {
      const result = await this.taskRunner.run(createBuildEventTask(project, commandLine, phase), project.id);
      if (!result.succeeded) {
        void vscode.window.showErrorMessage(
          `DevSwitcher: ${phase}-build command failed (exit ${result.exitCode ?? 'unknown'}): ${commandLine}`,
        );
        return false;
      }
    }
    return true;
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

  /** Re-render the status bar from current state — public so the settings page can
   *  push its changes (setChipValue/switchProject) back to the status bar. */
  async renderActive(): Promise<void> {
    const context = this.activeContext();
    if (!context) {
      this.statusBar.hideAll();
      this.viewSync();
      return;
    }
    const { project, adapter } = context;
    await this.applyDefaults(project, adapter);
    this.statusBar.render(adapter, project, this.store.getSelection(project.id));
    this.viewSync();
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
