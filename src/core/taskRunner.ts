import * as vscode from 'vscode';
import { DevSwitcherError } from './errors';
import type { TaskResult } from './types';

/**
 * TaskRunner — executes a vscode.Task and waits for its exit code (TASK-010, DD-02 /
 * 상세설계서 §7.1).
 *
 * The adapter builds the Task object; running, awaiting, and reading the exit code
 * belong here. A per-lock (project) guard rejects a second concurrent run so one
 * project can't launch overlapping builds (E9). Uses the process-end event, not the
 * task-end event, so the exit code is available.
 */
export class TaskRunner {
  private readonly running = new Set<string>();

  /** Whether a run is in flight for this lock key (a project id). */
  isRunning(lockKey: string): boolean {
    return this.running.has(lockKey);
  }

  async run(task: vscode.Task, lockKey: string): Promise<TaskResult> {
    if (this.running.has(lockKey)) {
      throw new DevSwitcherError('TASK_ALREADY_RUNNING', `A task is already running for ${lockKey}.`);
    }
    this.running.add(lockKey);
    try {
      const execution = await vscode.tasks.executeTask(task);
      return await new Promise<TaskResult>((resolve) => {
        const disposable = vscode.tasks.onDidEndTaskProcess((event) => {
          if (event.execution === execution) {
            disposable.dispose();
            resolve({ exitCode: event.exitCode, succeeded: event.exitCode === 0 });
          }
        });
      });
    } finally {
      this.running.delete(lockKey);
    }
  }
}
