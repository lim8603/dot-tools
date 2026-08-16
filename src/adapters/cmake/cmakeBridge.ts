import { execFile } from 'node:child_process';
import { basename, dirname } from 'node:path';
import { DevSwitcherError } from '../../core/errors';

/**
 * CMakeBridge — the `cmake` CLI boundary layer for the C++ adapter (MS-012, C-7, ADR-014).
 *
 * Mirrors the other bridges (CargoBridge / DotnetBridge / PythonBridge, interface_contract
 * §6): pure parsing/formatting helpers plus a process-I/O class. Stays `vscode`-free (plain
 * paths, DevSwitcherError from `core/errors`) and exec-injected (CMakeExec) so it unit-tests
 * in plain Node without a real cmake — which matters here because cmake may not be installed
 * (that absence is itself the Doctor's critical-missing test, F19/E1).
 *
 * ADR-014: we drive `cmake` ourselves (no CMake Tools delegation). This first slice is the
 * toolchain probe used by Doctor; configure/build (`cmake -S -B -D…` / `cmake --build`) and
 * project/target discovery via the CMake File API (codemodel-v2) land in TASK-033/034.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers — unit-testable without a real cmake
// ─────────────────────────────────────────────────────────────────────────────

/** Project display name fallback: the folder that holds CMakeLists.txt (project() name
 *  parsing / File API name lands in listProjects, TASK-033). */
export function cmakeProjectName(cmakeListsPath: string): string {
  const normalized = cmakeListsPath.replace(/\\/g, '/');
  return basename(dirname(normalized)) || normalized;
}

/**
 * Parse the version from `cmake --version` output — the first line is
 * `cmake version 3.28.1`. Returns the bare version (`3.28.1`) or undefined when the
 * output does not match (so the caller treats it as absent).
 */
export function parseCMakeVersion(stdout: string): string | undefined {
  const match = /cmake version\s+(\S+)/i.exec(stdout);
  return match ? match[1] : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// cmake CLI I/O boundary — exec-injected, vscode-free (mirrors the other bridges)
// ─────────────────────────────────────────────────────────────────────────────

/** File API replies (codemodel JSON) can be large on big trees; lift the buffer cap. */
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

/** Captured result of one CLI invocation. */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** Injectable process-exec primitive (rejects only on spawn failure). */
export type CMakeExec = (
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string> },
) => Promise<ExecResult>;

/** Default CMakeExec: `child_process.execFile` with no shell (NFR-002, array args). */
export const defaultExec: CMakeExec = (command, args, options) =>
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
          reject(new DevSwitcherError('CMAKE_EXEC_FAILED', `Failed to run "${command}".`, error));
          return;
        }
        resolve({ stdout, stderr, exitCode: typeof code === 'number' ? code : 0 });
      },
    );
  });

/** Capture one cmake invocation; the caller interprets the exit code. */
export function execCapture(
  command: string,
  args: string[],
  cwd: string | undefined,
  exec: CMakeExec = defaultExec,
  env?: Record<string, string>,
): Promise<ExecResult> {
  return exec(command, args, { cwd, env });
}

/** Result of checkToolchain — version when present; ok when cmake is available (E1). */
export interface CMakeToolchainStatus {
  cmake?: string;
  ok: boolean;
}

/**
 * Stateful cmake boundary: probes the cmake version with a small cache. The adapter holds
 * one instance. configure/build + File API discovery (with their own caches) are added in
 * TASK-033/034; this slice exists so Doctor can report cmake presence (F19).
 */
export class CMakeBridge {
  private readonly exec: CMakeExec;
  private cmakeVersion: string | null | undefined; // undefined = unprobed, null = absent

  constructor(exec: CMakeExec = defaultExec) {
    this.exec = exec;
  }

  /**
   * Whether `cmake` is on PATH (E1). Never throws — a missing binary yields ok:false.
   * Cached until invalidateCache (a freshly installed cmake clears via Rescan/Doctor).
   */
  async checkToolchain(): Promise<CMakeToolchainStatus> {
    if (this.cmakeVersion === undefined) {
      this.cmakeVersion = (await this.probeVersion()) ?? null;
    }
    const cmake = this.cmakeVersion ?? undefined;
    return { cmake, ok: cmake !== undefined };
  }

  /** Drop the cached probe (F17 invalidation / explicit refresh). */
  invalidateCache(): void {
    this.cmakeVersion = undefined;
  }

  /** `cmake --version` → bare version string, or undefined when absent. */
  private async probeVersion(): Promise<string | undefined> {
    try {
      const result = await execCapture('cmake', ['--version'], undefined, this.exec);
      if (result.exitCode !== 0) {
        return undefined;
      }
      return parseCMakeVersion(result.stdout);
    } catch {
      return undefined; // spawn failure = not installed
    }
  }
}
