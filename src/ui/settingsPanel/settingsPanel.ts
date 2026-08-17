import * as vscode from 'vscode';
import type { AdapterRegistry } from '../../core/adapterRegistry';
import type { StateStore } from '../../core/stateStore';
import type { GroupOrchestrator } from '../../core/groupOrchestrator';
import { applyOption, setBuildEventLines, setRunArgsLine } from '../../core/invocationConfig';
import { memberStages, validateGroup, withMember, withMemberStage } from '../../core/runGroupPlan';
import type { ChipItem, ChipValue, InvocationConfig, LanguageAdapter, OptionSpec, OptionValue, ProjectInfo, RunGroup } from '../../core/types';
import { getSettingsHtml } from './html';

/** One chip rendered in the settings page (options + current value). */
export interface ChipView {
  id: string;
  label: string;
  icon: string;
  multiSelect: boolean;
  required: boolean;
  items: ChipItem[];
  value: ChipValue | undefined;
}

/** One run group as the webview renders it (members with their stage + running/validation state). */
export interface GroupView {
  id: string;
  name: string;
  /** Members with their 1-based stage (order); same stage = parallel. */
  members: Array<{ projectId: string; stage: number }>;
  running: boolean;
  problems: string[];
}

/** The full state the webview renders (rebuilt and re-sent after every change). */
export interface SettingsState {
  projects: Array<{ id: string; name: string; adapterId: string }>;
  activeProjectId?: string;
  displayName?: string;
  profile: string;
  actionsBuild: boolean;
  chips: ChipView[];
  configCategories: string[];
  optionCatalog: OptionSpec[];
  invocation: InvocationConfig;
  commandPreview: string;
  statusBar: { compact: boolean; selectedOnly: boolean };
  groups: GroupView[];
}

/** Messages the webview sends to the extension (상세설계서 §10.3). */
type InMessage =
  | { type: 'ready' }
  | { type: 'switchProject'; projectId: string }
  | { type: 'setChipValue'; chipId: string; value: ChipValue }
  | { type: 'setOption'; optionId: string; value: OptionValue }
  | { type: 'clearOption'; optionId: string }
  | { type: 'setRunArgs'; line: string }
  | { type: 'setBuildEvent'; event: 'preBuild' | 'postBuild'; text: string }
  | { type: 'setStatusBarPref'; key: 'compact' | 'selectedOnly'; value: boolean }
  // Run groups (C-6 / MS-013) — workspace-level, independent of the active project.
  | { type: 'createGroup'; name: string }
  | { type: 'renameGroup'; groupId: string; name: string }
  | { type: 'deleteGroup'; groupId: string }
  | { type: 'setGroupMember'; groupId: string; projectId: string; member: boolean }
  | { type: 'setMemberStage'; groupId: string; projectId: string; stage: number }
  | { type: 'runGroup'; groupId: string }
  | { type: 'stopGroup'; groupId: string };

/**
 * SettingsPanel — the WebviewPanel settings page (TASK-013, F21 / ADR-012 / 상세설계서 §10).
 *
 * Language-agnostic: it renders from ChipDescriptor[] / optionCatalog / configCategories,
 * so adding an adapter needs no change here. Data flows one way (§10.3) — the webview
 * never keeps its own truth; every change posts a message, the extension mutates the
 * StateStore, and the whole state is re-sent. The overlay it edits is injected at build
 * time (TASK-012). The invocation tab's editor lands in TASK-014.
 */
