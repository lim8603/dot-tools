import * as vscode from 'vscode';
import type { AdapterRegistry } from '../../core/adapterRegistry';
import type { StateStore } from '../../core/stateStore';
import type { GroupOrchestrator } from '../../core/groupOrchestrator';
import { applyOption, setBuildEventLines, setRunArgsLine } from '../../core/invocationConfig';
import { memberStages, validateGroup, withMember, withMemberReadiness, withMemberStage } from '../../core/runGroupPlan';
import type { ChipDescriptor, ChipItem, ChipValue, DiagnosticProbe, InvocationConfig, LanguageAdapter, OptionSpec, OptionValue, ProjectInfo, ReadinessProbe, RunGroup } from '../../core/types';
import { deriveToolchain, formatChipValue, ToolchainStatus } from './projectCard';
import { getSettingsHtml } from './html';
import { RawCommand, RawKeybinding, ShortcutRow, buildShortcutList } from './shortcuts';

/** This extension's id (publisher.name) — used to deep-link the native Keyboard Shortcuts editor. */
const EXTENSION_ID = 'lim8603.devswitcher-tools';

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
  /** Members with their 1-based stage (order; same stage = parallel) and optional readiness
   *  gate (MS-018). readiness omitted = process-spawn readiness. */
  members: Array<{ projectId: string; stage: number; readiness?: ReadinessProbe }>;
  running: boolean;
  problems: string[];
}

/** One chip's summary on a project card (B-2): its label, current formatted value, and how
 *  many items the adapter detected for it (bin / script / target count). Adapter-agnostic —
 *  built from ChipDescriptor + stored value only, never from language knowledge (INV-2). */
export interface CardChip {
  id: string;
  label: string;
  /** Formatted current value; undefined when nothing is stored (shown as "—"). */
  value?: string;
  /** Available items detected for this chip (e.g. Cargo bins, npm scripts, Go targets). */
  count: number;
}

/** An enriched project entry the Project tab renders as a card (B-2). Every field derives
 *  from declarative adapter data (displayName, chips, Doctor probes), so the UI adds no
 *  language knowledge and adapters need no change here (INV-2). */
export interface ProjectCard {
  id: string;
  name: string;
  adapterId: string;
  displayName: string;
  /** Manifest path relative to the workspace (multi-root aware). */
  manifestPath: string;
  active: boolean;
  /** Effective active profile (the 'profile' chip's value/default), when the adapter has one. */
  profile?: string;
  /** Per-chip summary, excluding the profile chip (surfaced separately as `profile`). */
  chips: CardChip[];
  toolchain: ToolchainStatus;
}

/** The full state the webview renders (rebuilt and re-sent after every change). */
export interface SettingsState {
  projects: Array<{ id: string; name: string; adapterId: string }>;
  /** Enriched per-project cards for the Project tab (B-2). */
  projectCards: ProjectCard[];
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
  /** Default keyboard shortcuts (MS-017 / ADR-017) shown in the General tab. */
  shortcuts: ShortcutRow[];
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
  // Keyboard shortcuts (MS-017) — deep-link the native editor (optionally filtered).
  | { type: 'openKeybindings'; query?: string }
  // Run groups (C-6 / MS-013) — workspace-level, independent of the active project.
  | { type: 'createGroup'; name: string }
  | { type: 'renameGroup'; groupId: string; name: string }
  | { type: 'deleteGroup'; groupId: string }
  | { type: 'setGroupMember'; groupId: string; projectId: string; member: boolean }
  | { type: 'setMemberStage'; groupId: string; projectId: string; stage: number }
  // Per-member readiness gate (MS-018) — undefined clears it back to process-spawn readiness.
  | { type: 'setMemberReadiness'; groupId: string; projectId: string; readiness: ReadinessProbe | undefined }
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
  /**
   * Toolchain probe results cached per adapter for the panel's lifetime (B-2). buildState
   * reruns on every in-panel edit (setOption → onChanged → renderActive → viewSync →
   * refresh), and collectDiagnostics spawns subprocesses (cargo --version, node --version …);
   * caching keeps option-editing snappy. Cleared when the panel closes — a toolchain
   * installed mid-session (via Doctor) shows after reopening Settings.
   */
  private toolchainCache = new Map<string, ToolchainStatus>();

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

