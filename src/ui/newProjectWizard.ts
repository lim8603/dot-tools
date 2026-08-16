import * as vscode from 'vscode';
import type { NewProjectTarget } from '../core/types';
import { validateProjectName } from '../core/projectName';

/** A language choice offered by the wizard — one per adapter with canCreateProject. */
export interface CreatableAdapter {
  id: string;
  displayName: string;
}

/** What the wizard resolved to: which adapter creates the project, and where/what. */
export interface WizardResult {
  adapterId: string;
  target: NewProjectTarget;
}

/**
 * New-project start wizard (F20, 상세설계서 §14 / functional_spec F20): parent folder →
 * language → name. Pure UI orchestration — it collects choices and returns them; the
 * Orchestrator turns the result into a createProject and runs it. Returns undefined if
 * the user cancels any step (or no workspace folder is open to create into).
 */
export async function runNewProjectWizard(adapters: CreatableAdapter[]): Promise<WizardResult | undefined> {
  // 1. Parent folder — a native folder picker so the project can land in any sub-folder
  //    (e.g. services/, apps/), not only the workspace root. Defaults to the first
  //    workspace folder; the user may browse into any existing sub-folder. The pick must
  //    stay inside an open workspace folder so the scan (F1) still detects the new project.
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    void vscode.window.showErrorMessage(
      'DevSwitcher: open a folder or workspace first — the new project is created inside it.',
    );
    return undefined;
  }
  const picked = await vscode.window.showOpenDialog({
    defaultUri: folders[0].uri,
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: 'Create project here',
    title: 'Select the parent folder for the new project',
  });
  if (!picked || picked.length === 0) {
    return undefined;
  }
  const folderUri = picked[0];
  if (!vscode.workspace.getWorkspaceFolder(folderUri)) {
    void vscode.window.showErrorMessage(
      'DevSwitcher: pick a folder inside the open workspace — the new project must be scannable.',
    );
    return undefined;
  }

  // 2. Language / adapter.
  const language = await vscode.window.showQuickPick(
    adapters.map((a) => ({ label: a.displayName, adapterId: a.id })),
    { placeHolder: 'Select the project language' },
  );
  if (!language) {
    return undefined;
  }

  // 3. Project name (also the created sub-folder name).
  const projectName = await vscode.window.showInputBox({
    prompt: 'New project name',
    placeHolder: 'my-project',
    validateInput: (value) => validateProjectName(value),
  });
  if (projectName === undefined) {
    return undefined;
  }

  return { adapterId: language.adapterId, target: { folderUri, projectName: projectName.trim() } };
}
