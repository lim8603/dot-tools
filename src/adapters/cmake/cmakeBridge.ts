import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
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

/** Whether a CMakeLists.txt declares a `project()` — i.e. it is a project root, not an
 *  `add_subdirectory` leaf. Comments are stripped so `# project(x)` never counts. */
export function hasProjectCommand(cmakeListsContent: string): boolean {
  return /\bproject\s*\(/i.test(stripComments(cmakeListsContent));
}

/**
 * The name from `project(<name> …)`, or undefined when it cannot be read literally
 * (no project(), or a variable like `project(${FOO})`) — the caller then falls back to
 * the folder name (cmakeProjectName). Comments are stripped first.
 */
export function parseProjectName(cmakeListsContent: string): string | undefined {
  const match = /\bproject\s*\(\s*"?([A-Za-z0-9_.+-]+)"?/i.exec(stripComments(cmakeListsContent));
  return match ? match[1] : undefined;
}

/** Drop `#`-to-end-of-line comments so command matching ignores commented-out code. */
function stripComments(content: string): string {
  return content.replace(/#[^\n]*/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// CMake File API (codemodel-v2) — pure parsers (ADR-014)
// The adapter drives `cmake` itself, so it discovers targets/paths from the File API
// reply instead of a CMake Tools extension. These parse one reply file each; the fs
// walk that ties them together (readReplyDir) lives below. Tested against a real
// reply captured from cmake 4.4.2 (src/test/fixtures/cmake/file-api-reply).
// ─────────────────────────────────────────────────────────────────────────────

/** A target as listed inside a codemodel configuration (name + its target-*.json). */
export interface CMakeTargetRef {
  name: string;
  jsonFile: string;
}

/** One build configuration in the codemodel (Debug/Release/… or '' for single-config). */
export interface CMakeConfig {
  name: string;
  targets: CMakeTargetRef[];
}

/** The fields we read from a target-*.json reply. */
export interface CMakeTargetInfo {
  name: string;
  type: string; // EXECUTABLE | STATIC_LIBRARY | UTILITY | …
  nameOnDisk?: string; // e.g. hello.exe
  artifacts: string[]; // paths relative to the build dir (e.g. Debug/hello.exe)
}

/** An executable target resolved for the switcher (name + its binary path, build-relative). */
export interface CMakeExeTarget {
  name: string;
  artifactPath?: string;
}

/** From the reply index, the codemodel reply filename (`reply["codemodel-v2"].jsonFile`). */
export function parseReplyIndexCodemodel(indexJson: string): string | undefined {
  try {
    const idx = JSON.parse(indexJson) as { reply?: Record<string, { jsonFile?: string }> };
    return idx.reply?.['codemodel-v2']?.jsonFile;
  } catch {
    return undefined;
  }
}

/** The configurations (each with its target refs) from a codemodel-v2 reply. */
export function parseCodemodelConfigs(codemodelJson: string): CMakeConfig[] {
  try {
    const cm = JSON.parse(codemodelJson) as {
      configurations?: { name?: string; targets?: { name?: string; jsonFile?: string }[] }[];
    };
    return (cm.configurations ?? []).map((c) => ({
      name: c.name ?? '',
      targets: (c.targets ?? [])
        .filter((t): t is { name: string; jsonFile: string } =>
          typeof t.name === 'string' && typeof t.jsonFile === 'string')
        .map((t) => ({ name: t.name, jsonFile: t.jsonFile })),
    }));
  } catch {
    return [];
  }
}

/** The type/name/artifacts from a target-*.json reply. Throws on malformed JSON (caller catches). */
export function parseTargetInfo(targetJson: string): CMakeTargetInfo {
  const t = JSON.parse(targetJson) as {
    name?: string;
    type?: string;
    nameOnDisk?: string;
    artifacts?: { path?: string }[];
  };
  return {
    name: t.name ?? '',
    type: t.type ?? '',
    nameOnDisk: t.nameOnDisk,
    artifacts: (t.artifacts ?? []).map((a) => a.path).filter((p): p is string => typeof p === 'string'),
  };
}

/**
 * The primary binary path for an executable target: the artifact whose basename matches
 * nameOnDisk (skips sibling `.pdb`/`.lib`), falling back to the first non-debug artifact.
 * Undefined when the target produces no artifacts.
 */
export function executableArtifact(info: CMakeTargetInfo): string | undefined {
  if (info.artifacts.length === 0) {
    return undefined;
  }
  if (info.nameOnDisk) {
    const primary = info.artifacts.find(
      (p) => p.replace(/\\/g, '/').split('/').pop() === info.nameOnDisk,
    );
    if (primary) {
      return primary;
    }
  }
  return info.artifacts.find((p) => !/\.(pdb|ilk|exp|lib)$/i.test(p)) ?? info.artifacts[0];
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

/**
 * Read the executable targets from a CMake File API reply directory
 * (`<buildDir>/.cmake/api/v1/reply`): newest index → codemodel → each target's json,
 * keeping type=EXECUTABLE. `config` picks the codemodel configuration (build type);
 * an unmatched name or a single-config generator falls back to the first configuration.
 * Returns [] when no reply exists yet. Node fs only (vscode-free) — the extension host
 * reads the local/remote build tree.
 */
export async function readReplyDir(replyDir: string, config?: string): Promise<CMakeExeTarget[]> {
  let entries: string[];
  try {
    entries = await readdir(replyDir);
  } catch {
    return []; // never configured — no reply dir yet
  }
  const indexFiles = entries.filter((f) => f.startsWith('index-') && f.endsWith('.json')).sort();
  if (indexFiles.length === 0) {
    return [];
  }
  const latestIndex = indexFiles[indexFiles.length - 1]; // timestamped name → last = newest
  const codemodelFile = parseReplyIndexCodemodel(await readFile(join(replyDir, latestIndex), 'utf8'));
  if (!codemodelFile) {
    return [];
  }
  const configs = parseCodemodelConfigs(await readFile(join(replyDir, codemodelFile), 'utf8'));
  if (configs.length === 0) {
    return [];
  }
  const chosen = (config ? configs.find((c) => c.name === config) : undefined) ?? configs[0];
  const targets: CMakeExeTarget[] = [];
  const seen = new Set<string>();
  for (const ref of chosen.targets) {
    let info: CMakeTargetInfo;
    try {
      info = parseTargetInfo(await readFile(join(replyDir, ref.jsonFile), 'utf8'));
    } catch {
      continue; // missing/malformed target file — skip
    }
    if (info.type !== 'EXECUTABLE' || seen.has(info.name)) {
      continue; // utility targets (ALL_BUILD/ZERO_CHECK) and dups drop out
    }
    seen.add(info.name);
    targets.push({ name: info.name, artifactPath: executableArtifact(info) });
  }
  return targets;
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
  private readonly configured = new Set<string>(); // buildDirs already configured this session
  private readonly targetCache = new Map<string, CMakeExeTarget[]>(); // `${buildDir}\0${config}` → targets

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

  /**
   * List the executable targets of a project via the File API (ADR-014). Writes the
   * codemodel query, runs a plain `cmake -S <srcDir> -B <buildDir>` configure (no overlay
   * — target discovery only; the `-D` overlay injection is the build step, TASK-034), then
   * reads the reply. `config` selects the build type on a multi-config generator. Configure
   * runs once per buildDir (cached); results are cached per (buildDir, config).
   */
  async listTargets(srcDir: string, buildDir: string, config?: string): Promise<CMakeExeTarget[]> {
    const key = `${buildDir}\0${config ?? ''}`;
    const cached = this.targetCache.get(key);
    if (cached) {
      return cached;
    }
    if (!this.configured.has(buildDir)) {
      await this.writeCodemodelQuery(buildDir);
      const result = await execCapture('cmake', ['-S', srcDir, '-B', buildDir], undefined, this.exec);
      if (result.exitCode !== 0) {
        throw new DevSwitcherError(
          'CMAKE_CONFIGURE_FAILED',
          `cmake configure failed for ${srcDir} (exit ${result.exitCode}).`,
          result.stderr,
        );
      }
      this.configured.add(buildDir);
    }
    const targets = await readReplyDir(join(buildDir, '.cmake', 'api', 'v1', 'reply'), config);
    this.targetCache.set(key, targets);
    return targets;
  }

  /** Ask cmake for a codemodel reply on the next configure (shared stateless query). */
  private async writeCodemodelQuery(buildDir: string): Promise<void> {
    const queryDir = join(buildDir, '.cmake', 'api', 'v1', 'query');
    await mkdir(queryDir, { recursive: true });
    await writeFile(join(queryDir, 'codemodel-v2'), ''); // content ignored; name selects the reply
  }

  /** Drop all cached probes/discovery (F17 invalidation / explicit Rescan). */
  invalidateCache(): void {
    this.cmakeVersion = undefined;
    this.configured.clear();
    this.targetCache.clear();
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
