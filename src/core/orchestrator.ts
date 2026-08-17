import { join, sep } from 'node:path';
import * as vscode from 'vscode';
import type { AdapterRegistry } from './adapterRegistry';
import type { StateStore } from './stateStore';
import type { TaskRunner } from './taskRunner';
import type { ChipValue, DiagnosticItem, DiagnosticResolution, InvocationConfig, LanguageAdapter, NewProjectTarget, ProjectFile, ProjectInfo } from './types';
import type { StatusBarController } from '../ui/statusBar';
import { pickChipValue } from '../ui/picks';
import { pickDiagnostic } from '../ui/doctorPick';
import { runNewProjectWizard } from '../ui/newProjectWizard';
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

  /** Chip ids hidden for the active project (TASK-041) — resolved from each chip's
   *  `appliesTo` predicate in renderActive and reused by the inline renders below. */
  private hiddenChips: ReadonlySet<string> = new Set();

  /** projectIds the user just stopped (devSwitcher.stop) — so runCargoTask reports the
   *  terminated task as a stop, not a failure (no error toast). Cleared after the run settles. */
  private readonly stopping = new Set<string>();

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

  /**
   * Manual Rescan (command palette) — force a fresh detection when the ManifestWatcher
   * missed a change: a project folder moved/renamed, files changed outside the editor, or
   * a VCS checkout. Invalidates every adapter's cache so metadata is re-read, re-scans +
   * reconciles, re-checks the toolchain, then reports the new count.
   */
  async rescan(): Promise<void> {
    this.registry.invalidateAll();
    await this.refresh();
    await this.refreshDiagnostics();
    const count = this.registry.getProjects().length;
    void vscode.window.showInformationMessage(`DevSwitcher: rescanned — ${count} project(s) found.`);
  }

  /** Rescan and re-render — invoked on activation and on every debounced manifest change. */
  async refresh(): Promise<void> {
    const projects = await this.registry.scan();
    // Scope the DevSwitcher keybindings (ADR-017): they only fire when a project is present,
    // so the Ctrl+Alt+* defaults stay inert (no conflict) in workspaces with no DevSwitcher project.
    void vscode.commands.executeCommand('setContext', 'devSwitcher.hasProjects', projects.length > 0);
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
    // Multi-select applies live as boxes are toggled (no separate confirm); the chip
    // re-renders on each change. Single-select stays commit-on-pick.
    const onLiveChange = chip.multiSelect
      ? (live: ChipValue): void => {
          void this.store
            .setValue(project.id, chipId, live)
            .then(() => this.renderBar(adapter, project));
        }
      : undefined;
    const value = await pickChipValue(chip, project, this.store.getValue(project.id, chipId), onLiveChange);
    if (value === undefined) {
      return; // cancelled (single-select Escape; multi-select always returns a set)
    }
    // The clear sentinel (e.g. architecture 'Host default') removes the value → unset.
    if (chip.clearValueId !== undefined && value === chip.clearValueId) {
      await this.store.clearValue(project.id, chipId);
      this.renderBar(adapter, project);
      return;
    }
    // Post-pick hook (e.g. rustup target add for a not-installed target, §13.4);
    // false = install declined/failed, so the pick is not stored.
    if (chip.onPick && !(await chip.onPick(project, value))) {
      return;
    }
    await this.store.setValue(project.id, chipId, value);
    this.renderBar(adapter, project);
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
   * Stop the active project's running work (F16 companion to Run). Two kinds of work can be
   * live and are stopped here:
   *
   * 1. **A running task** (`run`/`build`) — a single-project `run` awaits the process, so a
   *    long-lived service (a web server, a watcher) keeps the task and the busy spinner up
   *    until stopped. We find the task(s) for the active project by their DevSwitcher task
   *    definition and terminate them; ending the process releases the TaskRunner lock and
   *    clears the spinner. The project is flagged user-stopped so runCargoTask does not
   *    surface the termination as a build/run failure.
   * 2. **An active debug session** — debug sessions are NOT tasks (they don't appear in
   *    `vscode.tasks.taskExecutions`), so a `Debug` started with Ctrl+Alt+D would otherwise
   *    report "nothing running". We stop the active debug session when it is ours: every
   *    adapter names its config `Debug <project name>` and we launch it in the project's
   *    workspace folder, so match on that.
   */
  async stop(): Promise<void> {
    const activeId = this.store.activeProjectId;
    const project = activeId ? this.registry.project(activeId) : undefined;
    if (!activeId || !project) {
      void vscode.window.showInformationMessage('DevSwitcher: no active project to stop.');
      return;
    }
    let stopped = false;

    const executions = vscode.tasks.taskExecutions.filter((execution) => {
      const def = execution.task.definition as { type?: string; projectId?: string };
      return typeof def.type === 'string' && def.type.startsWith('devSwitcher.') && def.projectId === activeId;
    });
    if (executions.length > 0) {
      this.stopping.add(activeId); // suppress the run-failed toast for this user-initiated stop
      for (const execution of executions) {
        execution.terminate();
      }
      stopped = true;
    }

    // Debug sessions live outside the task system — stop ours (named `Debug <project name>`,
    // or any `Debug …` session launched in this project's folder) if one is active.
    const session = vscode.debug.activeDebugSession;
    if (
      session &&
      session.name.startsWith('Debug ') &&
      (session.name === `Debug ${project.name}` ||
        session.workspaceFolder?.uri.toString() === project.workspaceFolder.uri.toString())
    ) {
      await vscode.debug.stopDebugging(session);
      stopped = true;
    }

    if (!stopped) {
      void vscode.window.showInformationMessage(`DevSwitcher: nothing running for ${project.name}.`);
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
    if (!this.ensureTrusted('debug')) {
      return;
    }
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
    this.statusBar.setStopVisible(true); // stoppable from the start; renderActive/debug events recompute
    try {
      // Two-stage adapters (CMake) configure with the overlay before the build (§7.4).
      await adapter.prepareInvocation?.(project, selection, config);
      // Compiled languages build a debuggable artifact first; Node opts out
      // (debugRequiresBuild:false) — it debugs the npm script directly (ADR-016).
      if (adapter.actions.build && adapter.actions.debugRequiresBuild !== false) {
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

  /**
   * Start wizard (F20, 상세설계서 §14): pick folder → language → name, then let the
   * chosen adapter's createProjectTask scaffold via its native tool (ADR-010 — the
   * extension never writes files). On success we rescan and auto-switch to the new
   * project (OQ-001). A missing native toolchain surfaces the failure with a Doctor
   * entry point (F19). Stub adapters (until TASK-023) throw NOT_IMPLEMENTED, caught here.
   */
  async newProject(): Promise<void> {
    const adapters = this.registry.creatableAdapters();
    const result = await runNewProjectWizard(adapters.map((a) => ({ id: a.id, displayName: a.displayName })));
    if (!result) {
      return; // cancelled, or no workspace folder
    }
    const adapter = this.registry.adapter(result.adapterId);
    if (!adapter) {
      return;
    }
    const creation = adapter.createProject(result.target);
    if (creation.kind === 'task') {
      // Native scaffolder (cargo new / dotnet new) — a missing toolchain fails the
      // task, so offer Doctor (F19). Needs a trusted workspace to run the process.
      if (!this.ensureTrusted('create a project')) {
        return;
      }
      const lockKey = `new:${result.adapterId}:${result.target.folderUri.fsPath}${sep}${result.target.projectName}`;
      const run = await this.taskRunner.run(creation.task, lockKey);
      if (!run.succeeded) {
        const runDoctor = 'Run Doctor';
        const choice = await vscode.window.showErrorMessage(
          `DevSwitcher: project creation failed (exit ${run.exitCode ?? 'unknown'}). Is the ${adapter.displayName} toolchain installed?`,
          runDoctor,
        );
        if (choice === runDoctor) {
          void this.doctor();
        }
        return;
      }
    } else if (!(await this.writeProjectFiles(result.target, creation.files))) {
      return; // scaffold-by-files write failed (message already shown)
    }
    // Success — rescan picks up the new manifest and auto-switches to it (OQ-001). In
    // v1 only Cargo scans, so cmake/dotnet/python are created on disk but appear in
    // the switcher once their adapter is implemented (v2, scope A).
    await this.refresh();
    const created = this.findCreatedProject(result.target);
    if (created) {
      await this.store.setActiveProject(created.id);
      await this.renderActive();
      void vscode.window.showInformationMessage(`DevSwitcher: created and switched to ${created.name}.`);
    } else {
      void vscode.window.showInformationMessage(`DevSwitcher: created ${result.target.projectName}.`);
    }
  }

  /**
   * Scaffold-by-files creation (cmake/python, D-13) — write the template into
   * `<folder>/<name>/` via workspace.fs (no native scaffolder exists for these).
   * Returns false on failure (message shown).
   */
  private async writeProjectFiles(target: NewProjectTarget, files: ProjectFile[]): Promise<boolean> {
    try {
      const root = vscode.Uri.joinPath(target.folderUri, target.projectName);
      await vscode.workspace.fs.createDirectory(root);
      for (const file of files) {
        const uri = vscode.Uri.joinPath(root, ...file.relativePath.split('/'));
        await vscode.workspace.fs.writeFile(uri, Buffer.from(file.content, 'utf8'));
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`DevSwitcher: project creation failed — ${message}`);
      return false;
    }
  }

  /** The scanned project whose manifest lives under the just-created `<folder>/<name>/`. */
  private findCreatedProject(target: NewProjectTarget): ProjectInfo | undefined {
    const prefix = join(target.folderUri.fsPath, target.projectName) + sep;
    return this.registry.getProjects().find((p) => p.manifestPath.startsWith(prefix));
  }

  /**
   * Tasks are restricted in an untrusted workspace — VS Code won't run the process, so
   * the process-end event never arrives. Guard before launching so we surface a clear
   * message instead of a stuck spinner. Returns false when the workspace isn't trusted.
   */
  private ensureTrusted(action: string): boolean {
    if (vscode.workspace.isTrusted) {
      return true;
    }
    void vscode.window.showWarningMessage(`DevSwitcher: trust this workspace to ${action}.`);
    return false;
  }

  /** Build/run flow (상세설계서 §7.3): validate required chips → run → surface failure. */
  private async runCargoTask(
    project: ProjectInfo,
    adapter: LanguageAdapter,
    action: 'build' | 'run',
  ): Promise<void> {
    if (!this.ensureTrusted(action)) {
      return;
    }
    if (this.taskRunner.isRunning(project.id)) {
      void vscode.window.showInformationMessage(`DevSwitcher: a task is already running for ${project.name}.`);
      return;
    }
    if (!(await this.ensureRequiredChips(project, adapter))) {
      return; // user cancelled a required-chip pick (E4)
    }
    const selection = this.store.getSelection(project.id);
    const config = this.activeConfig(project);

    this.statusBar.markActionBusy(action);
    this.statusBar.setStopVisible(true); // stoppable while the task runs; the finally recomputes
    try {
      // Two-stage adapters (CMake) configure with the overlay here, before the build task
      // (which is a single `cmake --build`). A configure failure aborts the invocation.
      try {
        await adapter.prepareInvocation?.(project, selection, config);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`DevSwitcher: ${action} preparation failed — ${message}`);
        return;
      }
      // Pre-build commands (F21/C-5) run first; a failure aborts the build.
      if (!(await this.runBuildEvents(project, config.preBuild, 'pre'))) {
        return;
      }
      // A run may need a prior build (CMake: run executes a pre-built artifact, not a
      // self-building command). Build the target first and abort if it fails.
      if (action === 'run' && adapter.actions.runRequiresBuild) {
        const build = await this.taskRunner.run(adapter.createBuildTask(project, selection, config), project.id);
        if (!build.succeeded) {
          if (!this.stopping.has(project.id)) {
            await this.showTaskFailure('build', build.exitCode);
          }
          return;
        }
      }
      // Task built after prepareInvocation so a sync run task (CMake) can read the warm cache.
      const task =
        action === 'build'
          ? adapter.createBuildTask(project, selection, config)
          : adapter.createRunTask(project, selection, config);
      const result = await this.taskRunner.run(task, project.id);
      if (!result.succeeded) {
        // A user-initiated stop (devSwitcher.stop) ends the task as "not succeeded"; that is
        // not a failure, so skip the error toast for it.
        if (!this.stopping.has(project.id)) {
          await this.showTaskFailure(action, result.exitCode);
        }
        return;
      }
      // Post-build commands run only after the build/run succeeds.
      await this.runBuildEvents(project, config.postBuild, 'post');
    } finally {
      this.stopping.delete(project.id);
      await this.renderActive(); // clear the busy spinner
    }
  }

  /** Report a failed build/run with a "Show Problems" affordance (E?/§7.3). */
  private async showTaskFailure(action: string, exitCode: number | undefined): Promise<void> {
    const showProblems = 'Show Problems';
    const choice = await vscode.window.showErrorMessage(
      `DevSwitcher: ${action} failed (exit ${exitCode ?? 'unknown'}).`,
      showProblems,
    );
    if (choice === showProblems) {
      void vscode.commands.executeCommand('workbench.actions.view.problems');
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
      // A required chip that doesn't apply to this project (e.g. the Preset chip when there
      // is no CMakePresets.json) must not block the action (TASK-041).
      if (chip.appliesTo && !(await chip.appliesTo(project))) {
        continue;
      }
      const value = await pickChipValue(chip, project, undefined);
      if (value === undefined) {
        return false;
      }
      await this.store.setValue(project.id, chip.id, value);
      this.renderBar(adapter, project);
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
    this.hiddenChips = await this.resolveHiddenChips(project, adapter);
    await this.applyDefaults(project, adapter);
    this.renderBar(adapter, project);
    this.refreshStopButton();
    this.viewSync();
  }

  /**
   * Drive the status-bar Stop button from the active project's running state: a live
   * `run`/`build` task, or an active debug session that is ours (named `Debug <project>` or
   * launched in the project's folder). Called on renders, at action start, and on debug
   * session start/end (wired in extension.ts) so the button appears only while something can
   * be stopped.
   */
  refreshStopButton(): void {
    const activeId = this.store.activeProjectId;
    const project = activeId ? this.registry.project(activeId) : undefined;
    if (!project) {
      this.statusBar.setStopVisible(false);
      return;
    }
    const taskRunning = this.taskRunner.isRunning(project.id);
    const session = vscode.debug.activeDebugSession;
    const debugRunning =
      session !== undefined &&
      session.name.startsWith('Debug ') &&
      (session.name === `Debug ${project.name}` ||
        session.workspaceFolder?.uri.toString() === project.workspaceFolder.uri.toString());
    this.statusBar.setStopVisible(taskRunning || debugRunning);
  }

  /** Render the status bar for the active project honouring the resolved chip visibility. */
  private renderBar(adapter: LanguageAdapter, project: ProjectInfo): void {
    this.statusBar.render(adapter, project, this.store.getSelection(project.id), {
      hiddenChipIds: this.hiddenChips,
    });
  }

  /**
   * Chip ids not applicable to this project (TASK-041). A chip with an `appliesTo`
   * predicate that resolves false is hidden — CMake uses it to swap the Preset chip for
   * profile/architecture. A predicate that throws leaves the chip visible (fail-open).
   */
  private async resolveHiddenChips(project: ProjectInfo, adapter: LanguageAdapter): Promise<ReadonlySet<string>> {
    const hidden = new Set<string>();
    for (const chip of adapter.chips) {
      if (!chip.appliesTo) {
        continue;
      }
      try {
        if (!(await chip.appliesTo(project))) {
          hidden.add(chip.id);
        }
      } catch {
        // applicability unknown — keep the chip visible rather than silently dropping it
      }
    }
    return hidden;
  }

  /** Seed unset chips from their defaultValue (e.g. profile=dev, sole bin target). */
  private async applyDefaults(project: ProjectInfo, adapter: LanguageAdapter): Promise<void> {
    for (const chip of adapter.chips) {
      if (this.hiddenChips.has(chip.id)) {
        continue; // don't seed a chip this project doesn't show (e.g. profile under a preset)
      }
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
