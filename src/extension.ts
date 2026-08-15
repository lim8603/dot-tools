import * as vscode from 'vscode';

/**
 * Extension entry point.
 *
 * TASK-001 scaffold: this only wires a single "Hello World" command so the
 * F5 Extension Development Host can be verified end to end. The real
 * activation flow (AdapterRegistry scan, StatusBar, watcher) arrives in
 * M0/M1 per interface_contract.md and coding_convention.md.
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('DevSwitcher Tools is now active.');

  const helloWorld = vscode.commands.registerCommand('devSwitcher.helloWorld', () => {
    void vscode.window.showInformationMessage('Hello World from DevSwitcher Tools!');
  });

  context.subscriptions.push(helloWorld);
}

export function deactivate(): void {
  // No teardown needed for the scaffold.
}
