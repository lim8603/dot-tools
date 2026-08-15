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
  const choice = await vscode.window.showInformationMessage(reason, install);
  if (choice !== install) {
    return false; // dismissed/cancelled
  }

  try {
    await vscode.commands.executeCommand('workbench.extensions.installExtension', extensionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`DevSwitcher: failed to install ${extensionId} — ${message}`);
    return false;
  }

  if (vscode.extensions.getExtension(extensionId) !== undefined) {
    return true;
  }

  // Installed but not visible to this session yet — a window reload activates it.
  // Offer the reload explicitly so the user isn't left re-triggering into the same
  // prompt (which never resolves without a reload).
  const reload = 'Reload Window';
  const answer = await vscode.window.showInformationMessage(
    `${extensionId} was installed but needs a window reload to activate. Reload now, then run the action again.`,
    reload,
  );
  if (answer === reload) {
    void vscode.commands.executeCommand('workbench.action.reloadWindow');
  }
  return false;
}
