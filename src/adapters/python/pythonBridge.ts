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

/**
 * The interpreter command to launch (TASK-031). The environment chip value IS the
 * interpreter — a venv's absolute python path or a system command (python/python3/py).
 * The chip is optional, so an unset (or non-string) selection falls back to `python`,
 * which the OS resolves on PATH. createRunTask is synchronous and cannot await
 * checkToolchain, so this stays a pure, allocation-free choice.
 */
export function resolveInterpreter(environmentValue: string | string[] | undefined): string {
  return typeof environmentValue === 'string' && environmentValue.length > 0 ? environmentValue : 'python';
}

// ─────────────────────────────────────────────────────────────────────────────
// Debug configuration — debugpy launch config (ms-python.python / ms-python.debugpy)
// ─────────────────────────────────────────────────────────────────────────────

/** A `debugpy` launch config (ms-python.debugpy, bundled with the Python extension). */
export interface DebugpyLaunchConfig {
  type: 'debugpy';
  request: 'launch';
  name: string;
  program: string; // the target .py script (resolveExecutable)
  python: string; // the interpreter to debug under (same as the run task, §7.4)
  args: string[];
  cwd: string;
  console: 'integratedTerminal'; // debugpy needs a real terminal for program stdin
  justMyCode: boolean;
  env?: Record<string, string>;
}

/**
 * Assemble a `debugpy` launch config for a resolved script + interpreter (TASK-032).
 * Pure so it is unit-testable; the adapter supplies the script (`program`), interpreter
 * (`python`, kept identical to the run task so a picked venv debugs where it runs), cwd
 * and env. Mirrors buildLldbConfig (cargo) / buildCoreclrConfig (dotnet). `env` is omitted
 * when empty so the config stays minimal.
 */
export function buildDebugpyConfig(
  projectName: string | undefined,
  program: string,
  python: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>,
): DebugpyLaunchConfig {
  const config: DebugpyLaunchConfig = {
    type: 'debugpy',
    request: 'launch',
    name: projectName ? `Debug ${projectName}` : 'Debug',
    program,
    python,
    args,
    cwd,
    console: 'integratedTerminal',
    justMyCode: true,
  };
  if (env && Object.keys(env).length > 0) {
    config.env = env;
  }
  return config;
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

/** What one interpreter probe learns: its version label and its own real path. */
export interface InterpreterInfo {
  version: string; // display label, e.g. 'Python 3.12.13'
  executable: string; // sys.executable — the real interpreter path, used to dedup aliases
}

/** One `-c` probe that prints the version then sys.executable, each on its own line. */
const PROBE_SCRIPT = 'import sys;print(sys.version.split()[0]);print(sys.executable)';

/**
 * A dedup key for an interpreter's real path. Windows paths are case-insensitive, so
 * lower-case them; slashes are normalized so `python`/`python3` aliases that resolve to
 * the same sys.executable collapse to one key. Pure — unit-testable.
 */
export function interpreterKey(executable: string, platform: NodeJS.Platform): string {
  const normalized = executable.replace(/\\/g, '/');
  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

/**
 * Stateful python boundary: probes interpreters with a small cache (there is no build
 * metadata to cache). Each probe learns the version and the real sys.executable, so the
 * adapter can dedup PATH aliases (python vs python3 vs py) that point at one interpreter.
 * The adapter holds one instance.
 */
export class PythonBridge {
  private readonly exec: PythonExec;
  /** interpreter path/command -> probe info, or null when it did not answer. */
  private readonly infoCache = new Map<string, InterpreterInfo | null>();

  constructor(exec: PythonExec = defaultExec) {
    this.exec = exec;
  }

  /** Probe an interpreter for its version + real path (cached), or undefined when absent. */
  async detectInterpreter(interpreter: string): Promise<InterpreterInfo | undefined> {
    const cached = this.infoCache.get(interpreter);
    if (cached !== undefined) {
      return cached ?? undefined;
    }
    const info = await this.probe(interpreter);
    this.infoCache.set(interpreter, info ?? null);
    return info;
  }

  /** `<interpreter>` version string (cached), or undefined when absent. */
  async detectVersion(interpreter: string): Promise<string | undefined> {
    return (await this.detectInterpreter(interpreter))?.version;
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

  /** Drop cached interpreter probes (F17 invalidation / explicit refresh). */
  invalidateCache(): void {
    this.infoCache.clear();
  }

  private async probe(interpreter: string): Promise<InterpreterInfo | undefined> {
    try {
      const result = await execCapture(interpreter, ['-c', PROBE_SCRIPT], undefined, this.exec);
      if (result.exitCode !== 0) {
        return undefined;
      }
      const [version, executable] = result.stdout.trim().split(/\r?\n/);
      if (!version) {
        return undefined;
      }
      return { version: `Python ${version.trim()}`, executable: executable?.trim() || interpreter };
    } catch {
      return undefined; // spawn failure = not installed
    }
  }
}
