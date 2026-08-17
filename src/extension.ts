import * as vscode from 'vscode';
import { ALL_ADAPTERS } from './adapters';
import { AdapterRegistry } from './core/adapterRegistry';
import { ManifestWatcher } from './core/manifestWatcher';
import { Orchestrator } from './core/orchestrator';
import { GroupOrchestrator } from './core/groupOrchestrator';
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
  const groupOrchestrator = new GroupOrchestrator(registry, store, taskRunner);
  // Drive the status-bar run-group launcher from the current group count + running count.
  const syncGroups = (): void => statusBar.setGroups(store.getGroups().length, groupOrchestrator.runningGroupIds().length);
  const settingsPanel = new SettingsPanel(registry, store, groupOrchestrator, () => {
    void orchestrator.renderActive();
    syncGroups();
  });
  // Keep an open settings page live when state changes from the status bar / watcher.
  orchestrator.setViewSync(() => settingsPanel.refresh());
  // A group starting/stopping updates both the launcher and the (possibly open) settings page.
  groupOrchestrator.setOnChange(() => {
    syncGroups();
    settingsPanel.refresh();
  });

  context.subscriptions.push(
    statusBar,
    settingsPanel,
    vscode.commands.registerCommand('devSwitcher.switchProject', () => orchestrator.switchProject()),
    vscode.commands.registerCommand('devSwitcher.pickChip', (chipId?: string) => orchestrator.pickChip(chipId)),
    vscode.commands.registerCommand('devSwitcher.build', () => orchestrator.build()),
    vscode.commands.registerCommand('devSwitcher.run', () => orchestrator.run()),
    vscode.commands.registerCommand('devSwitcher.stop', () => orchestrator.stop()),
    vscode.commands.registerCommand('devSwitcher.debug', () => orchestrator.debug()),
    vscode.commands.registerCommand('devSwitcher.openSettings', () => settingsPanel.open()),
    vscode.commands.registerCommand('devSwitcher.exportProfile', () => orchestrator.exportProfile()),
    vscode.commands.registerCommand('devSwitcher.importProfile', () => orchestrator.importProfile()),
    vscode.commands.registerCommand('devSwitcher.doctor', () => orchestrator.doctor()),
    vscode.commands.registerCommand('devSwitcher.rescan', () => orchestrator.rescan()),
    vscode.commands.registerCommand('devSwitcher.newProject', () => orchestrator.newProject()),
    vscode.commands.registerCommand('devSwitcher.groups', () => groupOrchestrator.promptGroups()),
    vscode.commands.registerCommand('devSwitcher.runGroup', () => groupOrchestrator.promptRunGroup()),
    vscode.commands.registerCommand('devSwitcher.stopGroup', () => groupOrchestrator.promptStopGroup()),
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
    // Debug sessions aren't tasks, so toggle the Stop button as they start/end.
    vscode.debug.onDidStartDebugSession(() => orchestrator.refreshStopButton()),
    vscode.debug.onDidTerminateDebugSession(() => orchestrator.refreshStopButton()),
  );

  const globs = [...new Set(ALL_ADAPTERS.flatMap((adapter) => adapter.manifestGlobs))];
  const watcher = new ManifestWatcher(globs, () => void orchestrator.refresh());
  watcher.start();
  context.subscriptions.push({ dispose: () => watcher.dispose() });

  syncGroups(); // show the run-group launcher when groups are already defined
  void orchestrator.initialize();
}

export function deactivate(): void {
  // Disposables are released via context.subscriptions.
}
