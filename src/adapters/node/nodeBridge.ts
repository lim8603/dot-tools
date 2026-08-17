import { execFile } from 'node:child_process';
import { DevSwitcherError } from '../../core/errors';

/**
 * NodeBridge — the Node/npm boundary layer for the Node.js / TypeScript adapter
 * (MS-016, v0.6.0 — INT-001 6th language).
 *
 * Mirrors GoBridge/DotnetBridge (interface_contract §6): pure parsing helpers plus a
 * process-I/O class. Stays `vscode`-free — helpers take raw text / plain strings and
 * DevSwitcherError comes from `core/errors` — so the whole file unit-tests in plain Node
 * without a real Node toolchain probe. The child_process call is injected (NodeExec) for
 * hermetic tests.
 *
 * Unlike the compiled languages, a Node project's "what to run" is not a build target but
 * an npm **script** declared in package.json (`scripts`). The adapter reads package.json
 * via workspace.fs (remote-safe, ADR-008) and parses it with the pure helpers here; the
 * bridge's only process call is the toolchain probe (`node --version`). The package manager
 * is auto-detected from the lockfile (npm/pnpm/yarn), overridable via a chip.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (parsing) — unit-testable without a real Node toolchain
// ─────────────────────────────────────────────────────────────────────────────

/** An npm script declared in package.json — its name (the run target) and its command. */
export interface NodeScript {
  name: string;
  command: string;
}

/** The package managers the Node adapter supports (Human: script + package-manager chip). */
export type PackageManager = 'npm' | 'pnpm' | 'yarn';

/** All supported package managers, in chip-display order. */
export const PACKAGE_MANAGERS: PackageManager[] = ['npm', 'pnpm', 'yarn'];

/**
 * Lockfile name → the package manager that writes it, in detection-preference order.
 * pnpm/yarn come before npm because a repo migrated to pnpm/yarn may still carry a stale
 * package-lock.json, but its own lockfile is the authoritative signal.
 */
export const LOCKFILES: ReadonlyArray<{ file: string; pm: PackageManager }> = [
  { file: 'pnpm-lock.yaml', pm: 'pnpm' },
  { file: 'yarn.lock', pm: 'yarn' },
  { file: 'package-lock.json', pm: 'npm' },
];

/**
 * Parse the `scripts` map from package.json text. Invalid JSON, or a missing / non-object
 * `scripts` field, yields [] (the script chip then shows nothing rather than throwing).
 * Only string-valued entries are kept; insertion order follows the file.
 */
export function parseScripts(packageJsonText: string): NodeScript[] {
  let pkg: unknown;
  try {
    pkg = JSON.parse(packageJsonText);
  } catch {
    return [];
  }
  const scripts = (pkg as { scripts?: unknown } | null)?.scripts;
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts)) {
    return [];
  }
  const out: NodeScript[] = [];
  for (const [name, command] of Object.entries(scripts as Record<string, unknown>)) {
    if (typeof command === 'string') {
      out.push({ name, command });
    }
  }
  return out;
}

/** Display name: package.json `name`, else the folder that holds package.json. */
export function nodeProjectName(packageJsonText: string, manifestPath: string): string {
  try {
    const pkg = JSON.parse(packageJsonText) as { name?: unknown };
    if (typeof pkg.name === 'string' && pkg.name.trim().length > 0) {
      return pkg.name.trim();
    }
  } catch {
    // unparseable package.json — fall back to the folder name
  }
  const parts = manifestPath.replace(/\\/g, '/').split('/').filter((s) => s.length > 0);
  return parts[parts.length - 2] ?? manifestPath; // the directory containing package.json
}

/** The package manager a lockfile name implies, or undefined for an unknown name. */
export function packageManagerFromLockfile(lockfileName: string): PackageManager | undefined {
  return LOCKFILES.find((l) => l.file === lockfileName)?.pm;
}

// ─────────────────────────────────────────────────────────────────────────────
// Argument assembly (interface_contract §8). Node runs npm scripts through the
// package manager; the compiler overlay has no CLI-flag channel (tsc flags live in
// tsconfig.json, read-only — ADR-013), so only runArgs are injected. Pure/testable.
// ─────────────────────────────────────────────────────────────────────────────

/** The conventional build script the Build button runs (`<pm> run build`). */
export const BUILD_SCRIPT = 'build';

/**
 * Assemble the `<pm> run <script>` args (the command itself is the package manager). When
 * present, runArgs follow a `--` separator so the package manager forwards them to the
 * script rather than consuming them: npm requires `--`, and pnpm/yarn tolerate it, so `--`
 * is the portable form across all three. Build passes no runArgs.
 */
