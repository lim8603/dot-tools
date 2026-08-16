import { execFile } from 'node:child_process';
import { basename, dirname } from 'node:path';
import { DevSwitcherError } from '../../core/errors';

/**
 * PythonBridge — the `python` boundary layer for the Python adapter (MS-011, C-7).
 *
 * Python is the framework litmus (interface_contract §6/§8): interpreted, so there is
 * no build step and no compiled artifact. The bridge therefore has no build-metadata
 * cache — it only probes interpreter versions (with a small cache) and provides pure
 * helpers for discovering environments and naming projects. Stays `vscode`-free and
 * exec-injected (PythonExec) so it unit-tests in plain Node without a real interpreter.
 *
 * v1 scope (MS-011): environments = project-local venvs + system interpreters
 * (self-contained, no Python-extension dependency); the run target is a `.py` file at
 * the project root (default main.py).
 */

/** Standard virtualenv folder names checked at a project root. */
export const VENV_DIRS = ['.venv', 'venv', 'env'];

/** System interpreter commands probed on PATH, in preference order. */
export const SYSTEM_INTERPRETERS = ['python', 'python3', 'py'];

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers — unit-testable without a real interpreter
// ─────────────────────────────────────────────────────────────────────────────

/** Project display name: the folder that holds pyproject.toml (F20 scaffolds `<name>/`). */
export function pythonProjectName(pyprojectPath: string): string {
  const normalized = pyprojectPath.replace(/\\/g, '/');
  return basename(dirname(normalized)) || normalized;
}

/**
 * The interpreter path inside a venv directory — platform-specific layout:
 * Windows `<venv>\Scripts\python.exe`, POSIX `<venv>/bin/python`.
 */
export function venvInterpreter(venvDir: string, platform: NodeJS.Platform): string {
  return platform === 'win32' ? `${venvDir}\\Scripts\\python.exe` : `${venvDir}/bin/python`;
}

/** `python <script> [args...]` — the interpreter args to run a script (used by TASK-031). */
export function assemblePythonArgs(scriptRelPath: string, runArgs: string[] = []): string[] {
  return [scriptRelPath, ...runArgs];
}

// ─────────────────────────────────────────────────────────────────────────────
// python CLI I/O boundary — exec-injected, vscode-free
// ─────────────────────────────────────────────────────────────────────────────

const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

/** Captured result of one CLI invocation. */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Injectable process-exec primitive (rejects only on spawn failure). */
export type PythonExec = (
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string> },
) => Promise<ExecResult>;

/** Default PythonExec: `child_process.execFile` with no shell (NFR-002, array args). */
export const defaultExec: PythonExec = (command, args, options) =>
  new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        env: options.env ? { ...process.env, ...options.env } : undefined,
        encoding: 'utf8',
        maxBuffer: MAX_OUTPUT_BYTES,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        const code: unknown = error ? (error as { code?: unknown }).code : 0;
        if (error && typeof code !== 'number') {
          reject(new DevSwitcherError('PYTHON_EXEC_FAILED', `Failed to run "${command}".`, error));
          return;
        }
        resolve({ stdout, stderr, exitCode: typeof code === 'number' ? code : 0 });
      },
    );
  });

/** Capture one python invocation; the caller interprets the exit code. */
export function execCapture(
  command: string,
  args: string[],
  cwd: string | undefined,
  exec: PythonExec = defaultExec,
  env?: Record<string, string>,
): Promise<ExecResult> {
  return exec(command, args, { cwd, env });
}

/** Result of checkToolchain — version + the command that answered; ok when found (E1). */
export interface PythonToolchainStatus {
  python?: string;
  command?: string;
  ok: boolean;
}

/**
 * Stateful python boundary: probes interpreter versions with a small cache (there is
 * no build metadata to cache). The adapter holds one instance.
 */
export class PythonBridge {
  private readonly exec: PythonExec;
  /** interpreter path/command -> version string, or null when it did not answer. */
  private readonly versionCache = new Map<string, string | null>();

  constructor(exec: PythonExec = defaultExec) {
    this.exec = exec;
  }

  /** `<interpreter> --version` → version string (cached), or undefined when absent. */
  async detectVersion(interpreter: string): Promise<string | undefined> {
    const cached = this.versionCache.get(interpreter);
    if (cached !== undefined) {
      return cached ?? undefined;
    }
    const version = await this.probe(interpreter);
    this.versionCache.set(interpreter, version ?? null);
    return version;
  }

  /** First working system interpreter (python → python3 → py), or ok:false when none. */
  async checkToolchain(): Promise<PythonToolchainStatus> {
    for (const command of SYSTEM_INTERPRETERS) {
      const python = await this.detectVersion(command);
      if (python) {
        return { python, command, ok: true };
      }
    }
    return { ok: false };
  }

  /** Drop cached interpreter versions (F17 invalidation / explicit refresh). */
  invalidateCache(): void {
    this.versionCache.clear();
  }

  private async probe(interpreter: string): Promise<string | undefined> {
    try {
      const result = await execCapture(interpreter, ['--version'], undefined, this.exec);
      if (result.exitCode !== 0) {
        return undefined;
      }
      // Python 3 prints to stdout; tolerate stderr for older builds.
      return result.stdout.trim() || result.stderr.trim() || undefined;
    } catch {
      return undefined; // spawn failure = not installed
    }
  }
}
