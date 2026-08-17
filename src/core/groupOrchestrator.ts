import * as vscode from 'vscode';
import { DevSwitcherError } from './errors';
import { planGroupExecution, validateGroup } from './runGroupPlan';
import { sequenceGroup, type MemberHandle } from './groupSequencer';
import type { AdapterRegistry } from './adapterRegistry';
import type { StateStore } from './stateStore';
import type { TaskRunner } from './taskRunner';
import type { InvocationConfig, LanguageAdapter, ProjectInfo, RunGroup, StartedTask } from './types';

/**
 * GroupOrchestrator — starts and stops run groups (TASK-037, C-6 / MS-013 / ADR-015).
 *
 * A group's members are started in dependency order: planGroupExecution lays them out
 * in layers, and sequenceGroup starts each layer in parallel, advancing only when the
 * whole layer is "ready" (its processes spawned — readiness = process spawn, not exit,
 * ADR-015). Members run only; a member that needs a prior build (runRequiresBuild) is
 * built first via the one-shot TaskRunner.run. Long-lived members are tracked so the
 * group can be torn down (terminate). The per-project lock is reused (TaskRunner), so a
 * project already running individually can't also start inside a group.
 *
 * The definition/trigger UI is TASK-038; this class is the engine it drives.
 */
export class GroupOrchestrator {
  /** groupId -> the still-running started tasks for that group. */
  private readonly running = new Map<string, StartedTask[]>();

  /** Notified when a group starts/stops (or a member exits), so the UI can re-render (TASK-038). */
  private onChange: () => void = () => {};

  constructor(
    private readonly registry: AdapterRegistry,
    private readonly store: StateStore,
    private readonly taskRunner: TaskRunner,
  ) {}

  setOnChange(callback: () => void): void {
    this.onChange = callback;
  }

  isRunning(groupId: string): boolean {
    return this.running.has(groupId);
  }

  /** Group ids with at least one member still running (targets for stopGroup). */
  runningGroupIds(): string[] {
    return [...this.running.keys()];
  }

  /**
   * Command entry point (TASK-038 replaces this with the settings-page trigger + status
   * bar entry): pick a defined group and start it. Shows a hint when none are defined yet.
   */
  async promptRunGroup(): Promise<void> {
    const groups = this.store.getGroups();
    if (groups.length === 0) {
      void vscode.window.showInformationMessage(
        'DevSwitcher: no run groups defined yet. Create one in DevSwitcher settings.',
      );
      return;
    }
    const picked = await vscode.window.showQuickPick(
      groups.map((group) => ({
        label: group.name,
        description: `${group.members.length} member(s)`,
        id: group.id,
      })),
      { placeHolder: 'Select a run group to start' },
    );
    if (picked) {
      await this.runGroup(picked.id);
    }
  }

  /** Command entry point: pick a running group and stop it. */
  async promptStopGroup(): Promise<void> {
    const running = this.runningGroupIds()
      .map((id) => this.store.getGroup(id))
      .filter((group): group is RunGroup => group !== undefined);
    if (running.length === 0) {
      void vscode.window.showInformationMessage('DevSwitcher: no run group is currently running.');
      return;
    }
    const picked = await vscode.window.showQuickPick(
      running.map((group) => ({ label: group.name, id: group.id })),
      { placeHolder: 'Select a running group to stop' },
    );
    if (picked) {
      await this.stopGroup(picked.id);
    }
  }

