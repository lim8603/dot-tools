import * as vscode from 'vscode';
import type { AdapterRegistry } from '../../core/adapterRegistry';
import type { StateStore } from '../../core/stateStore';
import type { ChipItem, ChipValue, InvocationConfig, OptionSpec } from '../../core/types';
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
}

/** Messages the webview sends to the extension (상세설계서 §10.3). */
type InMessage =
  | { type: 'ready' }
  | { type: 'switchProject'; projectId: string }
  | { type: 'setChipValue'; chipId: string; value: ChipValue }
  | { type: 'setInvocation'; profile: string; config: InvocationConfig };

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

  dispose(): void {
    this.disposePanel();
    this.panel?.dispose();
  }

  private async onMessage(message: InMessage): Promise<void> {
    const activeId = this.store.activeProjectId;
    switch (message.type) {
      case 'ready':
        await this.postState();
        return;
      case 'switchProject':
        await this.store.setActiveProject(message.projectId);
        break;
      case 'setChipValue':
        if (!activeId) {
          return;
        }
        await this.store.setValue(activeId, message.chipId, message.value);
        break;
      case 'setInvocation':
        if (!activeId) {
          return;
        }
        await this.store.setInvocation(activeId, message.profile, message.config);
        break;
    }
    this.onChanged(); // keep the status bar in sync
    await this.postState();
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
      return { projects, profile: 'dev', actionsBuild: false, chips: [], configCategories: [], optionCatalog: [], invocation: {} };
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

    return {
      projects,
      activeProjectId: project.id,
      displayName: adapter.displayName,
      profile,
      actionsBuild: adapter.actions.build,
      chips,
      configCategories: adapter.configCategories,
      optionCatalog: adapter.optionCatalog,
      invocation: this.store.getInvocation(project.id, profile),
    };
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
