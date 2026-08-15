import * as vscode from 'vscode';
import type { AdapterRegistry } from '../../core/adapterRegistry';
import type { StateStore } from '../../core/stateStore';
import { applyOption, setRunArgsLine } from '../../core/invocationConfig';
import type { ChipItem, ChipValue, InvocationConfig, LanguageAdapter, OptionSpec, OptionValue, ProjectInfo } from '../../core/types';
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
}

/** Messages the webview sends to the extension (상세설계서 §10.3). */
type InMessage =
  | { type: 'ready' }
  | { type: 'switchProject'; projectId: string }
  | { type: 'setChipValue'; chipId: string; value: ChipValue }
  | { type: 'setOption'; optionId: string; value: OptionValue }
  | { type: 'clearOption'; optionId: string }
  | { type: 'setRunArgs'; line: string };

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

    const activeId = this.store.activeProjectId;
    if (message.type === 'switchProject') {
      await this.store.setActiveProject(message.projectId);
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
      }
    }

    this.onChanged(); // keep the status bar in sync
    await this.postState();
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
      };
    }

    const profileValue = this.store.getValue(project.id, 'profile');
    const profile = typeof profileValue === 'string' ? profileValue : 'dev';

    const chips: ChipView[] = [];
    for (const chip of adapter.chips) {
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

/** CSP nonce — a per-load random token so only our inline script/style run. */
function makeNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
