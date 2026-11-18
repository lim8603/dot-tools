import { dirname } from 'node:path';
import * as vscode from 'vscode';
import type { TaskRunner } from './taskRunner';
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

/** Task type of a pre/post-build command (declared in package.json taskDefinitions). */
export const BUILD_EVENT_TASK_TYPE = 'devswitcher-buildevent';

/** A ShellExecution task for one pre/post-build command, run in the project directory. */
export function createBuildEventTask(
  project: ProjectInfo,
  commandLine: string,
  phase: BuildEventPhase,
): vscode.Task {
  const task = new vscode.Task(
    // projectId lets Stop find a long-running pre/post-build command (orchestrator.stop).
    { type: BUILD_EVENT_TASK_TYPE, phase, projectId: project.id },
    project.workspaceFolder,
    `${phase}-build`,
    'DevSwitcher',
    new vscode.ShellExecution(commandLine, { cwd: dirname(project.manifestPath) }),
  );
  task.presentationOptions = { reveal: vscode.TaskRevealKind.Always, clear: false, panel: vscode.TaskPanelKind.Shared };
  return task;
}

/** Outcome of a build-event phase: ok, or the command that failed and how. */
export type BuildEventsResult = { ok: true } | { ok: false; commandLine: string; exitCode: number | undefined };

/**
 * Run a phase's commands in order on the project's lock, stopping at the first failure.
 * Shared by every flow that builds or runs (Build, Run, Debug, run-group members) so the
 * policy is one place (R-5): pre-build before anything builds or runs; post-build after
 * the flow's build step succeeded (Run: after the program exits successfully).
 */
export async function runBuildEvents(
  taskRunner: TaskRunner,
  project: ProjectInfo,
  commands: string[] | undefined,
  phase: BuildEventPhase,
): Promise<BuildEventsResult> {
  for (const commandLine of commands ?? []) {
    const result = await taskRunner.run(createBuildEventTask(project, commandLine, phase), project.id);
    if (!result.succeeded) {
      return { ok: false, commandLine, exitCode: result.exitCode };
    }
  }
  return { ok: true };
}

/** The user-facing message for a failed build-event phase. */
export function describeBuildEventFailure(phase: BuildEventPhase, failure: { commandLine: string; exitCode: number | undefined }): string {
  return `${phase}-build command failed (exit ${failure.exitCode ?? 'unknown'}): ${failure.commandLine}`;
}