  /**
   * Unified group menu — the status-bar launcher's entry point (TASK-038). Lists each
   * group as Run (stopped) or Stop (running), plus "Stop all" when more than one runs,
   * so a single icon covers start, stop, and stop-all.
   */
  async promptGroups(): Promise<void> {
    const groups = this.store.getGroups();
    if (groups.length === 0) {
      void vscode.window.showInformationMessage(
        'DevSwitcher: no run groups defined yet. Create one in DevSwitcher settings.',
      );
      return;
    }
    const running = new Set(this.runningGroupIds());
    const items: Array<vscode.QuickPickItem & { act: 'run' | 'stop' | 'stopAll'; groupId?: string }> = [];
    if (running.size > 1) {
      items.push({ label: '$(debug-stop) Stop all running groups', act: 'stopAll' });
    }
    for (const group of groups) {
      if (running.has(group.id)) {
        items.push({ label: `$(debug-stop) Stop "${group.name}"`, description: 'running', act: 'stop', groupId: group.id });
      } else {
        items.push({
          label: `$(run-all) Run "${group.name}"`,
          description: `${group.members.length} member(s)`,
          act: 'run',
          groupId: group.id,
        });
      }
    }
    const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Run or stop a group' });
    if (!picked) {
      return;
    }
    if (picked.act === 'stopAll') {
      await this.stopAll();
    } else if (picked.act === 'stop' && picked.groupId) {
      await this.stopGroup(picked.groupId);
    } else if (picked.act === 'run' && picked.groupId) {
      await this.runGroup(picked.groupId);
    }
  }

  /** Stop every running group (teardown all). */
  async stopAll(): Promise<void> {
    const ids = this.runningGroupIds();
    for (const id of ids) {
      for (const task of [...(this.running.get(id) ?? [])].reverse()) {
        task.terminate();
      }
    }
    if (ids.length > 0) {
      void vscode.window.showInformationMessage(`DevSwitcher: stopped ${ids.length} run group(s).`);
    }
  }

