import * as vscode from 'vscode';

/**
 * Ensure a required extension is present, prompting to install it on first use
 * (TASK-011, 상세설계서 §13.3 / DD-09, F19 1단계).
 *
 * We deliberately avoid `extensionDependencies` so a missing optional tool never
 * blocks activation; instead each requiredExtension is handled at the moment it is
 * needed. Returns true when the extension is available (already, or after install),
 * false when the user declines or the install has not taken effect yet. In remote
 * workspaces the install lands on the remote side automatically (§12).
 */
export async function ensureExtension(extensionId: string, reason: string): Promise<boolean> {
  if (vscode.extensions.getExtension(extensionId) !== undefined) {
    return true;
  }

  const install = 'Install';
  const choice = await vscode.window.showInformationMessage(reason, install, 'Cancel');
  if (choice !== install) {
    return false;
  }

  await vscode.commands.executeCommand('workbench.extensions.installExtension', extensionId);
  if (vscode.extensions.getExtension(extensionId) !== undefined) {
    return true;
  }

  // Installed but not yet loaded into this session — ask the user to retry.
  void vscode.window.showInformationMessage(`${extensionId} installed. Please run the action again.`);
  return false;
}
