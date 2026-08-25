import { execFile } from 'node:child_process';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type { OptionValue } from '../../core/types';
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

/** Whether a CMakeLists.txt declares an executable target (`add_executable(...)`). */
export function hasExecutableCommand(cmakeListsContent: string): boolean {
  return /\badd_executable\s*\(/i.test(stripComments(cmakeListsContent));
}

/** Whether a CMakeLists.txt declares a library target (`add_library(...)`). */
export function hasLibraryCommand(cmakeListsContent: string): boolean {
  return /\badd_library\s*\(/i.test(stripComments(cmakeListsContent));
}

// ─────────────────────────────────────────────────────────────────────────────
// Nested project classification (MS-021 / ADR-019) — pure, path + content only.
// One project() root = one build tree (VS "solution"); every nested CMakeLists
// under it that declares targets (or its own project()) is a sub-project of the
// NEAREST root, built through the root's tree with `--target`.
// ─────────────────────────────────────────────────────────────────────────────

/** One CMakeLists.txt handed to classifyManifests: workspace-relative path ('/'-separated)
 *  plus its text content. */
export interface CMakeManifestEntry {
  rel: string;
  content: string;
}

/** classifyManifests result: the manifest's role in the workspace project tree. */
export interface CMakeManifestRole {
  rel: string;
  role: 'root' | 'sub';
  /** For a sub: the rel path of the nearest root's CMakeLists.txt. */
  parentRel?: string;
  /** project() name when literally parseable (else the caller falls back to the dir name). */
  name?: string;
  /** True when the manifest declares only library targets (add_library, no add_executable). */
  library: boolean;
}

/** The directory part of a '/'-separated rel path ('' for a workspace-root manifest). */
function relDir(rel: string): string {
  const idx = rel.lastIndexOf('/');
  return idx === -1 ? '' : rel.slice(0, idx);
}

/** Whether `dir` is a strict ancestor directory of `sub` ('' = workspace root). */
function isAncestorDir(dir: string, sub: string): boolean {
  if (dir === sub) {
    return false;
  }
  return dir === '' || sub.startsWith(`${dir}/`);
}

/**
 * Classify a workspace's CMakeLists.txt files into roots and sub-projects (ADR-019).
 * A **root** declares project() and has no project()-declaring ancestor. A **sub** sits
 * under a root and either declares targets (add_executable / add_library — with or
 * without its own project(), matching the VS solution view) or declares project()
 * itself. Manifests that declare neither, and target-less leaves with no ancestor
 * root, are dropped (nothing to build). Entries under build trees must be filtered
 * out by the caller beforehand.
 */
export function classifyManifests(entries: CMakeManifestEntry[]): CMakeManifestRole[] {
  const rootCandidates = entries.filter((e) => hasProjectCommand(e.content));
  const roots = rootCandidates.filter(
    (e) => !rootCandidates.some((other) => isAncestorDir(relDir(other.rel), relDir(e.rel))),
  );
  const rootDirs = roots
    .map((r) => ({ dir: relDir(r.rel), rel: r.rel }))
    .sort((a, b) => b.dir.length - a.dir.length); // longest dir first → nearest ancestor wins

  const result: CMakeManifestRole[] = [];
  for (const entry of entries) {
    const name = parseProjectName(entry.content);
    const library = hasLibraryCommand(entry.content) && !hasExecutableCommand(entry.content);
    if (roots.some((r) => r.rel === entry.rel)) {
      result.push({ rel: entry.rel, role: 'root', name, library });
      continue;
    }
    const parent = rootDirs.find((r) => isAncestorDir(r.dir, relDir(entry.rel)));
    if (!parent) {
      continue; // no ancestor root and not a root itself — nothing standalone to build
    }
    const declaresTargets = hasExecutableCommand(entry.content) || hasLibraryCommand(entry.content);
    if (!declaresTargets && !hasProjectCommand(entry.content)) {
      continue; // a pure grouping/include leaf — not a sub-project
    }
    result.push({ rel: entry.rel, role: 'sub', parentRel: parent.rel, name, library });
  }
  return result;
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
  /** Source dir the target is declared in, relative to the top source dir ('.' = root). */
  sourceDir?: string;
}

/** A buildable target resolved for the switcher: executables and libraries (MS-021).
 *  `type` is the File API target type; libraries build but never run/debug (ADR-019). */
export interface CMakeTarget {
  name: string;
  type: string; // EXECUTABLE | STATIC_LIBRARY | SHARED_LIBRARY | MODULE_LIBRARY | OBJECT_LIBRARY
  artifactPath?: string;
  /** Declaring source dir relative to the top source dir ('.' = root) — scopes the
   *  Target chip of a nested sub-project to its own targets. */
  sourceDir?: string;
}

/** The File API target types the switcher offers (UTILITY/INTERFACE noise stays out). */
const SWITCHER_TARGET_TYPES = new Set([
  'EXECUTABLE',
  'STATIC_LIBRARY',
  'SHARED_LIBRARY',
  'MODULE_LIBRARY',
  'OBJECT_LIBRARY',
]);

/** Human label for a non-executable target type ('static library', …); undefined for
 *  EXECUTABLE — chips/toasts only annotate the library kinds. */
export function describeTargetType(type: string): string | undefined {
  return type === 'EXECUTABLE' ? undefined : type.toLowerCase().replace(/_/g, ' ');
}

/** From the reply index, the reply filename for one object kind (`reply[key].jsonFile`). */
function parseReplyIndexObject(indexJson: string, key: string): string | undefined {
  try {
    const idx = JSON.parse(indexJson) as { reply?: Record<string, { jsonFile?: string }> };
    return idx.reply?.[key]?.jsonFile;
  } catch {
    return undefined;
  }
}

/** From the reply index, the codemodel reply filename (`reply["codemodel-v2"].jsonFile`). */
export function parseReplyIndexCodemodel(indexJson: string): string | undefined {
  return parseReplyIndexObject(indexJson, 'codemodel-v2');
}

/** The CXX compiler id from a toolchains-v1 reply — 'MSVC' | 'GNU' | 'Clang' | … (undefined if absent). */
export function parseCxxCompilerId(toolchainsJson: string): string | undefined {
  try {
    const tc = JSON.parse(toolchainsJson) as {
      toolchains?: { language?: string; compiler?: { id?: string } }[];
    };
    return (tc.toolchains ?? []).find((t) => t.language === 'CXX')?.compiler?.id;
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
    paths?: { source?: string };
  };
  return {
    name: t.name ?? '',
    type: t.type ?? '',
    nameOnDisk: t.nameOnDisk,
    artifacts: (t.artifacts ?? []).map((a) => a.path).filter((p): p is string => typeof p === 'string'),
    sourceDir: typeof t.paths?.source === 'string' ? t.paths.source : undefined,
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
// configure / build argument assembly (ADR-014, §8) — pure, overlay -D injection
// ─────────────────────────────────────────────────────────────────────────────

/** Options folded into a configure: build type, generator platform, and overlay -D flags. */
export interface ConfigureOptions {
  config?: string; // CMAKE_BUILD_TYPE (single-config generators use it; multi-config ignores it)
  platform?: string; // generator platform (-A) for the VS generators
  defines?: Record<string, string>; // extra -D overlay (CMAKE_CXX_FLAGS, CMAKE_EXE_LINKER_FLAGS, …)
}

/**
 * Configure args: `cmake -S <src> -B <build> [-A <platform>] [-D CMAKE_BUILD_TYPE=<cfg>]
 * [-D k=v …]`. The overlay is injected here (§8) — the canonical CMakeLists.txt is never
 * edited (ADR-013). CMAKE_BUILD_TYPE is passed for single-config generators; multi-config
 * generators select the config at build time via --config (buildArgs) and ignore it.
 */
export function configureArgs(srcDir: string, buildDir: string, opts: ConfigureOptions = {}): string[] {
  const args = ['-S', srcDir, '-B', buildDir];
  if (opts.platform) {
    args.push('-A', opts.platform);
  }
  if (opts.config) {
    args.push('-D', `CMAKE_BUILD_TYPE=${opts.config}`);
  }
  for (const [key, value] of Object.entries(opts.defines ?? {})) {
    args.push('-D', `${key}=${value}`);
  }
  return args;
}

/**
 * Build args: `cmake --build <build> [--config <cfg>] [--target <target>]` (no shell,
 * NFR-002). `config` is omitted for preset builds (TASK-041) — the preset already fixed the
 * generator and build type, so `--config` would be redundant (multi-config) or ignored
 * (single-config). `target` omitted builds the generator's default target — i.e. everything
 * (ALL_BUILD on VS, `all` on Ninja/Makefiles) — which is how "All targets" builds (MS-021).
 */
export function buildArgs(buildDir: string, config: string | undefined, target?: string): string[] {
  const args = ['--build', buildDir];
  if (config) {
    args.push('--config', config);
  }
  if (target !== undefined) {
    args.push('--target', target);
  }
  return args;
}

/**
 * Map the compiler/linker overlay records (InvocationConfig, keyed by option id) to cmake
 * -D defines (§8): compiler `cxx-flags` → CMAKE_CXX_FLAGS, linker `exe-linker-flags` →
 * CMAKE_EXE_LINKER_FLAGS. Only non-empty string values are injected.
 */
export function overlayDefines(
  compiler: Record<string, OptionValue>,
  linker: Record<string, OptionValue>,
): Record<string, string> {
  const defines: Record<string, string> = {};
  const cxx = compiler['cxx-flags'];
  if (typeof cxx === 'string' && cxx.trim()) {
    defines.CMAKE_CXX_FLAGS = cxx;
  }
  const link = linker['exe-linker-flags'];
  if (typeof link === 'string' && link.trim()) {
    defines.CMAKE_EXE_LINKER_FLAGS = link;
  }
  return defines;
}

// ─────────────────────────────────────────────────────────────────────────────
// CMakePresets.json (TASK-041) — pure parsing. The extension reads CMakePresets.json
// (+ CMakeUserPresets.json) read-only (ADR-013) and offers each visible configurePreset
// as the Preset chip; `cmake --preset <name>` then drives configure. The preset encodes
// compiler + generator + build type, so it replaces the profile/architecture chips.
// `inherits` is resolved for binaryDir and ${sourceDir}/${presetName} macros are expanded
// (resolvePresetBinaryDir); all other fields/macros are left to cmake itself.
// ─────────────────────────────────────────────────────────────────────────────

/** A configure preset offered as a Preset-chip item. */
export interface CMakeConfigurePreset {
  name: string;
  displayName?: string;
  /** inherits-resolved binaryDir, still holding ${sourceDir}/${presetName} macros (undefined = none). */
  binaryDir?: string;
}

interface RawConfigurePreset {
  name?: string;
  displayName?: string;
  binaryDir?: string;
  hidden?: boolean;
  inherits?: string | string[];
}

/** The raw configurePresets array from one presets JSON file (tolerant of malformed input). */
function rawConfigurePresets(json: string | undefined): RawConfigurePreset[] {
  if (!json) {
    return [];
  }
  try {
    const doc = JSON.parse(json) as { configurePresets?: RawConfigurePreset[] };
    return Array.isArray(doc.configurePresets) ? doc.configurePresets : [];
  } catch {
    return [];
  }
}

/**
 * The visible configure presets from CMakePresets.json (+ CMakeUserPresets.json). `hidden`
 * presets are excluded from the result but still serve as inheritance parents (the common
 * "hidden base" pattern). Each preset's binaryDir is resolved through its `inherits` chain
 * (first parent that declares one wins; cycles are guarded); macro expansion is deferred to
 * resolvePresetBinaryDir. User presets are appended after project presets and may inherit
 * from them. Duplicate names keep the first definition.
 */
export function parseConfigurePresets(mainJson: string | undefined, userJson?: string): CMakeConfigurePreset[] {
  const raw = [...rawConfigurePresets(mainJson), ...rawConfigurePresets(userJson)];
  const byName = new Map<string, RawConfigurePreset>();
  for (const preset of raw) {
    if (typeof preset.name === 'string' && !byName.has(preset.name)) {
      byName.set(preset.name, preset);
    }
  }
  const inheritedBinaryDir = (name: string, seen: Set<string>): string | undefined => {
    if (seen.has(name)) {
      return undefined; // cyclic inherits — stop
    }
    seen.add(name);
    const preset = byName.get(name);
    if (!preset) {
      return undefined;
    }
    if (typeof preset.binaryDir === 'string' && preset.binaryDir) {
      return preset.binaryDir;
    }
    const parents =
      preset.inherits === undefined ? [] : Array.isArray(preset.inherits) ? preset.inherits : [preset.inherits];
    for (const parent of parents) {
      const found = inheritedBinaryDir(parent, seen);
      if (found) {
        return found;
      }
    }
    return undefined;
  };
  const presets: CMakeConfigurePreset[] = [];
  const emitted = new Set<string>();
  for (const preset of raw) {
    if (typeof preset.name !== 'string' || preset.hidden === true || emitted.has(preset.name)) {
      continue;
    }
    emitted.add(preset.name);
    presets.push({
      name: preset.name,
      displayName: typeof preset.displayName === 'string' ? preset.displayName : undefined,
      binaryDir: inheritedBinaryDir(preset.name, new Set()),
    });
  }
  return presets;
}

/**
 * Absolute build directory for a preset: its binaryDir with ${sourceDir}/${presetName}
 * expanded, resolved against the source dir. Falls back to `<srcDir>/build/<name>` when the
 * preset (and its parents) declare no binaryDir — matching cmake's conventional layout.
 */
export function resolvePresetBinaryDir(preset: CMakeConfigurePreset, srcDir: string): string {
  const template = preset.binaryDir ?? '${sourceDir}/build/${presetName}';
  const expanded = template
    .replace(/\$\{sourceDir\}/g, srcDir)
    .replace(/\$\{presetName\}/g, preset.name);
  return resolve(srcDir, expanded);
}

// ─────────────────────────────────────────────────────────────────────────────
// Debugger selection (ADR-014, TASK-035) — the debugger is bound to the compiler,
// so it is auto-detected from the File API toolchains reply (WSL/MinGW/Linux/Mac
// all follow whatever compiler configured), with an optional user override.
// ─────────────────────────────────────────────────────────────────────────────

export const CPPTOOLS_EXTENSION = 'ms-vscode.cpptools';
export const CODELLDB_EXTENSION = 'vadimcn.vscode-lldb';

/** User override for the CMake debugger (VS Code setting devSwitcher.cmake.debugger). */
export type DebuggerOverride = 'auto' | 'cpptools' | 'codelldb';

/** The chosen debug launch backend: VS Code debug `type`, optional MIMode, and its extension. */
export interface DebuggerChoice {
  type: string; // 'cppvsdbg' | 'cppdbg' | 'lldb'
  mimode?: string; // 'gdb' | 'lldb' (cppdbg only)
  extensionId: string;
}

/**
 * Pick the debugger for a compiler. MSVC → cppvsdbg; GNU → cppdbg+gdb; Clang → cppdbg+lldb;
 * unknown → platform fallback (MSVC on Windows, gdb elsewhere) — all via the C/C++ extension.
 * The `codelldb` override forces CodeLLDB (lldb) regardless of compiler; `cpptools` keeps the
 * C/C++ extension but still picks the type from the compiler.
 */
export function debuggerFor(
  compilerId: string | undefined,
  platform: NodeJS.Platform,
  override: DebuggerOverride = 'auto',
): DebuggerChoice {
  if (override === 'codelldb') {
    return { type: 'lldb', extensionId: CODELLDB_EXTENSION };
  }
  const id = (compilerId ?? '').toLowerCase();
  if (id.includes('msvc')) {
    return { type: 'cppvsdbg', extensionId: CPPTOOLS_EXTENSION };
  }
  if (id.includes('gnu')) {
    return { type: 'cppdbg', mimode: 'gdb', extensionId: CPPTOOLS_EXTENSION };
  }
  if (id.includes('clang')) {
    return { type: 'cppdbg', mimode: 'lldb', extensionId: CPPTOOLS_EXTENSION };
  }
  return platform === 'win32'
    ? { type: 'cppvsdbg', extensionId: CPPTOOLS_EXTENSION }
    : { type: 'cppdbg', mimode: 'gdb', extensionId: CPPTOOLS_EXTENSION };
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
 * Read the switcher-relevant targets from a CMake File API reply directory
 * (`<buildDir>/.cmake/api/v1/reply`): newest index → codemodel → each target's json,
 * keeping executables and libraries (SWITCHER_TARGET_TYPES — utility noise like
 * ALL_BUILD/ZERO_CHECK drops out). `config` picks the codemodel configuration (build
 * type); an unmatched name or a single-config generator falls back to the first
 * configuration. Returns [] when no reply exists yet. Node fs only (vscode-free) —
 * the extension host reads the local/remote build tree.
 */
export async function readReplyDir(replyDir: string, config?: string): Promise<CMakeTarget[]> {
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
  const targets: CMakeTarget[] = [];
  const seen = new Set<string>();
  for (const ref of chosen.targets) {
    let info: CMakeTargetInfo;
    try {
      info = parseTargetInfo(await readFile(join(replyDir, ref.jsonFile), 'utf8'));
    } catch {
      continue; // missing/malformed target file — skip
    }
    if (!SWITCHER_TARGET_TYPES.has(info.type) || seen.has(info.name)) {
      continue; // utility targets (ALL_BUILD/ZERO_CHECK) and dups drop out
    }
    seen.add(info.name);
    targets.push({
      name: info.name,
      type: info.type,
      artifactPath: executableArtifact(info),
      sourceDir: info.sourceDir,
    });
  }
  return targets;
}

/**
 * Read the CXX compiler id from a File API reply directory (newest index → toolchains-v1
 * reply). Used to auto-select the debugger (debuggerFor). Undefined when the toolchains
 * reply is absent (no configure yet, or the query was not written). Node fs only.
 */
export async function detectCompilerId(replyDir: string): Promise<string | undefined> {
  let entries: string[];
  try {
    entries = await readdir(replyDir);
  } catch {
    return undefined;
  }
  const indexFiles = entries.filter((f) => f.startsWith('index-') && f.endsWith('.json')).sort();
  if (indexFiles.length === 0) {
    return undefined;
  }
  const indexJson = await readFile(join(replyDir, indexFiles[indexFiles.length - 1]), 'utf8');
  const toolchainsFile = parseReplyIndexObject(indexJson, 'toolchains-v1');
  if (!toolchainsFile) {
    return undefined;
  }
  return parseCxxCompilerId(await readFile(join(replyDir, toolchainsFile), 'utf8'));
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
  private readonly configuredSig = new Map<string, string>(); // buildDir → last configure signature
  private readonly targetCache = new Map<string, CMakeTarget[]>(); // `${buildDir}\0${config}` → targets

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
   * Configure a project (ADR-014): write the codemodel query, then run `cmake -S -B` with
   * the overlay -D flags / build type / platform (configureArgs). Re-runs only when the
   * options change (signature-gated) so repeated build/debug clicks don't reconfigure; a
   * manifest edit forces a fresh configure via invalidateCache (Rescan). On a reconfigure
   * the cached target lists for this build tree are dropped (a target may have been added).
   */
  async configure(srcDir: string, buildDir: string, opts: ConfigureOptions = {}): Promise<void> {
    const signature = JSON.stringify([srcDir, opts.config ?? '', opts.platform ?? '', opts.defines ?? {}]);
    if (this.configuredSig.get(buildDir) === signature) {
      return; // already configured with these options
    }
    await this.writeApiQueries(buildDir);
    const result = await execCapture('cmake', configureArgs(srcDir, buildDir, opts), undefined, this.exec);
    if (result.exitCode !== 0) {
      throw new DevSwitcherError(
        'CMAKE_CONFIGURE_FAILED',
        `cmake configure failed for ${srcDir} (exit ${result.exitCode}).`,
        result.stderr,
      );
    }
    this.configuredSig.set(buildDir, signature);
    this.dropTargetCache(buildDir);
  }

  /**
   * Configure via a named preset: `cmake --preset <name>` run from the source dir (TASK-041).
   * The preset owns the binary dir, generator, toolchain and build type; we only write the
   * File API query into that binary dir first so targets/toolchains come back. Signature-gated
   * on the preset name so repeated clicks don't reconfigure. The canonical CMakePresets.json
   * is never edited (ADR-013). On a reconfigure the cached target lists for this build tree
   * are dropped.
   */
  async configurePreset(srcDir: string, presetName: string, binaryDir: string): Promise<void> {
    const signature = JSON.stringify(['preset', presetName]);
    if (this.configuredSig.get(binaryDir) === signature) {
      return;
    }
    await this.writeApiQueries(binaryDir);
    const result = await execCapture('cmake', ['--preset', presetName], srcDir, this.exec);
    if (result.exitCode !== 0) {
      throw new DevSwitcherError(
        'CMAKE_CONFIGURE_FAILED',
        `cmake --preset ${presetName} failed for ${srcDir} (exit ${result.exitCode}).`,
        result.stderr,
      );
    }
    this.configuredSig.set(binaryDir, signature);
    this.dropTargetCache(binaryDir);
  }

  /** Drop the cached target lists for one build tree (all configs) after a (re)configure. */
  private dropTargetCache(buildDir: string): void {
    for (const key of [...this.targetCache.keys()]) {
      if (key.startsWith(`${buildDir}\0`)) {
        this.targetCache.delete(key);
      }
    }
  }

  /**
   * Configure (if needed) and list the executable targets for a build type. `config` selects
   * the codemodel configuration read back; results are cached per (buildDir, config).
   */
  async targetsFor(
    srcDir: string,
    buildDir: string,
    opts: ConfigureOptions = {},
    config?: string,
  ): Promise<CMakeTarget[]> {
    const key = `${buildDir}\0${config ?? ''}`;
    const cached = this.targetCache.get(key);
    if (cached) {
      return cached;
    }
    await this.configure(srcDir, buildDir, opts);
    const targets = await readReplyDir(join(buildDir, '.cmake', 'api', 'v1', 'reply'), config);
    this.targetCache.set(key, targets);
    return targets;
  }

  /**
   * List executable targets via a plain (overlay-free) configure — used by the Target chip,
   * whose listItems has no invocation overlay. The build/debug flows inject the overlay via
   * configure()/targetsFor() with real options (prepareInvocation, resolveExecutable).
   */
  listTargets(srcDir: string, buildDir: string, config?: string): Promise<CMakeTarget[]> {
    return this.targetsFor(srcDir, buildDir, {}, config);
  }

  /**
   * Configure via a preset (if needed) and list its executable targets (TASK-041). The
   * preset's binaryDir is the reply source; `config` is left undefined so readReplyDir reads
   * the codemodel's default (only) configuration. Cached per (binaryDir, config).
   */
  async targetsForPreset(
    srcDir: string,
    presetName: string,
    binaryDir: string,
    config?: string,
  ): Promise<CMakeTarget[]> {
    const key = `${binaryDir}\0${config ?? ''}`;
    const cached = this.targetCache.get(key);
    if (cached) {
      return cached;
    }
    await this.configurePreset(srcDir, presetName, binaryDir);
    const targets = await readReplyDir(join(binaryDir, '.cmake', 'api', 'v1', 'reply'), config);
    this.targetCache.set(key, targets);
    return targets;
  }

  /**
   * Targets from an **already-configured** build tree — never runs cmake, never writes.
   *
   * `targetsFor`/`targetsForPreset` configure on demand, which creates the build tree.
   * That is right when the user asked for something (build, run, opening the Target
   * picker) and wrong when they merely switched to a project to look at it: configuring
   * writes `<srcDir>/build/` into a source tree the user may consider read-only — a
   * vendored dependency or a git submodule, where those files then show up as local
   * changes. So the switch-time path reads what is already there and settles for nothing.
   *
   * Returns [] when the tree was never configured (readReplyDir's own "no reply yet"),
   * which the Target chip renders as an unset value until the first real build.
   *
   * The target cache is read but deliberately **not** populated: an empty peek must never
   * become a cache entry that later makes `targetsFor` skip a configure it actually needs.
   */
  async targetsIfConfigured(buildDir: string, config?: string): Promise<CMakeTarget[]> {
    const cached = this.targetCache.get(`${buildDir}\0${config ?? ''}`);
    if (cached) {
      return cached;
    }
    return readReplyDir(join(buildDir, '.cmake', 'api', 'v1', 'reply'), config);
  }

  /**
   * Whether `buildDir` holds a configured CMake tree, judged by CMakeCache.txt.
   *
   * Used by the clean flow, which must never configure: `--target clean` needs a
   * configured tree, and generating one to satisfy a *clean* request would put back the
   * behaviour v1.2.1 removed. Reads nothing but a directory entry — no cmake process, no
   * files written.
   */
  async isConfigured(buildDir: string): Promise<boolean> {
    try {
      await access(join(buildDir, 'CMakeCache.txt'));
      return true;
    } catch {
      return false;
    }
  }

  /** Request codemodel (targets/paths) + toolchains (compiler id) replies on the next
   *  configure (shared stateless queries; file names select the reply, content ignored). */
  private async writeApiQueries(buildDir: string): Promise<void> {
    const queryDir = join(buildDir, '.cmake', 'api', 'v1', 'query');
    await mkdir(queryDir, { recursive: true });
    await writeFile(join(queryDir, 'codemodel-v2'), '');
    await writeFile(join(queryDir, 'toolchains-v1'), '');
  }

  /** The build-relative artifact path for a cached (buildDir, config) target — synchronous,
   *  for the run Task assembly (createRunTask is sync; prepareInvocation warms the cache). */
  peekArtifact(buildDir: string, config: string | undefined, target: string): string | undefined {
    const key = `${buildDir}\0${config ?? ''}`;
    return this.targetCache.get(key)?.find((t) => t.name === target)?.artifactPath;
  }

  /** The CXX compiler id (File API toolchains) for a configured build dir — drives debuggerFor. */
  detectCompiler(buildDir: string): Promise<string | undefined> {
    return detectCompilerId(join(buildDir, '.cmake', 'api', 'v1', 'reply'));
  }

  /** Drop all cached probes/discovery (F17 invalidation / explicit Rescan). */
  invalidateCache(): void {
    this.cmakeVersion = undefined;
    this.configuredSig.clear();
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
