import { dirname, join, relative, resolve } from 'node:path';
import * as vscode from 'vscode';
import { DevSwitcherError } from '../../core/errors';
import { ensureExtension } from '../../core/ensureExtension';
import {
  ChipItem,
  DiagnosticProbe,
  InvocationConfig,
  LanguageAdapter,
  ProjectInfo,
  Selection,
} from '../../core/types';
import { cmakeProjectFiles } from './cmakeTemplate';
import {
  CMakeBridge,
  CMakeConfigurePreset,
  CMakeManifestEntry,
  CMakeTarget,
  CODELLDB_EXTENSION,
  CPPTOOLS_EXTENSION,
  ConfigureOptions,
  DebuggerOverride,
  buildArgs,
  classifyManifests,
  cmakeProjectName,
  debuggerFor,
  describeTargetType,
  overlayDefines,
  parseConfigurePresets,
  resolvePresetBinaryDir,
} from './cmakeBridge';

const bridge = new CMakeBridge();

/** Static CMAKE_BUILD_TYPE set (dotnet Debug/Release precedent); custom types are a later concern. */
const CMAKE_BUILD_TYPES = ['Debug', 'Release', 'RelWithDebInfo', 'MinSizeRel'];

/** Generator platforms offered by the Architecture chip (`-A`, VS generators). */
const CMAKE_PLATFORMS = ['x64', 'Win32', 'ARM64'];

/** Architecture-chip sentinel: pick this to clear the platform back to the generator default. */
const HOST_DEFAULT_PLATFORM = '__host_default__';

/** Target-chip sentinel: build every target in the tree (`cmake --build` without --target,
 *  MS-021). Offered on root projects only; run/debug with it selected is vetoed. */
const ALL_TARGETS = '__all__';

/** The folder holding this project's own CMakeLists.txt (a sub-project's nested dir). */
function srcDirOf(project: ProjectInfo): string {
  return dirname(project.manifestPath);
}

/**
 * The source dir cmake configures from. A nested sub-project (ADR-019) builds through its
 * root's tree — `parentId` is the root's `cmake:${rel}` id, so the root's CMakeLists dir is
 * derived from it (no registry lookup needed). Top-level projects configure their own dir.
 */
function rootSrcDirOf(project: ProjectInfo): string {
  if (project.parentId?.startsWith('cmake:')) {
    const rel = project.parentId.slice('cmake:'.length);
    return dirname(join(project.workspaceFolder.uri.fsPath, rel));
  }
  return srcDirOf(project);
}

/** A sub-project's dir relative to its root ('.' = the root itself) — matches the File
 *  API target `paths.source` convention, scoping the Target chip (ADR-019). */
function scopeDirOf(project: ProjectInfo): string {
  const rel = relative(rootSrcDirOf(project), srcDirOf(project)).replace(/\\/g, '/');
  return rel === '' ? '.' : rel;
}

/** The targets a project's Target chip offers: a root sees the whole tree, a sub-project
 *  only the targets declared in (or below) its own dir. */
function targetsInScope(project: ProjectInfo, targets: CMakeTarget[]): CMakeTarget[] {
  if (project.parentId === undefined) {
    return targets;
  }
  const scope = scopeDirOf(project);
  return targets.filter(
    (t) => t.sourceDir !== undefined && (t.sourceDir === scope || t.sourceDir.startsWith(`${scope}/`)),
  );
}

/** Whether pickers should offer library targets/projects (General-tab preference, ADR-019). */
function showLibraries(): boolean {
  return vscode.workspace.getConfiguration('devSwitcher').get<boolean>('projects.showLibraries', true);
}

/**
 * Opt-in (B-5): configure a project just to fill in its Target list, even on the paths
 * that pass `probe: false`. Off by default, which is the v1.2.1 behaviour — configuring
 * writes a build tree into the source directory, and that is exactly what v1.2.1 stopped
 * doing to repositories the user only reads. Turning it on is a promise that every CMake
 * project in the workspace is one the user owns.
 *
 * The adapter reads this itself rather than the UI passing it down: the orchestrator and
 * the settings page keep sending `probe: false` and stay ignorant of CMake (INV-2).
 */
function configureOnSelect(): boolean {
  return vscode.workspace.getConfiguration('devSwitcher.cmake').get<boolean>('configureOnSelect', false);
}

