import { dirname } from 'node:path';
import * as vscode from 'vscode';
import type { ProjectInfo } from './types';

/**
 * Pre/post-build command execution (TASK-019, F21 / C-5 / 상세설계서 §7).
 *
 * These are arbitrary user commands, so — unlike the cargo invocation itself
 * (ProcessExecution, NFR-002) — they run through ShellExecution, the documented
 * NFR-002a exception. Each command becomes one Task the TaskRunner awaits, so a
 * failing pre-build command aborts the build with a real exit code.
 */
export type BuildEventPhase = 'pre' | 'post';

/** A ShellExecution task for one pre/post-build command, run in the project directory. */
export function createBuildEventTask(
  project: ProjectInfo,
  commandLine: string,
  phase: BuildEventPhase,
): vscode.Task {
  const task = new vscode.Task(
    { type: 'devswitcher-buildevent', phase },
    project.workspaceFolder,
    `${phase}-build`,
    'DevSwitcher',
    new vscode.ShellExecution(commandLine, { cwd: dirname(project.manifestPath) }),
  );
  task.presentationOptions = { reveal: vscode.TaskRevealKind.Always, clear: false, panel: vscode.TaskPanelKind.Shared };
  return task;
}
