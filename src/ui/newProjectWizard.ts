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
 * New-project start wizard (F20, 상세설계서 §14 / functional_spec F20): folder →
 * language → name. Pure UI orchestration — it collects choices and returns them; the
 * Orchestrator turns the result into a createProjectTask and runs it. Returns undefined
 * if the user cancels any step (or no workspace folder is open to create into).
 */
export async function runNewProjectWizard(adapters: CreatableAdapter[]): Promise<WizardResult | undefined> {
  // 1. Target folder — the new project must land inside a workspace folder so the scan
  //    picks it up. Single folder is used directly; multiple prompts a choice.
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    void vscode.window.showErrorMessage(
      'DevSwitcher: open a folder or workspace first — the new project is created inside it.',
    );
    return undefined;
  }
  let folderUri: vscode.Uri;
  if (folders.length === 1) {
    folderUri = folders[0].uri;
  } else {
    const picked = await vscode.window.showQuickPick(
      folders.map((f) => ({ label: f.name, description: f.uri.fsPath, uri: f.uri })),
      { placeHolder: 'Create the new project in which workspace folder?' },
    );
    if (!picked) {
      return undefined;
    }
    folderUri = picked.uri;
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