/** Default build tree (gitignored) — the overlay `build-dir` can override it in TASK-034. */
function defaultBuildDir(srcDir: string): string {
  return join(srcDir, 'build');
}

/** Read a manifest's text via workspace.fs (remote-safe, ADR-008); undefined when unreadable. */
async function readManifest(uri: vscode.Uri): Promise<string | undefined> {
  try {
    return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
  } catch {
    return undefined; // unreadable — the watcher retries on save
  }
}

// ─── CMakePresets.json (TASK-041) ────────────────────────────────────────────
// When a project has CMakePresets.json, the Preset chip replaces profile + architecture
// (via ChipDescriptor.appliesTo) and `cmake --preset <name>` drives configure/build/run/
// debug. Presets are read via workspace.fs (remote-safe, ADR-008), parsed by the pure
// bridge helper, and cached per source dir so the *synchronous* run/build task assembly can
// peek them — the async chips / prepareInvocation warm the cache first. target discovery and
// the compiler-detected debugger (TASK-035) are reused unchanged from the preset's binaryDir.

const presetCache = new Map<string, CMakeConfigurePreset[]>();

/** The uri of a file inside the given absolute dir (remote-safe, ADR-008). */
function fileUriIn(project: ProjectInfo, dir: string, filename: string): vscode.Uri {
  const rel = relative(project.workspaceFolder.uri.fsPath, join(dir, filename));
  return vscode.Uri.joinPath(project.workspaceFolder.uri, ...rel.split(/[\\/]/));
}

/** Read + parse the project's configure presets (CMakePresets.json + CMakeUserPresets.json),
 *  cached per source dir. Presets live next to the ROOT CMakeLists — a nested sub-project
 *  configures through its root's tree, so it shares the root's presets (ADR-019). [] when
 *  neither file exists or every preset is hidden. */
async function readPresetsFor(project: ProjectInfo): Promise<CMakeConfigurePreset[]> {
  const srcDir = rootSrcDirOf(project);
  const cached = presetCache.get(srcDir);
  if (cached) {
    return cached;
  }
  const main = await readManifest(fileUriIn(project, srcDir, 'CMakePresets.json'));
  const user = await readManifest(fileUriIn(project, srcDir, 'CMakeUserPresets.json'));
  const presets = parseConfigurePresets(main, user);
  presetCache.set(srcDir, presets);
  return presets;
}

/** Whether the project drives configure through presets (≥1 visible configure preset). */
async function hasPresets(project: ProjectInfo): Promise<boolean> {
  return (await readPresetsFor(project)).length > 0;
}

/** The active preset name: the stored pick, else the sole/first preset (auto-selected like
 *  the target chip). undefined when the project has no presets. */
function activePresetName(sel: Selection, presets: CMakeConfigurePreset[]): string | undefined {
  if (presets.length === 0) {
    return undefined;
  }
  const stored = sel.values.preset;
  if (typeof stored === 'string' && presets.some((p) => p.name === stored)) {
    return stored;
  }
  return presets[0].name;
}

/** Sync resolution of the active preset (name + absolute binaryDir) from the warm cache —
 *  for the synchronous build/run task assembly. undefined when no presets (plain path). */
function peekActivePreset(project: ProjectInfo, sel: Selection): { name: string; binaryDir: string } | undefined {
  const rootDir = rootSrcDirOf(project);
  const presets = presetCache.get(rootDir);
  const name = presets ? activePresetName(sel, presets) : undefined;
  const preset = presets?.find((p) => p.name === name);
  return preset ? { name: preset.name, binaryDir: resolvePresetBinaryDir(preset, rootDir) } : undefined;
}

/**
 * Configure (via the active preset, or the plain overlay path) and return the build dir +
 * executable targets. The single async entry point the prepare/resolve/debug flows share,
 * so the preset-vs-plain decision lives in one place.
 */
async function configuredTargets(
  project: ProjectInfo,
  sel: Selection,
  config: InvocationConfig,
): Promise<{ buildDir: string; targets: CMakeTarget[] }> {
  const srcDir = rootSrcDirOf(project); // a sub-project configures through its root's tree
  const presets = await readPresetsFor(project);
  const preset = presets.find((p) => p.name === activePresetName(sel, presets));
  if (preset) {
    const binaryDir = resolvePresetBinaryDir(preset, srcDir);
    return { buildDir: binaryDir, targets: await bridge.targetsForPreset(srcDir, preset.name, binaryDir) };
  }
  const buildDir = buildDirFor(srcDir, config);
  const targets = await bridge.targetsFor(srcDir, buildDir, configureOptsFor(sel, config), activeCfg(sel));
  return { buildDir, targets };
}