export function assembleNodeArgs(script: string, runArgs: string[]): string[] {
  const args = ['run', script];
  if (runArgs.length > 0) {
    args.push('--', ...runArgs);
  }
  return args;
}

// ─────────────────────────────────────────────────────────────────────────────
// Debug configuration — a bundled js-debug launch config that runs the selected
// npm script (Human: debug the script). No extension needed — js-debug ships with
// VSCode and resolves `npm`/`pnpm`/`yarn` (the .cmd shim) as the runtimeExecutable.
// Pure/testable; the adapter supplies pm/script/cwd/env.
// ─────────────────────────────────────────────────────────────────────────────

/** A js-debug `node` launch config that runs an npm script; structurally a DebugConfiguration. */
export interface NodeLaunchConfig {
  type: 'node';
  request: 'launch';
  name: string;
  cwd: string;
  runtimeExecutable: string; // 'npm' | 'pnpm' | 'yarn' — js-debug resolves the .cmd shim
  runtimeArgs: string[]; // ['run', <script>] (+ '--' + runArgs)
  console: 'integratedTerminal';
  skipFiles: string[];
  sourceMaps: boolean;
  env?: Record<string, string>;
}

/**
 * Assemble a js-debug launch config that debugs the selected npm script via the package
 * manager (runtimeExecutable). runArgs ride in runtimeArgs after `--` (assembleNodeArgs).
 * `console: 'integratedTerminal'` gives the script a real stdin; `sourceMaps: true` lets a
 * TS script's breakpoints resolve when its runner emits sourcemaps (tsx / ts-node / a build).
 * Mirrors buildDelveConfig / buildDebugpyConfig.
 */
export function buildNodeDebugConfig(
  projectName: string | undefined,
  pm: string,
  script: string,
  runArgs: string[],
  cwd: string,
  env?: Record<string, string>,
): NodeLaunchConfig {
  return {
    type: 'node',
    request: 'launch',
    name: projectName ? `Debug ${projectName}` : 'Debug',
    cwd,
    runtimeExecutable: pm,
    runtimeArgs: assembleNodeArgs(script, runArgs),
    console: 'integratedTerminal',
    skipFiles: ['<node_internals>/**'],
    sourceMaps: true,
    ...(env ? { env } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// node CLI I/O boundary — the only part that touches the process boundary.
// vscode-free and exec-injected (NodeExec) so tests run hermetically. Mirrors
// GoBridge's I/O half (TASK-043).
// ─────────────────────────────────────────────────────────────────────────────

/** npm output can be large; lift the buffer cap for future script/list reads. */
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

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
export type NodeExec = (
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string> },
) => Promise<ExecResult>;

/** Default NodeExec: `child_process.execFile` with no shell (NFR-002, array args). */
export const defaultExec: NodeExec = (command, args, options) =>
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
          reject(new DevSwitcherError('NODE_EXEC_FAILED', `Failed to run "${command}".`, error));
          return;
        }
        resolve({ stdout, stderr, exitCode: typeof code === 'number' ? code : 0 });
      },
    );
  });

/** Capture the output of a single invocation; the caller interprets the exit code. */
export function execCapture(
  command: string,
  args: string[],
  cwd: string | undefined,
  exec: NodeExec = defaultExec,
  env?: Record<string, string>,
): Promise<ExecResult> {
  return exec(command, args, { cwd, env });
}

/** Result of checkToolchain — version string when present; ok when `node` exists (E1). */
export interface NodeToolchainStatus {
  node?: string;
  ok: boolean;
}

/**
 * Stateful node boundary: owns the injected exec primitive. A Node project's metadata
 * (the npm scripts) is read from package.json by the adapter, not fetched via a process,
 * so the bridge has no per-project cache to invalidate — invalidateCache is a no-op kept
 * for interface symmetry with the other bridges.
 */
export class NodeBridge {
  private readonly exec: NodeExec;

  constructor(exec: NodeExec = defaultExec) {
    this.exec = exec;
  }

  /**
   * Whether the Node toolchain is available (E1). Never throws — a missing binary yields
   * `undefined`; `ok` reflects `node`, which is required.
   */
  async checkToolchain(): Promise<NodeToolchainStatus> {
    const node = await this.probeVersion();
    return { node, ok: node !== undefined };
  }

  /** No per-project exec cache (scripts are read from files); kept for interface parity. */
  invalidateCache(): void {
    /* nothing to invalidate */
  }

  /** `node --version` → trimmed version string (e.g. 'v20.11.0'), or undefined when absent. */
  private async probeVersion(): Promise<string | undefined> {
    try {
      const result = await execCapture('node', ['--version'], undefined, this.exec);
      if (result.exitCode !== 0) {
        return undefined;
      }
      return result.stdout.trim() || undefined;
    } catch {
      return undefined; // spawn failure = not installed
    }
  }
}