export class SettingsPanel {
  private panel: vscode.WebviewPanel | undefined;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private readonly registry: AdapterRegistry,
    private readonly store: StateStore,
    private readonly groups: GroupOrchestrator,
    private readonly onChanged: () => void,
  ) {}

  /** Open the settings page, or reveal it if already open (single instance). */
  open(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }
    this.panel = vscode.window.createWebviewPanel(
      'devSwitcherSettings',
      'DevSwitcher Settings',
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: false },
    );
    this.panel.webview.html = getSettingsHtml(this.panel.webview, makeNonce());
    this.panel.onDidDispose(() => this.disposePanel(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message: InMessage) => void this.onMessage(message),
      null,
      this.disposables,
    );
  }

  /** Re-send state to an open page (no-op when closed) — for external changes
   *  (status-bar chip picks, manifest rescans) so the page stays live without Refresh. */
  refresh(): void {
    void this.postState();
  }

  dispose(): void {
    this.disposePanel();
    this.panel?.dispose();
  }

  private async onMessage(message: InMessage): Promise<void> {
    if (message.type === 'ready') {
      await this.postState();
      return;
    }

    // Run-group messages are workspace-level (no active project needed).
    if (await this.handleGroupMessage(message)) {
      this.onChanged();
      await this.postState();
      return;
    }

    const activeId = this.store.activeProjectId;
    if (message.type === 'switchProject') {
      await this.store.setActiveProject(message.projectId);
    } else if (message.type === 'setStatusBarPref') {
      // Global display prefs — write to the VSCode config (the same setting the native
      // Settings UI edits). onDidChangeConfiguration re-renders the status bar.
      await vscode.workspace
        .getConfiguration('devSwitcher')
        .update(`statusBar.${message.key}`, message.value, vscode.ConfigurationTarget.Global);
    } else if (activeId !== undefined) {
      switch (message.type) {
        case 'setChipValue':
          await this.store.setValue(activeId, message.chipId, message.value);
          break;
        case 'setOption': {
          const spec = this.specFor(activeId, message.optionId);
          if (spec) {
            await this.editInvocation(activeId, (config) => applyOption(config, spec, message.value));
          }
          break;
        }
        case 'clearOption': {
          const spec = this.specFor(activeId, message.optionId);
          if (spec) {
            await this.editInvocation(activeId, (config) => applyOption(config, spec, undefined));
          }
          break;
        }
        case 'setRunArgs':
          await this.editInvocation(activeId, (config) => setRunArgsLine(config, message.line));
          break;
        case 'setBuildEvent':
          await this.editInvocation(activeId, (config) => setBuildEventLines(config, message.event, message.text));
          break;
      }
    }

    this.onChanged(); // keep the status bar in sync
    await this.postState();
  }

  /**
   * Handle a run-group message (C-6). Returns true when the message was a group message
   * (so the caller skips the per-project handling). Group edits mutate the stored group
   * and persist; run/stop delegate to the GroupOrchestrator.
   */
  private async handleGroupMessage(message: InMessage): Promise<boolean> {
    switch (message.type) {
      case 'createGroup': {
        const name = message.name.trim() || 'New group';
        await this.store.saveGroup({ id: makeGroupId(), name, members: [] });
        return true;
      }
      case 'renameGroup': {
        const group = this.store.getGroup(message.groupId);
        if (group) {
          await this.store.saveGroup({ ...group, name: message.name.trim() || group.name });
        }
        return true;
      }
      case 'deleteGroup': {
        if (this.groups.isRunning(message.groupId)) {
          void vscode.window.showWarningMessage('DevSwitcher: stop the run group before deleting it.');
          return true;
        }
        await this.store.deleteGroup(message.groupId);
        return true;
      }
      case 'setGroupMember': {
        await this.editGroup(message.groupId, (group) => withMember(group, message.projectId, message.member));
        return true;
      }
      case 'setMemberStage': {
        await this.editGroup(message.groupId, (group) =>
          withMemberStage(group, message.projectId, message.stage),
        );
        return true;
      }
      case 'runGroup':
        await this.groups.runGroup(message.groupId);
        return true;
      case 'stopGroup':
        await this.groups.stopGroup(message.groupId);
        return true;
      default:
        return false;
    }
  }

  /** Apply a pure edit to a stored group and persist it. */
  private async editGroup(groupId: string, edit: (group: RunGroup) => RunGroup): Promise<void> {
    const group = this.store.getGroup(groupId);
    if (group) {
      await this.store.saveGroup(edit(group));
    }
  }

  /** Apply an overlay edit for the active (project × profile) and persist it. */
  private async editInvocation(
    projectId: string,
    edit: (config: InvocationConfig) => InvocationConfig,
  ): Promise<void> {
    const project = this.registry.project(projectId);
    if (!project) {
      return;
    }
    const profile = this.activeProfile(project);
    const next = edit(this.store.getInvocation(project.id, profile));
    await this.store.setInvocation(project.id, profile, next);
  }

  private specFor(projectId: string, optionId: string): OptionSpec | undefined {
    const project = this.registry.project(projectId);
    const adapter = project ? this.registry.adapterFor(project) : undefined;
    return adapter?.optionCatalog.find((option) => option.id === optionId);
  }

  private activeProfile(project: ProjectInfo): string {
    const value = this.store.getValue(project.id, 'profile');
    return typeof value === 'string' ? value : 'dev';
  }

  private async postState(): Promise<void> {
    if (!this.panel) {
      return;
    }
    await this.panel.webview.postMessage({ type: 'state', ...(await this.buildState()) });
  }

  private async buildState(): Promise<SettingsState> {
    const projects = this.registry.getProjects().map((p) => ({
      id: p.id,
      name: p.name,
      adapterId: p.adapterId,
    }));

    const groups = this.buildGroupViews();

    const activeId = this.store.activeProjectId;
    const project = activeId ? this.registry.project(activeId) : undefined;
    const adapter = project ? this.registry.adapterFor(project) : undefined;
    if (!project || !adapter) {
      return {
        projects,
        profile: 'dev',
        actionsBuild: false,
        chips: [],
        configCategories: [],
        optionCatalog: [],
        invocation: {},
        commandPreview: '',
        statusBar: this.statusBarPrefs(),
        groups,
      };
    }

    const profileValue = this.store.getValue(project.id, 'profile');
    const profile = typeof profileValue === 'string' ? profileValue : 'dev';

    const chips: ChipView[] = [];
    for (const chip of adapter.chips) {
      // Respect the same per-project visibility as the status bar (TASK-041): a chip that
      // doesn't apply (e.g. profile/architecture when a CMake preset is active) gets no tab.
      if (chip.appliesTo && !(await chip.appliesTo(project))) {
        continue;
      }
      let items: ChipItem[] = [];
      try {
        items = await chip.listItems(project);
      } catch {
        // metadata/toolchain unavailable — render the chip with its stored value only
      }
      chips.push({
        id: chip.id,
        label: chip.label,
        icon: chip.icon,
        multiSelect: chip.multiSelect === true,
        required: chip.required === true,
        items,
        value: this.store.getValue(project.id, chip.id),
      });
    }

    const invocation = this.store.getInvocation(project.id, profile);
    return {
      projects,
      activeProjectId: project.id,
      displayName: adapter.displayName,
      profile,
      actionsBuild: adapter.actions.build,
      chips,
      configCategories: adapter.configCategories,
      optionCatalog: adapter.optionCatalog,
      invocation,
      commandPreview: this.commandPreview(adapter, project, invocation),
      statusBar: this.statusBarPrefs(),
      groups,
    };
  }

  /** The stored run groups annotated with each member's stage + running/validation state (C-6). */
  private buildGroupViews(): GroupView[] {
    return this.store.getGroups().map((group) => {
      const stages = memberStages(group);
      return {
        id: group.id,
        name: group.name,
        members: group.members.map((m) => ({ projectId: m.projectId, stage: stages.get(m.projectId) ?? 1 })),
        running: this.groups.isRunning(group.id),
        problems: validateGroup(group),
      };
    });
  }

  /** Current global status-bar display prefs (the same VSCode config the native UI edits). */
  private statusBarPrefs(): { compact: boolean; selectedOnly: boolean } {
    const config = vscode.workspace.getConfiguration('devSwitcher');
    return {
      compact: config.get<boolean>('statusBar.compact', false),
      selectedOnly: config.get<boolean>('statusBar.selectedOnly', false),
    };
  }

  /**
   * The build and run commands the current selection + overlay would produce, read
   * from each Task's ProcessExecution (adapter-agnostic). Two lines so compiler
   * --config args (build) and run-args after `--` (run) are both visible; each line
   * is prefixed with any injected env (RUSTFLAGS / CARGO_TARGET_DIR / RUST_LOG) as a
   * shell-style VAR=val so env-only options aren't invisible. Empty lines are dropped;
   * stub adapters that can't build a Task yield nothing.
   */
  private commandPreview(adapter: LanguageAdapter, project: ProjectInfo, config: InvocationConfig): string {
    const selection = this.store.getSelection(project.id);
    const lines: string[] = [];
    // Pre/post-build commands (F21) wrap the build/run — shown so the whole sequence is visible.
    (config.preBuild ?? []).forEach((command) => lines.push(`pre:    ${command}`));
    if (adapter.actions.build) {
      const build = this.previewOf(() => adapter.createBuildTask(project, selection, config));
      if (build) {
        lines.push(`build:  ${build}`);
      }
    }
    const run = this.previewOf(() => adapter.createRunTask(project, selection, config));
    if (run) {
      lines.push(`run:    ${run}`);
    }
    (config.postBuild ?? []).forEach((command) => lines.push(`post:   ${command}`));
    return lines.join('\n');
  }

  private previewOf(make: () => vscode.Task): string {
    try {
      const execution = make().execution;
      if (execution instanceof vscode.ProcessExecution) {
        const quote = (s: string) => (/\s/.test(s) ? `"${s}"` : s);
        // Overlay env (RUSTFLAGS / CARGO_TARGET_DIR / RUST_LOG …) is injected via the
        // process environment, not argv, so show it as a shell-style VAR=val prefix —
        // otherwise env-injected options are invisible in the preview.
        const env = execution.options?.env ?? {};
        const envPrefix = Object.entries(env)
          .map(([k, v]) => `${k}=${quote(String(v))}`)
          .join(' ');
        const cmd = [execution.process, ...execution.args.map(quote)].join(' ');
        return envPrefix ? `${envPrefix} ${cmd}` : cmd;
      }
    } catch {
      // stub adapter (notImplemented) or assembly error — no preview
    }
    return '';
  }

  private disposePanel(): void {
    this.panel = undefined;
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }
}

/** A stable, unique run-group id. */
function makeGroupId(): string {
  return `group:${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** CSP nonce — a per-load random token so only our inline script/style run. */
function makeNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
