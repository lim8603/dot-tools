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
  /** Cache entries to remove (`-U`): overlay defines dropped since the last configure (R-2). */
  undefine?: string[];
  /** Overlay env for the configure process — CC/CXX and friends are read at configure (R-2). */
  env?: Record<string, string>;
}

/** Keys of the -D overlay a previous configure signature applied but `next` no longer does. */
export function droppedDefines(previousSignature: string | undefined, next: Record<string, string>): string[] {
  if (!previousSignature) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(previousSignature);
    const previous = Array.isArray(parsed) ? parsed[parsed.length - 1] : undefined;
    if (typeof previous !== 'object' || previous === null) {
      return [];
    }
    return Object.keys(previous).filter((key) => !(key in next));
  } catch {
    return [];
  }
}

/** The last few non-empty lines of a failed cmake run's stderr, for the error toast (R-2). */
export function stderrTail(stderr: string, lines = 3, maxLength = 400): string {
  const tail = stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(-lines)
    .join(' | ');
  return tail.length > maxLength ? `…${tail.slice(tail.length - maxLength)}` : tail;
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
  for (const key of opts.undefine ?? []) {
    args.push('-U', key);
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
// CMakePresets.json (TASK-041, TASK-067) — the extension reads the presets files read-only
// (ADR-013) and offers each visible, enabled configurePreset as the Preset chip;
// `cmake --preset <name>` then drives configure. The preset encodes compiler + generator +
// build type, so it replaces the profile/architecture chips.
//
// What cmake itself would see is the contract (cmake-presets(7)):
// - `include` is followed recursively, relative to the including file. A file reached twice
//   is read once; an include cycle (which cmake rejects) just stops.
// - CMakeUserPresets.json implicitly includes CMakePresets.json.
// - Order matches `cmake --list-presets`: each file's own presets, then its includes depth
//   first, the user file first.
// - `condition` is evaluated (inherited; a `null` condition enables and is not inherited).
//   A condition we cannot evaluate (unknown macro, bad regex) leaves the preset VISIBLE:
//   cmake then rejects it with its own message, while hiding a preset cmake would accept is
//   silent breakage.
// - binaryDir is resolved through `inherits` and its macros expanded to an absolute path.
// The file I/O is injected (PresetFileReader) so this stays vscode-free and unit-testable.
// ─────────────────────────────────────────────────────────────────────────────

/** A configure preset offered as a Preset-chip item. */
export interface CMakeConfigurePreset {
  name: string;
  displayName?: string;
  /** Absolute build tree with macros expanded (undefined = the preset chain declares none). */
  binaryDir?: string;
}

/** Reads one presets file by absolute path; undefined when absent or unreadable. */
export type PresetFileReader = (path: string) => Promise<string | undefined>;

/** Host facts the condition / macro evaluator needs — injected so tests can pin them. */
export interface PresetHost {
  platform: NodeJS.Platform;
  env: Record<string, string | undefined>;
}

interface RawConfigurePreset {
  name?: unknown;
  displayName?: unknown;
  binaryDir?: unknown;
  generator?: unknown;
  hidden?: unknown;
  inherits?: unknown;
  condition?: unknown;
  environment?: unknown;
}

/** One parsed presets file. */
export interface PresetFile {
  /** Absolute path of the file (its dir is `${fileDir}`; includes resolve against it). */
  path: string;
  /** Format version (0 when absent) — `${fileDir}` changed meaning at version 12. */
  version: number;
  configurePresets: RawConfigurePreset[];
  include: string[];
}

/** Parse one presets file's text; undefined when absent or malformed. */
export function parsePresetFile(path: string, text: string | undefined): PresetFile | undefined {
  if (!text) {
    return undefined;
  }
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof doc !== 'object' || doc === null) {
    return undefined;
  }
  const { version, configurePresets, include } = doc as Record<string, unknown>;
  return {
    path,
    version: typeof version === 'number' ? version : 0,
    configurePresets: Array.isArray(configurePresets)
      ? configurePresets.filter((p): p is RawConfigurePreset => typeof p === 'object' && p !== null)
      : [],
    include: Array.isArray(include) ? include.filter((i): i is string => typeof i === 'string' && i !== '') : [],
  };
}

/** Identity of a file path for de-duplication (Windows paths are case-insensitive). */
function pathKey(path: string, platform: NodeJS.Platform): string {
  const normalized = resolve(path);
  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

/**
 * Read the project's presets files the way cmake does: CMakeUserPresets.json (which
 * implicitly includes CMakePresets.json) and every file either one includes, recursively.
 * Returned in cmake's listing order. [] when the project has no presets file.
 */
export async function loadPresetFiles(
  sourceDir: string,
  read: PresetFileReader,
  host: PresetHost = { platform: process.platform, env: process.env },
): Promise<PresetFile[]> {
  const files: PresetFile[] = [];
  const seen = new Set<string>();
  const visit = async (path: string): Promise<void> => {
    const key = pathKey(path, host.platform);
    if (seen.has(key)) {
      return; // included again (allowed) or an include cycle (rejected by cmake) — read once
    }
    seen.add(key);
    const file = parsePresetFile(path, await read(path));
    if (!file) {
      return;
    }
    files.push(file);
    for (const include of file.include) {
      // Include paths take macros (preset v7: $penv{}, v9: ${sourceDir}, ${fileDir}, …).
      const scope: MacroScope = {
        sourceDir,
        presetName: undefined, // not a preset context — ${presetName} is invalid here
        generator: undefined,
        presetFileDir: dirname(path),
        environment: {},
        host,
      };
      const expanded = expandMacros(include, scope, dirname(path)).text;
      await visit(resolve(dirname(path), expanded));
    }
  };
  await visit(join(sourceDir, 'CMakeUserPresets.json'));
  await visit(join(sourceDir, 'CMakePresets.json'));
  return files;
}

/** CMAKE_HOST_SYSTEM_NAME for a Node platform (`${hostSystemName}`). */
export function hostSystemName(platform: NodeJS.Platform): string {
  const names: Partial<Record<NodeJS.Platform, string>> = {
    win32: 'Windows',
    linux: 'Linux',
    darwin: 'Darwin',
    freebsd: 'FreeBSD',
    openbsd: 'OpenBSD',
    netbsd: 'NetBSD',
    sunos: 'SunOS',
    aix: 'AIX',
  };
  return names[platform] ?? platform;
}

/** A preset together with the file that defines it. */
interface PresetEntry {
  raw: RawConfigurePreset;
  file: PresetFile;
}

/** What the macro expander needs for one preset being used. */
interface MacroScope {
  sourceDir: string;
  presetName: string | undefined;
  generator: string | undefined;
  /** Directory of the file defining the preset being used (`${fileDir}` before version 12). */
  presetFileDir: string;
  /** Merged `environment` of the preset chain (null = explicitly unset). */
  environment: Record<string, string | null>;
  host: PresetHost;
}

/** How deep `$env{}` may chase environment values that reference other macros. */
const MAX_ENV_DEPTH = 8;

/**
 * Expand cmake preset macros in `text`. `fileDir` is the directory the macro is evaluated
 * against (the caller applies the version-12 rule). Returns `ok: false` when a macro is
 * unknown or unresolvable — the text then keeps that macro literally.
 */
function expandMacros(
  text: string,
  scope: MacroScope,
  fileDir: string,
  depth = 0,
): { text: string; ok: boolean } {
  let ok = true;
  const out = text.replace(/\$([A-Za-z]*)\{([^}]*)\}/g, (whole, namespace: string, name: string) => {
    const value = macroValue(namespace, name, scope, fileDir, depth);
    if (value === undefined) {
      ok = false;
      return whole;
    }
    return value;
  });
  return { text: out, ok };
}

function macroValue(
  namespace: string,
  name: string,
  scope: MacroScope,
  fileDir: string,
  depth: number,
): string | undefined {
  if (namespace === '') {
    switch (name) {
      case 'sourceDir':
        return scope.sourceDir;
      case 'sourceParentDir':
        return dirname(scope.sourceDir);
      case 'sourceDirName':
        return basename(scope.sourceDir);
      case 'presetName':
        return scope.presetName;
      case 'generator':
        return scope.generator;
      case 'hostSystemName':
        return hostSystemName(scope.host.platform);
      case 'fileDir':
        return fileDir;
      case 'dollar':
        return '$';
      case 'pathListSep':
        return scope.host.platform === 'win32' ? ';' : ':';
      default:
        return undefined;
    }
  }
  if (namespace === 'env' && name !== '') {
    if (Object.prototype.hasOwnProperty.call(scope.environment, name)) {
      const value = scope.environment[name];
      if (value === null) {
        return ''; // unset by the preset
      }
      if (depth >= MAX_ENV_DEPTH) {
        return undefined; // self-referencing environment — let cmake report it
      }
      const expanded = expandMacros(value, scope, fileDir, depth + 1);
      return expanded.ok ? expanded.text : undefined;
    }
    return scope.host.env[name] ?? '';
  }
  if (namespace === 'penv' && name !== '') {
    return scope.host.env[name] ?? '';
  }
  return undefined; // $vendor{…} or an unknown namespace
}

/**
 * Evaluate a preset `condition`. true/false when decided; undefined when it cannot be
 * evaluated (the caller keeps such a preset visible — see the section header).
 */
function evaluateCondition(condition: unknown, expand: (s: unknown) => string | undefined): boolean | undefined {
  if (condition === undefined || condition === null) {
    return true;
  }
  if (typeof condition === 'boolean') {
    return condition;
  }
  if (typeof condition !== 'object') {
    return undefined;
  }
  const c = condition as Record<string, unknown>;
  switch (c.type) {
    case 'const':
      return typeof c.value === 'boolean' ? c.value : undefined;
    case 'equals':
    case 'notEquals': {
      const lhs = expand(c.lhs);
      const rhs = expand(c.rhs);
      if (lhs === undefined || rhs === undefined) {
        return undefined;
      }
      return (lhs === rhs) === (c.type === 'equals');
    }
    case 'inList':
    case 'notInList': {
      const str = expand(c.string);
      if (str === undefined || !Array.isArray(c.list)) {
        return undefined;
      }
      let found = false;
      for (const item of c.list) {
        const value = expand(item);
        if (value === undefined) {
          return undefined;
        }
        if (value === str) {
          found = true;
          break; // short-circuit, like cmake
        }
      }
      return found === (c.type === 'inList');
    }
    case 'matches':
    case 'notMatches': {
      const str = expand(c.string);
      const regex = expand(c.regex);
      if (str === undefined || regex === undefined) {
        return undefined;
      }
      try {
        return new RegExp(regex).test(str) === (c.type === 'matches');
      } catch {
        return undefined; // a cmake regex JS cannot compile
      }
    }
    case 'anyOf':
    case 'allOf': {
      if (!Array.isArray(c.conditions)) {
        return undefined;
      }
      const decisive = c.type === 'anyOf'; // anyOf stops at true, allOf at false
      let unknown = false;
      for (const sub of c.conditions) {
        if (sub === null) {
          return undefined; // sub-conditions may not be null
        }
        const result = evaluateCondition(sub, expand);
        if (result === decisive) {
          return decisive;
        }
        if (result === undefined) {
          unknown = true;
        }
      }
      return unknown ? undefined : !decisive;
    }
    case 'not': {
      if (c.condition === null) {
        return undefined;
      }
      const result = evaluateCondition(c.condition, expand);
      return result === undefined ? undefined : !result;
    }
    default:
      return undefined;
  }
}

/** The parents named by a preset's `inherits` (string or array). */
function parentsOf(raw: RawConfigurePreset): string[] {
  if (typeof raw.inherits === 'string') {
    return [raw.inherits];
  }
  return Array.isArray(raw.inherits) ? raw.inherits.filter((p): p is string => typeof p === 'string') : [];
}

/**
 * The visible, enabled configure presets of `files` (from loadPresetFiles), in order.
 * `hidden` presets are excluded but still serve as inheritance parents. Inherited fields
 * follow cmake: the preset's own value, else the first parent (in `inherits` order) that
 * has one; cyclic inherits are guarded. Duplicate names keep the first definition.
 */
export function resolveConfigurePresets(
  files: PresetFile[],
  sourceDir: string,
  host: PresetHost = { platform: process.platform, env: process.env },
): CMakeConfigurePreset[] {
  const entries: PresetEntry[] = [];
  const byName = new Map<string, PresetEntry>();
  for (const file of files) {
    for (const raw of file.configurePresets) {
      if (typeof raw.name !== 'string' || byName.has(raw.name)) {
        continue;
      }
      const entry = { raw, file };
      entries.push(entry);
      byName.set(raw.name, entry);
    }
  }

  /** First entry in the inherits chain (self first) whose field passes `has`. */
  const findInChain = (
    name: string,
    has: (raw: RawConfigurePreset) => boolean,
    seen = new Set<string>(),
  ): PresetEntry | undefined => {
    if (seen.has(name)) {
      return undefined; // cyclic inherits — stop
    }
    seen.add(name);
    const entry = byName.get(name);
    if (!entry) {
      return undefined;
    }
    if (has(entry.raw)) {
      return entry;
    }
    for (const parent of parentsOf(entry.raw)) {
      const found = findInChain(parent, has, seen);
      if (found) {
        return found;
      }
    }
    return undefined;
  };

  /** The effective condition: own (null included), else the first parent's non-null one. */
  const conditionOf = (name: string, seen = new Set<string>()): { condition: unknown; entry: PresetEntry } | undefined => {
    if (seen.has(name)) {
      return undefined;
    }
    seen.add(name);
    const entry = byName.get(name);
    if (!entry) {
      return undefined;
    }
    if (entry.raw.condition !== undefined) {
      return { condition: entry.raw.condition, entry };
    }
    for (const parent of parentsOf(entry.raw)) {
      const found = conditionOf(parent, seen);
      if (found && found.condition !== null) {
        return found; // a parent's null condition is not inherited
      }
    }
    return undefined;
  };

  /** Merged environment: parents (earlier in `inherits` wins), then the preset's own. */
  const environmentOf = (name: string, seen = new Set<string>()): Record<string, string | null> => {
    if (seen.has(name)) {
      return {};
    }
    seen.add(name);
    const entry = byName.get(name);
    if (!entry) {
      return {};
    }
    const merged: Record<string, string | null> = {};
    for (const parent of [...parentsOf(entry.raw)].reverse()) {
      Object.assign(merged, environmentOf(parent, new Set(seen)));
    }
    const own = entry.raw.environment;
    if (typeof own === 'object' && own !== null) {
      for (const [key, value] of Object.entries(own as Record<string, unknown>)) {
        if (typeof value === 'string' || value === null) {
          merged[key] = value;
        }
      }
    }
    return merged;
  };

  /** `${fileDir}` for a macro defined in `definer` while `scope`'s preset is used. */
  const fileDirFor = (definer: PresetEntry, scope: MacroScope): string =>
    definer.file.version >= 12 ? dirname(definer.file.path) : scope.presetFileDir;

  const presets: CMakeConfigurePreset[] = [];
  for (const entry of entries) {
    const name = entry.raw.name as string;
    if (entry.raw.hidden === true) {
      continue;
    }
    const generatorEntry = findInChain(name, (raw) => typeof raw.generator === 'string');
    const scope: MacroScope = {
      sourceDir,
      presetName: name,
      generator: generatorEntry?.raw.generator as string | undefined,
      presetFileDir: dirname(entry.file.path),
      environment: environmentOf(name),
      host,
    };

    const condition = conditionOf(name);
    if (condition) {
      const fileDir = fileDirFor(condition.entry, scope);
      const expand = (value: unknown): string | undefined => {
        if (typeof value !== 'string') {
          return undefined;
        }
        const expanded = expandMacros(value, scope, fileDir);
        return expanded.ok ? expanded.text : undefined;
      };
      if (evaluateCondition(condition.condition, expand) === false) {
        continue; // disabled on this host — `cmake --preset` would refuse it
      }
    }

    const binaryDirEntry = findInChain(name, (raw) => typeof raw.binaryDir === 'string' && raw.binaryDir !== '');
    let binaryDir: string | undefined;
    if (binaryDirEntry) {
      // An unknown macro stays literal (best effort), as cmake would reject it on configure.
      const expanded = expandMacros(binaryDirEntry.raw.binaryDir as string, scope, fileDirFor(binaryDirEntry, scope));
      binaryDir = resolve(sourceDir, expanded.text);
    }
    presets.push({
      name,
      displayName: typeof entry.raw.displayName === 'string' ? entry.raw.displayName : undefined,
      binaryDir,
    });
  }
  return presets;
}

/**
 * Absolute build directory for a preset: its resolved binaryDir, else `<srcDir>/build/<name>`
 * when the preset chain declares none.
 */
export function resolvePresetBinaryDir(preset: CMakeConfigurePreset, srcDir: string): string {
  return preset.binaryDir ?? resolve(srcDir, 'build', preset.name);
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

/** The newest File API reply index file name in `replyDir`, or undefined when there is none. */
export async function latestReplyIndex(replyDir: string): Promise<string | undefined> {
  try {
    const indexFiles = (await readdir(replyDir)).filter((f) => f.startsWith('index-') && f.endsWith('.json')).sort();
    return indexFiles[indexFiles.length - 1]; // timestamped name → last = newest
  } catch {
    return undefined;
  }
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
  /** targetsIfConfigured's results, valid while the reply's newest index file is unchanged. */
  private readonly peekCache = new Map<string, { index: string; targets: CMakeTarget[] }>();

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
    const previous = this.configuredSig.get(buildDir);
    if (previous === signature) {
      return; // already configured with these options
    }
    await this.writeApiQueries(buildDir);
    // An overlay flag the user cleared must leave the cache too: -D only ever adds, so the
    // old value would keep compiling in (R-2). Known only for trees configured this session.
    const undefine = droppedDefines(previous, opts.defines ?? {});
    const args = configureArgs(srcDir, buildDir, { ...opts, undefine });
    const result = await execCapture('cmake', args, undefined, this.exec, opts.env);
    if (result.exitCode !== 0) {
      const tail = stderrTail(result.stderr);
      throw new DevSwitcherError(
        'CMAKE_CONFIGURE_FAILED',
        `cmake configure failed for ${srcDir} (exit ${result.exitCode})${tail ? `: ${tail}` : '.'}`,
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
   *
   * `setBinaryDir` is for a preset whose chain declares no binaryDir (optional since preset
   * version 3): bare `cmake --preset` would then configure IN the source dir, while every
   * other step (File API reply, build, clean) uses `binaryDir`. `-B` makes cmake agree.
   */
  async configurePreset(
    srcDir: string,
    presetName: string,
    binaryDir: string,
    setBinaryDir = false,
    extra: { defines?: Record<string, string>; env?: Record<string, string> } = {},
  ): Promise<void> {
    const defines = extra.defines ?? {};
    const signature = JSON.stringify(['preset', presetName, setBinaryDir, defines]);
    const previous = this.configuredSig.get(binaryDir);
    if (previous === signature) {
      return;
    }
    await this.writeApiQueries(binaryDir);
    // The compiler/linker overlay applies on top of the preset (`-D` after --preset wins),
    // as on the plain path — it used to be dropped silently for preset projects (R-2).
    const args = [
      '--preset',
      presetName,
      ...(setBinaryDir ? ['-B', binaryDir] : []),
      ...Object.entries(defines).flatMap(([key, value]) => ['-D', `${key}=${value}`]),
      ...droppedDefines(previous, defines).flatMap((key) => ['-U', key]),
    ];
    const result = await execCapture('cmake', args, srcDir, this.exec, extra.env);
    if (result.exitCode !== 0) {
      const tail = stderrTail(result.stderr);
      throw new DevSwitcherError(
        'CMAKE_CONFIGURE_FAILED',
        `cmake --preset ${presetName} failed for ${srcDir} (exit ${result.exitCode})${tail ? `: ${tail}` : '.'}`,
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

  /** Targets for (buildDir, config) from the cache, else read from the reply and cached. */
  private async cachedTargets(buildDir: string, config?: string): Promise<CMakeTarget[]> {
    const key = `${buildDir}\0${config ?? ''}`;
    const cached = this.targetCache.get(key);
    if (cached) {
      return cached;
    }
    const targets = await readReplyDir(join(buildDir, '.cmake', 'api', 'v1', 'reply'), config);
    this.targetCache.set(key, targets);
    return targets;
  }

  /**
   * Configure (if needed) and list the executable targets for a build type. `config` selects
   * the codemodel configuration read back; results are cached per (buildDir, config).
   *
   * configure() runs FIRST — it is signature-gated, so an unchanged option set costs nothing,
   * and a changed one (a new -D flag, another platform) must reconfigure before the build;
   * checking the cache first would hand back the old tree's targets and skip it.
   */
  async targetsFor(
    srcDir: string,
    buildDir: string,
    opts: ConfigureOptions = {},
    config?: string,
  ): Promise<CMakeTarget[]> {
    await this.configure(srcDir, buildDir, opts);
    return this.cachedTargets(buildDir, config);
  }

  /**
   * Targets for the Target chip, whose listItems knows no invocation overlay. A tree this
   * session already configured (with whatever options the build used) is only read:
   * configuring it again with no options would replace the build's (-A, -D) signature and
   * make every picker/build pair reconfigure. Otherwise — first use this session, or after
   * invalidateCache because a manifest changed — a plain configure refreshes the reply.
   */
  async listTargets(srcDir: string, buildDir: string, config?: string): Promise<CMakeTarget[]> {
    if (this.configuredSig.has(buildDir)) {
      const targets = await this.cachedTargets(buildDir, config);
      if (targets.length > 0) {
        return targets;
      }
      this.dropTargetCache(buildDir); // no reply yet — let the configure below produce one
    }
    return this.targetsFor(srcDir, buildDir, {}, config);
  }

  /**
   * Configure via a preset (if needed) and list its executable targets (TASK-041). The
   * preset's binaryDir is the reply source; `config` is left undefined so readReplyDir reads
   * the codemodel's default (only) configuration. Cached per (binaryDir, config); the
   * signature-gated configure runs first, as in targetsFor. `setBinaryDir`: see
   * configurePreset.
   */
  async targetsForPreset(
    srcDir: string,
    presetName: string,
    binaryDir: string,
    opts: { setBinaryDir?: boolean; defines?: Record<string, string>; env?: Record<string, string> } = {},
  ): Promise<CMakeTarget[]> {
    await this.configurePreset(srcDir, presetName, binaryDir, opts.setBinaryDir ?? false, opts);
    return this.cachedTargets(binaryDir);
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
   * The peek keeps its own cache instead, keyed by the reply's newest index file: cmake
   * names it with a timestamp, so a reconfigure (by us or anyone) changes the key, and
   * every render of an unset Target chip costs one directory listing instead of re-reading
   * every target-*.json (R-5).
   */
  async targetsIfConfigured(buildDir: string, config?: string): Promise<CMakeTarget[]> {
    const key = `${buildDir}\0${config ?? ''}`;
    const cached = this.targetCache.get(key);
    if (cached) {
      return cached;
    }
    const replyDir = join(buildDir, '.cmake', 'api', 'v1', 'reply');
    const index = await latestReplyIndex(replyDir);
    if (!index) {
      return []; // never configured — no reply yet
    }
    const peeked = this.peekCache.get(key);
    if (peeked?.index === index) {
      return peeked.targets;
    }
    const targets = await readReplyDir(replyDir, config);
    this.peekCache.set(key, { index, targets });
    return targets;
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
    this.peekCache.clear();
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
