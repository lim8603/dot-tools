import { execFile } from 'node:child_process';
import { DevSwitcherError } from '../../core/errors';

/**
 * GoBridge — the `go` CLI boundary layer for the Go adapter (MS-015, v0.5.0).
 *
 * Mirrors DotnetBridge/CargoBridge (interface_contract §6): pure parsing helpers plus a
 * process-I/O class with a cached read. Stays `vscode`-free — methods take a plain module
 * directory (not ProjectInfo) and DevSwitcherError comes from `core/errors` — so the whole
 * file unit-tests in plain Node without a real Go toolchain. The child_process call is
 * injected (GoExec) for hermetic tests.
 *
 * A module's "metadata" is its set of `main` packages (the build/run/debug targets), read
 * with `go list`. Go has no native Debug/Release profile, so the only chip is `target`
 * (D-21 / Human: target-only). Build-flag options (-ldflags/-race/-tags) live in the
 * settings-page option catalog (TASK-044), not as chips.
 */

/** A `main` package in a module — its import path (build/run arg) and dir (debug program). */
export interface GoMainPackage {
  importPath: string;
  dir: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (parsing) — unit-testable without a real Go toolchain
// ─────────────────────────────────────────────────────────────────────────────

/** The `module` path declared in a go.mod, or undefined when absent. Strips // comments. */
export function parseModulePath(gomod: string): string | undefined {
  for (const raw of gomod.split(/\r?\n/)) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    const m = /^module\s+(\S+)/.exec(line);
    if (m) {
      return m[1];
    }
  }
  return undefined;
}

/** Display name: last segment of the module path, else the folder that holds go.mod. */
export function goProjectName(modulePath: string | undefined, manifestPath: string): string {
  const mod = (modulePath ?? '').trim().replace(/\/+$/, '');
  if (mod) {
    const seg = mod.split('/').pop();
    if (seg) {
      return seg;
    }
  }
  const parts = manifestPath.replace(/\\/g, '/').split('/').filter((s) => s.length > 0);
  return parts[parts.length - 2] ?? manifestPath; // the directory containing go.mod
}

/**
 * Parse `go list -f '{{if eq .Name "main"}}{{.ImportPath}}|{{.Dir}}{{end}}' ./...`.
 * Each main package prints `importPath|dir`; non-main packages print a blank line. The
 * `|` separator survives Windows paths (which may contain spaces but not `|`).
 */
export function parseMainPackages(stdout: string): GoMainPackage[] {
  const out: GoMainPackage[] = [];
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const sep = line.indexOf('|');
    if (sep < 0) {
      continue;
    }
    const importPath = line.slice(0, sep).trim();
    const dir = line.slice(sep + 1).trim();
    if (importPath && dir) {
      out.push({ importPath, dir });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// go CLI I/O boundary — the only part that touches the process boundary.
// vscode-free and exec-injected (GoExec) so tests run hermetically. Mirrors
// DotnetBridge's I/O half (TASK-005/027).
// ─────────────────────────────────────────────────────────────────────────────

/** `go list` output can be large on big modules; lift the buffer cap. */
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

/** The `go list` format that prints `importPath|dir` for main packages only. */
export const GO_LIST_MAIN_FORMAT = '{{if eq .Name "main"}}{{.ImportPath}}|{{.Dir}}{{end}}';

/** Captured result of one CLI invocation. */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number; // 0 on success
}

/**
 * Injectable process-exec primitive. Resolves with the captured result for any normal
 * exit (including non-zero) and rejects only when the process cannot be spawned at all
 * (missing binary → ENOENT, signal, buffer overflow).
 */
export type GoExec = (
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string> },
) => Promise<ExecResult>;

/** Default GoExec: `child_process.execFile` with no shell (NFR-002, array args). */
export const defaultExec: GoExec = (command, args, options) =>
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
          reject(new DevSwitcherError('GO_EXEC_FAILED', `Failed to run "${command}".`, error));
          return;
        }
        resolve({ stdout, stderr, exitCode: typeof code === 'number' ? code : 0 });
      },
    );
  });

/** Capture the output of a single go invocation; the caller interprets the exit code. */
export function execCapture(
  command: string,
  args: string[],
  cwd: string | undefined,
  exec: GoExec = defaultExec,
  env?: Record<string, string>,
): Promise<ExecResult> {
  return exec(command, args, { cwd, env });
}

/** Result of checkToolchain — version string when present; ok when `go` exists (E1). */
export interface GoToolchainStatus {
  go?: string;
  ok: boolean;
}

/**
 * Stateful go boundary: owns the main-package cache and the injected exec primitive.
 * The adapter holds one instance and translates ProjectInfo into the module directory
 * these methods take. The cache is invalidated only by ManifestWatcher (F17) / explicit
 * refresh, like the other bridges.
 */
export class GoBridge {
  private readonly exec: GoExec;
  private readonly mainPkgCache = new Map<string, GoMainPackage[]>(); // moduleDir -> main packages

  constructor(exec: GoExec = defaultExec) {
    this.exec = exec;
  }

  /**
   * The module's `main` packages (build/run/debug targets), cached per module directory.
   * Runs `go list` for main packages; a non-zero exit (build errors, missing go) degrades
   * to an empty list — the target chip then shows nothing and Doctor flags the toolchain,
   * rather than throwing. The failure result is not cached, so a later good run repopulates.
   */
  async listMainPackages(moduleDir: string): Promise<GoMainPackage[]> {
    const cached = this.mainPkgCache.get(moduleDir);
    if (cached) {
      return cached;
    }
    const result = await execCapture('go', ['list', '-f', GO_LIST_MAIN_FORMAT, './...'], moduleDir, this.exec);
    if (result.exitCode !== 0) {
      return []; // degrade gracefully; do not cache the failure
    }
    const pkgs = parseMainPackages(result.stdout);
    this.mainPkgCache.set(moduleDir, pkgs);
    return pkgs;
  }

  /** Cached main packages without fetching — undefined on a miss (for synchronous callers). */
  peekMainPackages(moduleDir: string): GoMainPackage[] | undefined {
    return this.mainPkgCache.get(moduleDir);
  }

  /**
   * Whether the Go toolchain is available (E1). Never throws — a missing binary yields
   * `undefined`; `ok` reflects `go`, which is required.
   */
  async checkToolchain(): Promise<GoToolchainStatus> {
    const go = await this.probeVersion();
    return { go, ok: go !== undefined };
  }

  /** Drop cached packages for one module dir, or all when omitted (F17 invalidation). */
  invalidateCache(moduleDir?: string): void {
    if (moduleDir === undefined) {
      this.mainPkgCache.clear();
    } else {
      this.mainPkgCache.delete(moduleDir);
    }
  }

  /** `go version` → trimmed version string, or undefined when absent. */
  private async probeVersion(): Promise<string | undefined> {
    try {
      const result = await execCapture('go', ['version'], undefined, this.exec);
      if (result.exitCode !== 0) {
        return undefined;
      }
      return result.stdout.trim() || undefined;
    } catch {
      return undefined; // spawn failure = not installed
    }
  }
}