/**
 * Targets for the Target chip: the tree's targets (preset projects enumerate via the first
 * preset — target names are the same across presets, so any configured preset yields the
 * list; the selected preset drives the real paths in configuredTargets; non-preset projects
 * use the plain default build dir), scoped to a sub-project's own dir (ADR-019) and, when
 * the show-libraries preference is off, narrowed to executables. A configure failure (no
 * compiler yet, a broken CMakeLists, …) degrades to [] so the chip shows empty rather than
 * throwing — Doctor surfaces the cause.
 *
 * `configure: false` reads an already-configured tree instead of configuring one. Merely
 * switching to a project is not a request to build it, and configuring writes
 * `<srcDir>/build/` — into a vendored dependency or git submodule, that is our files
 * appearing as local changes in a repo the user treats as read-only. Opening the picker or
 * running an action still configures: those are explicit.
 */
async function listSwitcherTargetsFor(
  project: ProjectInfo,
  { configure = true }: { configure?: boolean } = {},
): Promise<CMakeTarget[]> {
  const srcDir = rootSrcDirOf(project);
  let targets: CMakeTarget[];
  try {
    const presets = await readPresetsFor(project);
    if (presets.length > 0) {
      const preset = presets[0];
      const binaryDir = resolvePresetBinaryDir(preset, srcDir);
      targets = configure
        ? await bridge.targetsForPreset(srcDir, preset.name, binaryDir)
        : await bridge.targetsIfConfigured(binaryDir);
    } else {
      const buildDir = defaultBuildDir(srcDir);
      targets = configure
        ? await bridge.listTargets(srcDir, buildDir)
        : await bridge.targetsIfConfigured(buildDir);
    }
  } catch {
    return [];
  }
  const scoped = targetsInScope(project, targets);
  // A library-only project keeps its (library) targets even with the preference off —
  // filtering them away would leave the chip empty and the project unbuildable.
  if (!showLibraries() && project.library !== true) {
    return scoped.filter((t) => t.type === 'EXECUTABLE');
  }
  return scoped;
}

const CMAKE_TASK_TYPE = 'devSwitcher.cmake';

/** The active build type (profile chip), default Debug. */
function activeCfg(sel: Selection): string {
  return typeof sel.values.profile === 'string' ? sel.values.profile : 'Debug';
}

/** The selected executable target (target chip), or undefined when unset. */
function activeTarget(sel: Selection): string | undefined {
  return typeof sel.values.target === 'string' ? sel.values.target : undefined;
}

/** The generator platform (-A) from the architecture chip; undefined = generator default. */
function activePlatform(sel: Selection): string | undefined {
  const value = sel.values.architecture;
  return typeof value === 'string' && value !== HOST_DEFAULT_PLATFORM ? value : undefined;
}

/** The build tree: the `build-dir` output overlay (resolved against the source), else build/. */
function buildDirFor(srcDir: string, config: InvocationConfig): string {
  return config.outputDir ? resolve(srcDir, config.outputDir) : defaultBuildDir(srcDir);
}

/** Configure options from the selection + overlay (§8): build type, platform, and -D flags. */
function configureOptsFor(sel: Selection, config: InvocationConfig): ConfigureOptions {
  return {
    config: activeCfg(sel),
    platform: activePlatform(sel),
    defines: overlayDefines(config.compiler ?? {}, config.linker ?? {}),
  };
}

/** Task env from the overlay (config.env) — mirrors dotnet/python; undefined when empty. */
function taskEnv(config: InvocationConfig): Record<string, string> | undefined {
  const env: Record<string, string> = { ...(config.env ?? {}) };
  return Object.keys(env).length > 0 ? env : undefined;
}

/** Build task: `cmake --build <buildDir> [--config <cfg>] --target <target>` (no shell, NFR-002).
 *  Under a preset the build dir is the preset's binaryDir and --config is dropped (the preset
 *  fixed the generator + build type); the peek is warm because prepareInvocation ran first. */