  /**
   * Start a group (C-6). Validates the definition, orders it, then starts members
   * layer by layer, advancing on readiness. Aborts and tears down already-started
   * members if any member fails to start.
   */
  async runGroup(groupId: string): Promise<void> {
    const group = this.store.getGroup(groupId);
    if (!group) {
      void vscode.window.showErrorMessage(`DevSwitcher: run group not found.`);
      return;
    }
    if (this.running.has(groupId)) {
      void vscode.window.showInformationMessage(`DevSwitcher: run group "${group.name}" is already running.`);
      return;
    }
    const problems = validateGroup(group);
    if (problems.length > 0) {
      void vscode.window.showErrorMessage(`DevSwitcher: cannot run "${group.name}" — ${problems[0]}`);
      return;
    }
    // Tasks won't run in an untrusted workspace (the process never starts, so no member
    // would become ready) — guard up front instead of hanging on the first member.
    if (!vscode.workspace.isTrusted) {
      void vscode.window.showWarningMessage(`DevSwitcher: trust this workspace to run a group.`);
      return;
    }

    const plan = planGroupExecution(group); // validateGroup already ruled out a cycle
    const tracked: StartedTask[] = [];
    this.running.set(groupId, tracked);
    this.onChange();

    const outcome = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `DevSwitcher: starting run group "${group.name}"…`,
        cancellable: false,
      },
      () => sequenceGroup(plan.layers, (projectId) => this.startMember(projectId, groupId, tracked)),
    );

    if (outcome.aborted) {
      // sequenceGroup already terminated the members it started; drop the group entry
      // (the terminated tasks' done handlers also prune, but be explicit for state).
      this.running.delete(groupId);
      this.onChange();
      void vscode.window.showErrorMessage(
        `DevSwitcher: run group "${group.name}" aborted — started members were stopped.`,
      );
      return;
    }

    if (tracked.length === 0) {
      // Every member exited as soon as it started (all one-shot) — nothing left running.
      this.running.delete(groupId);
      this.onChange();
      void vscode.window.showInformationMessage(
        `DevSwitcher: run group "${group.name}" ran ${outcome.started.length} member(s).`,
      );
      return;
    }

    void vscode.window.showInformationMessage(
      `DevSwitcher: run group "${group.name}" started ${outcome.started.length} member(s).`,
    );
  }

  /** Stop a running group by terminating its still-running members (teardown). */
  async stopGroup(groupId: string): Promise<void> {
    const group = this.store.getGroup(groupId);
    const tracked = this.running.get(groupId);
    if (!tracked || tracked.length === 0) {
      void vscode.window.showInformationMessage(`DevSwitcher: run group "${group?.name ?? groupId}" is not running.`);
      return;
    }
    // Terminate in reverse start order; each termination prunes itself via its done handler.
    for (const task of [...tracked].reverse()) {
      task.terminate();
    }
    void vscode.window.showInformationMessage(`DevSwitcher: stopped run group "${group?.name ?? groupId}".`);
  }

  /**
   * Start one member: resolve project + adapter, guard required chips, prepare + build
   * if needed, then start the long-lived run task. The started task is tracked (and
   * pruned when it exits) so the group can be torn down. A failure surfaces its reason
   * and throws so sequenceGroup aborts + tears down.
   */
  private async startMember(projectId: string, groupId: string, tracked: StartedTask[]): Promise<MemberHandle> {
    // Already running — an individual Run, or another group — so its per-project lock is
    // held elsewhere. Treat it as ready and don't start or track it: the dependency chain
    // proceeds and teardown won't stop a task this group didn't launch (skip semantics).
    if (this.taskRunner.isRunning(projectId)) {
      return { ready: Promise.resolve({ started: true }), terminate: () => {} };
    }
    try {
      const project = this.registry.project(projectId);
      if (!project) {
        throw new DevSwitcherError('GROUP_MEMBER_MISSING', `${projectId} is not a project in this workspace.`);
      }
      const adapter = this.registry.adapterFor(project);
      if (!adapter) {
        throw new DevSwitcherError('GROUP_MEMBER_NO_ADAPTER', `No adapter for ${project.name}.`);
      }
      await this.assertConfigured(project, adapter);

      const selection = this.store.getSelection(projectId);
      const config = this.activeConfig(project);

      // Two-stage adapters (CMake) configure with the overlay first (§7.4 / ADR-014).
      await adapter.prepareInvocation?.(project, selection, config);
      // A run that executes a pre-built artifact (CMake) builds first; a build failure
      // aborts this member (and therefore its dependents).
      if (adapter.actions.runRequiresBuild) {
        const build = await this.taskRunner.run(adapter.createBuildTask(project, selection, config), projectId);
        if (!build.succeeded) {
          throw new DevSwitcherError(
            'GROUP_MEMBER_BUILD_FAILED',
            `build failed for ${project.name} (exit ${build.exitCode ?? 'unknown'}).`,
          );
        }
      }

      const startedTask = await this.taskRunner.start(adapter.createRunTask(project, selection, config), projectId);
      tracked.push(startedTask);
      // Prune when the member exits on its own (crash / one-shot) so `running` reflects reality.
      void startedTask.done.then(() => this.prune(groupId, tracked, startedTask));

      return { ready: startedTask.ready, terminate: () => startedTask.terminate() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`DevSwitcher: ${message}`);
      throw error;
    }
  }

  /** Remove a finished member; when a group has no members left, drop it from `running`. */
  private prune(groupId: string, tracked: StartedTask[], task: StartedTask): void {
    const index = tracked.indexOf(task);
    if (index >= 0) {
      tracked.splice(index, 1);
    }
    if (tracked.length === 0 && this.running.get(groupId) === tracked) {
      this.running.delete(groupId);
    }
    this.onChange();
  }

  /** E4-style guard: a required (and applicable) chip must be set before a group run —
   *  a group can't stop to prompt mid-launch, so fail fast pointing at the fix. */
  private async assertConfigured(project: ProjectInfo, adapter: LanguageAdapter): Promise<void> {
    for (const chip of adapter.chips) {
      if (!chip.required) {
        continue;
      }
      if (chip.appliesTo && !(await chip.appliesTo(project))) {
        continue; // a required chip that doesn't apply to this project (e.g. CMake Preset) doesn't block
      }
      if (this.store.getValue(project.id, chip.id) === undefined) {
        throw new DevSwitcherError(
          'GROUP_MEMBER_UNCONFIGURED',
          `${project.name} needs its "${chip.label}" selected before it can run in a group.`,
        );
      }
    }
  }

  /** The invocation overlay for the active (project × profile) (ADR-011), mirroring Orchestrator. */
  private activeConfig(project: ProjectInfo): InvocationConfig {
    const profile = this.store.getValue(project.id, 'profile');
    return this.store.getInvocation(project.id, typeof profile === 'string' ? profile : 'dev');
  }
}
