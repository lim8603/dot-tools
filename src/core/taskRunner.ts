import * as vscode from 'vscode';
import { DevSwitcherError } from './errors';
import type { StartedTask, StartResult, TaskResult } from './types';

/**
 * TaskRunner — executes a vscode.Task and waits for its exit code (TASK-010, DD-02 /
 * 상세설계서 §7.1).
 *
 * The adapter builds the Task object; running, awaiting, and reading the exit code
 * belong here. A per-lock (project) guard rejects a second concurrent run so one
 * project can't launch overlapping builds (E9). Uses the process-end event, not the
 * task-end event, so the exit code is available.
 *
 * Two primitives share the lock: `run` awaits process exit (build/run/debug, one-shot);
 * `start` returns a handle that resolves on process spawn without awaiting exit, for a
 * run group's long-lived services (C-6 / MS-013 / ADR-015).
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
        const subs: vscode.Disposable[] = [];
        const finish = (result: TaskResult): void => {
          for (const sub of subs) {
            sub.dispose();
          }
          resolve(result);
        };
        // Normal path: the process exits and carries the exit code.
        subs.push(
          vscode.tasks.onDidEndTaskProcess((event) => {
            if (event.execution === execution) {
              finish({ exitCode: event.exitCode, succeeded: event.exitCode === 0 });
            }
          }),
        );
        // Fallback: the task ends without ever spawning a process (e.g. blocked by an
        // untrusted workspace, or cancelled). onDidEndTaskProcess would never fire, so
        // without this the run would hang forever — stuck spinner and a held lock.
        subs.push(
          vscode.tasks.onDidEndTask((event) => {
            if (event.execution === execution) {
              finish({ exitCode: undefined, succeeded: false });
            }
          }),
        );
      });
    } finally {
      this.running.delete(lockKey);
    }
  }

  /**
   * Start a long-lived task for a run group (C-6 / ADR-015). Unlike `run`, this does
   * not await exit: the returned handle's `ready` resolves when the process spawns (the
   * group's readiness signal), so a group can start the next member. The per-project
   * lock is held for the task's whole lifetime and released when the process exits or
   * `terminate()` is called. Throws when the lock is already held (E9).
   */
  async start(task: vscode.Task, lockKey: string): Promise<StartedTask> {
    if (this.running.has(lockKey)) {
      throw new DevSwitcherError('TASK_ALREADY_RUNNING', `A task is already running for ${lockKey}.`);
    }
    this.running.add(lockKey);

    let execution: vscode.TaskExecution;
    try {
      execution = await vscode.tasks.executeTask(task);
    } catch (error) {
      this.running.delete(lockKey); // never entered the running state — release the lock
      throw error;
    }

    const subs: vscode.Disposable[] = [];
    let settleReady!: (result: StartResult) => void;
    let readySettled = false;
    const ready = new Promise<StartResult>((resolve) => {
      settleReady = (result: StartResult): void => {
        if (!readySettled) {
          readySettled = true;
          resolve(result);
        }
      };
    });

    const done = new Promise<TaskResult>((resolve) => {
      const finish = (result: TaskResult, started: boolean): void => {
        settleReady({ started }); // no-op if readiness already resolved
        for (const sub of subs) {
          sub.dispose();
        }
        this.running.delete(lockKey);
        resolve(result);
      };
      subs.push(
        // Readiness (ADR-015): the process spawned — the group may start dependents.
        vscode.tasks.onDidStartTaskProcess((event) => {
          if (event.execution === execution) {
            settleReady({ started: true });
          }
        }),
        // The service exited (or was terminated) — release the lock, carry the exit code.
        vscode.tasks.onDidEndTaskProcess((event) => {
          if (event.execution === execution) {
            finish({ exitCode: event.exitCode, succeeded: event.exitCode === 0 }, true);
          }
        }),
        // The task ended without ever spawning a process (untrusted workspace / cancelled):
        // it never became ready, so resolve readiness as not-started.
        vscode.tasks.onDidEndTask((event) => {
          if (event.execution === execution) {
            finish({ exitCode: undefined, succeeded: false }, false);
          }
        }),
      );
    });

    return {
      lockKey,
      ready,
      done,
      terminate: () => execution.terminate(),
    };
  }
}