function makeCmakeBuildTask(project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task {
  const srcDir = rootSrcDirOf(project); // sub-projects build through the root's tree (ADR-019)
  const preset = peekActivePreset(project, sel);
  const buildDir = preset ? preset.binaryDir : buildDirFor(srcDir, config);
  const buildConfig = preset ? undefined : activeCfg(sel);
  // 'All targets' (and an unset chip, which the required prompt normally prevents) drops
  // --target: the generator's default target builds everything (MS-021).
  const picked = activeTarget(sel);
  const target = picked === ALL_TARGETS ? undefined : picked;
  const execution = new vscode.ProcessExecution('cmake', buildArgs(buildDir, buildConfig, target), {
    cwd: srcDir,
    env: taskEnv(config),
  });
  const definition: vscode.TaskDefinition = { type: CMAKE_TASK_TYPE, action: 'build', projectId: project.id };
  const task = new vscode.Task(
    definition,
    project.workspaceFolder,
    `build ${project.name}`,
    'cmake',
    execution,
    ['$msCompile'], // built-in MSVC matcher — no extension dependency (ADR-009)
  );
  task.group = vscode.TaskGroup.Build;
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    clear: true,
  };
  return task;
}

/** Run task: execute the built artifact directly (no debugger extension needed, ADR-009). The
 *  path comes from the warm File API cache (prepareInvocation ran; the orchestrator built first
 *  because actions.runRequiresBuild). Falls back to the conventional multi-config path on a miss. */
function makeCmakeRunTask(project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task {
  const rootDir = rootSrcDirOf(project);
  const preset = peekActivePreset(project, sel);
  const buildDir = preset ? preset.binaryDir : buildDirFor(rootDir, config);
  const cfg = preset ? undefined : activeCfg(sel);
  const target = activeTarget(sel) ?? '';
  if (target === ALL_TARGETS) {
    // Unreachable through Run (validateAction vetoes first); guards the command preview,
    // which otherwise would render a bogus `…/__all__` run line.
    throw new DevSwitcherError('EXECUTABLE_NOT_FOUND', `'All targets' has no runnable artifact.`);
  }
  const rel = bridge.peekArtifact(buildDir, cfg, target);
  const exe = rel ? join(buildDir, rel) : join(buildDir, cfg ?? '', target); // cache miss → conventional path
  const execution = new vscode.ProcessExecution(exe, config.runArgs ?? [], {
    cwd: srcDirOf(project), // the program runs from its own (sub-)project dir
    env: taskEnv(config),
  });
  const definition: vscode.TaskDefinition = { type: CMAKE_TASK_TYPE, action: 'run', projectId: project.id };
  const task = new vscode.Task(definition, project.workspaceFolder, `run ${project.name}`, 'cmake', execution);
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    clear: true,
  };
  return task;
}

/** Friendly names for the debugger extensions Doctor/prompts show. */
const EXTENSION_LABELS: Record<string, string> = {
  [CPPTOOLS_EXTENSION]: 'C/C++ (cpptools)',
  [CODELLDB_EXTENSION]: 'CodeLLDB',
};
const extensionLabel = (id: string): string => EXTENSION_LABELS[id] ?? id;

/** The user's debugger override (VS Code setting); 'auto' unless a valid override is set. */
function debuggerOverride(): DebuggerOverride {
  const value = vscode.workspace.getConfiguration('devSwitcher.cmake').get<string>('debugger', 'auto');
  return value === 'cpptools' || value === 'codelldb' ? value : 'auto';
}

/**
 * C++ (CMake) adapter — MS-012 / C-7 (ADR-014). The extension drives `cmake` itself (no CMake
 * Tools delegation): switch/build/run/debug are the same "vscode-free bridge + thin wiring +
 * ProcessExecution + call-time overlay injection + File API path resolution" pattern the other
 * three adapters use. Detection (listProjects) + chips (profile = static CMAKE_BUILD_TYPE,
 * architecture = generator platform, target = File API executables) = TASK-033; two-stage
 * configure/build (`cmake -S -B -D…` / `cmake --build`) + resolveExecutable = TASK-034; run
 * (build-then-exec) + compiler-detected debugger = TASK-035. TASK-041 adds CMakePresets.json:
 * when present, a Preset chip replaces profile/architecture and `cmake --preset <name>` drives
 * configure into the preset's binaryDir (target discovery + debugger auto-detect reused from
 * there). F20 creation writes template files (D-13); the extension never edits CMakeLists.txt
 * or CMakePresets.json (ADR-013).
 */
