import * as vscode from 'vscode';
import { ALL_ADAPTERS } from './adapters';
import { AdapterRegistry } from './core/adapterRegistry';
import { ManifestWatcher } from './core/manifestWatcher';
import { Orchestrator } from './core/orchestrator';
import { StateStore } from './core/stateStore';
import { TaskRunner } from './core/taskRunner';
import { StatusBarController } from './ui/statusBar';
import { SettingsPanel } from './ui/settingsPanel/settingsPanel';

/**
 * Extension entry point — wiring only (coding_convention: activate/deactivate 배선만).
 *
 * MS-004 (상세설계서 §3.3): build the components, register the commands 1:1 with
 * package.json contributes, start the manifest watcher, then kick off the first
 * scan/render. Action-button commands (build/run/debug) render now but execute in
 * MS-005 (TaskRunner).
 */
export function activate(context: vscode.ExtensionContext): void {
  const registry = new AdapterRegistry();
  const store = new StateStore(context.workspaceState);
  const statusBar = new StatusBarController();
  const taskRunner = new TaskRunner();
  const orchestrator = new Orchestrator(registry, store, statusBar, taskRunner);
  const settingsPanel = new SettingsPanel(registry, store, () => void orchestrator.renderActive());
  // Keep an open settings page live when state changes from the status bar / watcher.
  orchestrator.setViewSync(() => settingsPanel.refresh());

  context.subscriptions.push(
    statusBar,
    settingsPanel,
    vscode.commands.registerCommand('devSwitcher.switchProject', () => orchestrator.switchProject()),
    vscode.commands.registerCommand('devSwitcher.pickChip', (chipId?: string) => orchestrator.pickChip(chipId)),
    vscode.commands.registerCommand('devSwitcher.build', () => orchestrator.build()),
    vscode.commands.registerCommand('devSwitcher.run', () => orchestrator.run()),
    vscode.commands.registerCommand('devSwitcher.debug', () => orchestrator.debug()),
    vscode.commands.registerCommand('devSwitcher.openSettings', () => settingsPanel.open()),
    vscode.commands.registerCommand('devSwitcher.exportProfile', () => orchestrator.exportProfile()),
    vscode.commands.registerCommand('devSwitcher.importProfile', () => orchestrator.importProfile()),
    vscode.commands.registerCommand('devSwitcher.doctor', () => orchestrator.doctor()),
    vscode.commands.registerCommand('devSwitcher.rescan', () => orchestrator.rescan()),
    vscode.commands.registerCommand('devSwitcher.newProject', () => orchestrator.newProject()),
    vscode.commands.registerCommand('devSwitcher.toggleCompact', async () => {
      const config = vscode.workspace.getConfiguration('devSwitcher');
      await config.update('statusBar.compact', !config.get<boolean>('statusBar.compact', false), vscode.ConfigurationTarget.Global);
    }),
    // Re-render when a status-bar display setting changes (toggle command or Settings UI).
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('devSwitcher.statusBar')) {
        void orchestrator.renderActive();
      }
    }),
  );

  const globs = [...new Set(ALL_ADAPTERS.flatMap((adapter) => adapter.manifestGlobs))];
  const watcher = new ManifestWatcher(globs, () => void orchestrator.refresh());
  watcher.start();
  context.subscriptions.push({ dispose: () => watcher.dispose() });

  void orchestrator.initialize();
}

export function deactivate(): void {
  // Disposables are released via context.subscriptions.
}