    if (message.type === 'openKeybindings') {
      // Delegate customization to VSCode's native Keyboard Shortcuts editor (ADR-017): the
      // query pre-filters it (default = all DevSwitcher commands via @ext:, or a single
      // command id for a per-row edit link). No state change, so no re-post.
      await vscode.commands.executeCommand(
        'workbench.action.openGlobalKeybindings',
        message.query ?? `@ext:${EXTENSION_ID}`,
      );
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
      case 'setMemberReadiness': {
        await this.editGroup(message.groupId, (group) =>
          withMemberReadiness(group, message.projectId, message.readiness),
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
    const projectCards = await this.buildProjectCards(activeId);
    const project = activeId ? this.registry.project(activeId) : undefined;
    const adapter = project ? this.registry.adapterFor(project) : undefined;
    if (!project || !adapter) {
      return {
        projects,
        projectCards,
        profile: 'dev',
        actionsBuild: false,
        chips: [],
        configCategories: [],
        optionCatalog: [],
        invocation: {},
        commandPreview: '',
        statusBar: this.statusBarPrefs(),
        groups,
        shortcuts: this.shortcuts(),
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
      projectCards,
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
      shortcuts: this.shortcuts(),
    };
  }

  /**
   * Build the enriched Project-tab cards (B-2). For each detected project it pulls the
   * adapter's display name, the manifest path, the effective profile, a per-chip summary
   * (formatted value + detected item count), and a toolchain ✅/❌ from Doctor probes —
   * all from declarative adapter data, so the Project tab stays language-agnostic (INV-2).
   */
  private async buildProjectCards(activeId: string | undefined): Promise<ProjectCard[]> {
    const cards: ProjectCard[] = [];
    for (const project of this.registry.getProjects()) {
      const adapter = this.registry.adapterFor(project);
      const toolchain = await this.toolchainStatus(adapter);
      const chips: CardChip[] = [];
      let profile: string | undefined;
      if (adapter) {
        for (const chip of adapter.chips) {
          // Respect the same per-project visibility as the status bar (TASK-041): a chip
          // that doesn't apply (e.g. profile when a CMake preset is active) is skipped.
          if (chip.appliesTo && !(await chip.appliesTo(project))) {
            continue;
          }
          let count = 0;
          try {
            // Count readily-available items only: `secondary` items (e.g. cargo's ~100
            // not-installed rustup targets, hidden behind the QuickPick toggle) would
            // otherwise inflate the architecture count into the hundreds.
            const items = await chip.listItems(project);
            count = items.filter((it) => !it.secondary).length;
          } catch {
            // metadata/toolchain unavailable — leave the count at 0
          }
          const raw = this.store.getValue(project.id, chip.id);
          // The active profile gets its own card line (not a chip row); fall back to the
          // chip's default so an unset-but-effective profile still shows.
          if (chip.id === 'profile') {
            const value = raw ?? (await this.chipDefault(chip, project));
            if (value !== undefined) {
              profile = formatChipValue(chip, value);
            }
            continue;
          }
          const value = raw === undefined ? undefined : formatChipValue(chip, raw);
          chips.push({ id: chip.id, label: chip.label, value, count });
        }
      }
      cards.push({
        id: project.id,
        name: project.name,
        adapterId: project.adapterId,
        displayName: adapter?.displayName ?? project.adapterId,
        manifestPath: vscode.workspace.asRelativePath(project.manifestPath),
        active: project.id === activeId,
        profile,
        chips,
        toolchain,
      });
    }
    return cards;
  }

  /** A chip's default value, or undefined when it declares none or throws (B-2). */
  private async chipDefault(chip: ChipDescriptor, project: ProjectInfo): Promise<ChipValue | undefined> {
    try {
      return chip.defaultValue ? await chip.defaultValue(project) : undefined;
    } catch {
      return undefined;
    }
  }

  /** Toolchain indicator for a project card, cached per adapter for the panel's lifetime (B-2). */
  private async toolchainStatus(adapter: LanguageAdapter | undefined): Promise<ToolchainStatus> {
    if (!adapter) {
      return { status: 'unknown', label: 'unknown adapter' };
    }
    const cached = this.toolchainCache.get(adapter.id);
    if (cached) {
      return cached;
    }
    let probes: DiagnosticProbe[] = [];
    try {
      probes = await adapter.collectDiagnostics();
    } catch {
      // Probing failed unexpectedly — report unknown rather than break the card.
    }
    const status = deriveToolchain(adapter, probes);
    this.toolchainCache.set(adapter.id, status);
    return status;
  }

  /** The stored run groups annotated with each member's stage + readiness + running/validation state (C-6). */
  private buildGroupViews(): GroupView[] {
    return this.store.getGroups().map((group) => {
      const stages = memberStages(group);
      return {
        id: group.id,
        name: group.name,
        members: group.members.map((m) => ({
          projectId: m.projectId,
          stage: stages.get(m.projectId) ?? 1,
          readiness: m.readiness,
        })),
        running: this.groups.isRunning(group.id),
        problems: validateGroup(group),
      };
    });
  }

  /**
   * Default keyboard shortcuts for the General tab (MS-017 / ADR-017), read from this
   * extension's own contributed keybindings + command titles — SSOT, no drift. Resolved for
   * the current platform. Empty if the extension can't be located (never throws).
   */
  private shortcuts(): ShortcutRow[] {
    const contributes = vscode.extensions.getExtension(EXTENSION_ID)?.packageJSON?.contributes as
      | { keybindings?: RawKeybinding[]; commands?: RawCommand[] }
      | undefined;
    return buildShortcutList(contributes?.keybindings ?? [], contributes?.commands ?? [], process.platform);
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
    this.toolchainCache.clear();
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
