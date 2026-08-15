import * as vscode from 'vscode';
import { ALL_ADAPTERS } from './adapters';
import { AdapterRegistry } from './core/adapterRegistry';
import { ManifestWatcher } from './core/manifestWatcher';
import { Orchestrator } from './core/orchestrator';
import { StateStore } from './core/stateStore';
import { StatusBarController } from './ui/statusBar';

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
  const orchestrator = new Orchestrator(registry, store, statusBar);

  context.subscriptions.push(
    statusBar,
    vscode.commands.registerCommand('devSwitcher.switchProject', () => orchestrator.switchProject()),
    vscode.commands.registerCommand('devSwitcher.pickChip', (chipId?: string) => orchestrator.pickChip(chipId)),
    vscode.commands.registerCommand('devSwitcher.build', () => orchestrator.informActionDeferred('Build')),
    vscode.commands.registerCommand('devSwitcher.run', () => orchestrator.informActionDeferred('Run')),
    vscode.commands.registerCommand('devSwitcher.debug', () => orchestrator.informActionDeferred('Debug')),
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