export const cmakeAdapter: LanguageAdapter = {
  id: 'cmake',
  displayName: 'C++ (CMake)',
  actions: { build: true, runRequiresBuild: true }, // run = build the target, then execute the artifact
  manifestGlobs: ['**/CMakeLists.txt'],
  // Build/run are extension-free (ADR-014/ADR-009). The debugger extension (cpptools or
  // CodeLLDB) is added here once the debugger is finalized in TASK-035.
  requiredExtensions: [],
  canCreateProject: true,
  configCategories: ['compiler', 'linker', 'output', 'env', 'buildEvent', 'runArgs'],
  optionCatalog: [
    {
      id: 'cxx-flags',
      category: 'compiler',
      label: 'C++ compiler flags',
      // CMake's compiler varies (MSVC vs GCC/Clang) so the flag syntax differs — spell out
      // both and default the example to MSVC, the Windows / Visual Studio generator default.
      description:
        'Extra flags for the C++ compiler (CMAKE_CXX_FLAGS). Match your compiler: MSVC (the ' +
        'Windows / Visual Studio default) uses slash flags like /O2 /W4; GCC or Clang use -O2 -Wall.',
      example: '/O2 /W4',
      injectsAs: '-D CMAKE_CXX_FLAGS=<value>',
      type: 'string',
      injection: 'flag',
    },
    {
      id: 'exe-linker-flags',
      category: 'linker',
      label: 'Linker flags',
      description:
        'Extra flags for the linker (CMAKE_EXE_LINKER_FLAGS). Match your linker: MSVC (link.exe) ' +
        'uses /DEBUG; GNU ld (GCC/Clang) uses flags like -s.',
      example: '/DEBUG',
      injectsAs: '-D CMAKE_EXE_LINKER_FLAGS=<value>',
      type: 'string',
      injection: 'flag',
    },
    {
      id: 'build-dir',
      category: 'output',
      label: 'Build directory',
      description: 'Directory CMake configures and builds into (relative to the project).',
      example: 'build/release',
      injectsAs: 'cmake -B <value>',
      type: 'string',
      injection: 'flag',
    },
  ],

  chips: [
    {
      id: 'preset',
      icon: 'rocket',
      label: 'Preset',
      required: true,
      // Only shown when CMakePresets.json declares configure presets (TASK-041); it then
      // replaces the profile + architecture chips, since a preset already encodes the
      // compiler + generator + build type. `cmake --preset <name>` drives configure.
      appliesTo: (project) => hasPresets(project),
      listItems: async (project) => {
        const presets = await readPresetsFor(project);
        return presets.map((p) => ({
          id: p.name,
          label: p.displayName ?? p.name,
          description: p.displayName ? p.name : undefined,
        }));
      },
      // Auto-select the sole preset; with several, the required chip forces a pick.
      defaultValue: async (project) => {
        const presets = await readPresetsFor(project);
        return presets.length === 1 ? presets[0].name : undefined;
      },
    },
    {
      id: 'profile',
      icon: 'layers',
      label: 'Configuration',
      // Static CMAKE_BUILD_TYPE / --config set. Hidden when presets drive configure (the
      // preset fixes the build type); the plain `-S -B -D` path uses it otherwise.
      appliesTo: async (project) => !(await hasPresets(project)),
      listItems: async () => CMAKE_BUILD_TYPES.map((name) => ({ id: name, label: name })),
      defaultValue: async () => 'Debug',
    },
    {
      id: 'architecture',
      icon: 'chip',
      label: 'Architecture',
      unsetText: 'default', // unselected = generator default platform (no -A override)
      clearValueId: HOST_DEFAULT_PLATFORM, // 'Host default' entry clears back to unset
      // Hidden when presets drive configure (the preset fixes the generator platform).
      appliesTo: async (project) => !(await hasPresets(project)),
      // Static generator platforms (-A) for the VS generators. The chip declares the axis
      // now; the actual `-A` injection at configure time lands with the build wiring (TASK-034).
      listItems: async () => {
        const items: ChipItem[] = [
          { id: HOST_DEFAULT_PLATFORM, label: 'Host default', description: 'no -A override' },
        ];
        for (const platform of CMAKE_PLATFORMS) {
          items.push({ id: platform, label: platform });
        }
        return items;
      },
    },
    {
      id: 'target',
      icon: 'symbol-method',
      label: 'Target',
      required: true,
      // Executable + library targets from the CMake File API codemodel (ADR-014/ADR-019),
      // scoped to a sub-project's own dir. Libraries are annotated ("static library") —
      // they build but never run/debug (validateAction). Root projects also get an
      // "All targets" entry (build the whole tree, MS-021). Single-target projects
      // auto-select via defaultValue.
      listItems: async (project, opts) => {
        const targets = await listSwitcherTargetsFor(project, {
          configure: opts?.probe !== false || configureOnSelect(),
        });
        const items: ChipItem[] = targets.map((t) => ({
          id: t.name,
          label: t.name,
          description: describeTargetType(t.type),
        }));
        if (project.parentId === undefined && items.length > 0) {
          items.unshift({ id: ALL_TARGETS, label: 'All targets', description: 'build everything' });
        }
        return items;
      },
      // The switch-time seeding passes probe:false so merely selecting a project never
      // configures it (see listSwitcherTargetsFor); the chip then stays unset until an
      // action seeds it for real. Seeding before build/run/debug (and before a run group
      // starts its members) leaves probing on, so a sole target is still auto-picked.
      defaultValue: async (project, opts) => {
        const targets = await listSwitcherTargetsFor(project, {
          configure: opts?.probe !== false || configureOnSelect(),
        });
        return targets.length === 1 ? targets[0].name : undefined;
      },
      // Chip caption for the sentinel — 'All' reads better than the raw '__all__' id.
      format: (value) => (value === ALL_TARGETS ? 'All' : String(value)),
    },
  ],

  async listProjects(manifests) {
    // Nested project tree (ADR-019): a project() root with no project() ancestor is a
    // top-level entry ("solution"); every nested CMakeLists under it that declares targets
    // (add_executable / add_library — with or without its own project()) is a sub-project
    // (parentId → the root), built through the root's build tree. Generated CMakeLists
    // under build trees are skipped by path; classification itself is pure (cmakeBridge).
    const entries: CMakeManifestEntry[] = [];
    const meta = new Map<string, { uri: vscode.Uri; folder: vscode.WorkspaceFolder }>();
    for (const uri of manifests) {
      const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
      if (/(^|\/)(build|out|cmake-build[^/]*)\//.test(rel)) {
        continue;
      }
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (!folder || meta.has(rel)) {
        continue;
      }
      const content = await readManifest(uri);
      if (content === undefined) {
        continue; // unreadable — the watcher retries on save
      }
      entries.push({ rel, content });
      meta.set(rel, { uri, folder });
    }
    const projects: ProjectInfo[] = [];
    for (const role of classifyManifests(entries)) {
      const m = meta.get(role.rel);
      if (!m) {
        continue;
      }
      projects.push({
        id: `cmake:${role.rel}`,
        name: role.name ?? cmakeProjectName(m.uri.fsPath),
        adapterId: 'cmake',
        manifestPath: m.uri.fsPath,
        workspaceFolder: m.folder,
        parentId: role.role === 'sub' ? `cmake:${role.parentRel}` : undefined,
        library: role.library ? true : undefined,
      });
    }
    return projects;
  },

  // Two-stage build (ADR-014): prepareInvocation configures with the overlay -D flags, then
  // the build task is a single `cmake --build`. run executes the built artifact (orchestrator
  // builds first via runRequiresBuild); debug auto-selects the debugger from the compiler.
  createBuildTask(project, sel, config) {
    return makeCmakeBuildTask(project, sel, config);
  },
  createRunTask(project, sel, config) {
    return makeCmakeRunTask(project, sel, config);
  },

  /**
   * Debug config (§7.4): the orchestrator builds first, so resolveExecutable reads the artifact
   * path here. The debugger is auto-selected from the configured compiler (File API toolchains) —
   * MSVC → cppvsdbg, GCC → cppdbg+gdb, Clang → cppdbg+lldb — with the devSwitcher.cmake.debugger
   * override. requiredExtensions is empty (the extension is dynamic), so ensure it here.
   */
  async createDebugConfig(project, sel, config) {
    const srcDir = srcDirOf(project);
    // buildDir is the preset's binaryDir (or the plain overlay build dir); the compiler is
    // read from that tree's File API toolchains reply to auto-select the debugger (TASK-035).
    const { buildDir } = await configuredTargets(project, sel, config);
    const program = await this.resolveExecutable(project, sel, config);
    const compilerId = await bridge.detectCompiler(buildDir);
    const dbg = debuggerFor(compilerId, process.platform, debuggerOverride());
    const available = await ensureExtension(
      dbg.extensionId,
      `Debugging C++ needs ${extensionLabel(dbg.extensionId)}. Install it?`,
    );
    if (!available) {
      throw new DevSwitcherError('EXTENSION_MISSING', `Debugger extension ${dbg.extensionId} is required.`);
    }
    const debugConfig: vscode.DebugConfiguration = {
      type: dbg.type,
      request: 'launch',
      name: `Debug ${project.name}`,
      program,
      args: config.runArgs ?? [],
      cwd: srcDir,
    };
    if (dbg.mimode) {
      debugConfig.MIMode = dbg.mimode;
    }
    return debugConfig;
  },

  /** Configure (preset or overlay) and warm the File API caches (targets + toolchains) before
   *  the build/run/debug task (§7.3/§7.4). Idempotent (signature-cached). */
  async prepareInvocation(project, sel, config) {
    await configuredTargets(project, sel, config);
  },

  /**
   * Library targets build but never run/debug (ADR-019) — the Visual Studio behaviour.
   * Reads the selected target's File API type (cache warm after prepareInvocation) and
   * returns the block reason the orchestrator toasts. An unknown target proceeds — the
   * run/debug path surfaces its own EXECUTABLE_NOT_FOUND with more context.
   */
  async validateAction(action, project, sel, config) {
    const target = activeTarget(sel);
    if (!target) {
      return undefined;
    }
    // Kept short: info toasts render one line and truncate (F5 feedback, session #017).
    const verb = action === 'run' ? 'run' : 'debug';
    if (target === ALL_TARGETS) {
      return `'All targets' builds only — pick one executable to ${verb}.`;
    }
    const { targets } = await configuredTargets(project, sel, config);
    const found = targets.find((t) => t.name === target);
    const kind = found ? describeTargetType(found.type) : undefined;
    if (!kind) {
      return undefined;
    }
    return `'${target}' is a ${kind} — build only.`;
  },

  /**
   * The built executable path for the selected target — read from the File API codemodel's
   * artifact path (no path guessing, KB #8/DD-05), joined onto the active build dir (the
   * preset's binaryDir, or the plain overlay build dir). §7.4 builds first, so the binary
   * exists by the time this resolves for debug.
   */
  async resolveExecutable(project, sel, config) {
    const target = activeTarget(sel);
    if (!target) {
      throw new DevSwitcherError('EXECUTABLE_NOT_FOUND', `No target selected for ${project.name}.`); // E6
    }
    const { buildDir, targets } = await configuredTargets(project, sel, config);
    const found = targets.find((t) => t.name === target);
    if (!found?.artifactPath) {
      throw new DevSwitcherError('EXECUTABLE_NOT_FOUND', `No executable artifact for target ${target}.`); // E6
    }
    return join(buildDir, found.artifactPath);
  },

  createProject: (target) => ({ kind: 'files', files: cmakeProjectFiles(target.projectName) }),

  // invalidateCache clears the cmake toolchain probe + File API discovery + parsed presets
  // so a freshly installed cmake / edited CMakeLists / edited CMakePresets.json re-discovers
  // on Rescan. Must not throw — invalidateAll() runs it on every manual Rescan.
  invalidateCache: (_project) => {
    presetCache.clear();
    bridge.invalidateCache();
  },

  // F19 (§13.5) — probe cmake (critical). Real even while build/run/debug stay stubbed: Doctor
  // uses detectAdapters (a CMakeLists.txt glob), so a present manifest surfaces this. With
  // cmake absent, Doctor shows ❌ and the E1 warning chip lights. The debugger-extension probe
  // joins when the debugger is chosen (TASK-035).
  collectDiagnostics: async (): Promise<DiagnosticProbe[]> => {
    const tc = await bridge.checkToolchain();
    return [
      {
        id: 'cmake',
        label: 'cmake',
        severity: 'critical',
        present: tc.cmake !== undefined,
        detail: tc.cmake,
        tier: 2,
        resolution: { kind: 'openUrl', url: 'https://cmake.org/download/' },
      },
    ];
  },
};
