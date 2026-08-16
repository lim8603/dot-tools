import { dirname, join, resolve } from 'node:path';
import * as vscode from 'vscode';
import { DevSwitcherError } from '../../core/errors';
import {
  ChipItem,
  DiagnosticProbe,
  InvocationConfig,
  LanguageAdapter,
  ProjectInfo,
  Selection,
} from '../../core/types';
import { notImplemented } from '../notImplemented';
import { cmakeProjectFiles } from './cmakeTemplate';
import {
  CMakeBridge,
  CMakeExeTarget,
  ConfigureOptions,
  buildArgs,
  cmakeProjectName,
  hasProjectCommand,
  overlayDefines,
  parseProjectName,
} from './cmakeBridge';

const bridge = new CMakeBridge();

/** Static CMAKE_BUILD_TYPE set (dotnet Debug/Release precedent); custom types are a later concern. */
const CMAKE_BUILD_TYPES = ['Debug', 'Release', 'RelWithDebInfo', 'MinSizeRel'];

/** Generator platforms offered by the Architecture chip (`-A`, VS generators). */
const CMAKE_PLATFORMS = ['x64', 'Win32', 'ARM64'];

/** Architecture-chip sentinel: pick this to clear the platform back to the generator default. */
const HOST_DEFAULT_PLATFORM = '__host_default__';

/** The source dir cmake configures from — the folder holding CMakeLists.txt. */
function srcDirOf(project: ProjectInfo): string {
  return dirname(project.manifestPath);
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

/**
 * Executable targets for a project via the File API. A configure failure (no compiler yet,
 * a broken CMakeLists, …) degrades to [] so the Target chip shows an empty list rather than
 * throwing — Doctor surfaces the real cause. TASK-034 threads the overlay build-dir/profile.
 */
async function listExecutableTargetsFor(project: ProjectInfo): Promise<CMakeExeTarget[]> {
  const srcDir = srcDirOf(project);
  try {
    return await bridge.listTargets(srcDir, defaultBuildDir(srcDir));
  } catch {
    return [];
  }
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

/** Build task: `cmake --build <buildDir> --config <cfg> --target <target>` (no shell, NFR-002). */
function makeCmakeBuildTask(project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task {
  const srcDir = srcDirOf(project);
  const buildDir = buildDirFor(srcDir, config);
  const target = activeTarget(sel) ?? 'ALL_BUILD'; // the required chip guarantees a value before build
  const execution = new vscode.ProcessExecution('cmake', buildArgs(buildDir, activeCfg(sel), target), {
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

/**
 * C++ (CMake) adapter — MS-012 / C-7 (ADR-014). The extension drives `cmake` itself (no CMake
 * Tools delegation): switch/build/run/debug are the same "vscode-free bridge + thin wiring +
 * ProcessExecution + call-time overlay injection + File API path resolution" pattern the other
 * three adapters use. This slice (TASK-033) implements detection (listProjects) and the chips
 * (profile = static CMAKE_BUILD_TYPE, architecture = generator platform, target = File API
 * executables). Build/run (`cmake -S -B -D…` / `cmake --build`) + resolveExecutable land in
 * TASK-034; debug + the debugger extension in TASK-035. F20 creation writes template files
 * (D-13); the extension never edits CMakeLists.txt (ADR-013).
 */
export const cmakeAdapter: LanguageAdapter = {
  id: 'cmake',
  displayName: 'C++ (CMake)',
  actions: { build: true },
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
      id: 'profile',
      icon: 'layers',
      label: 'Configuration',
      // Static CMAKE_BUILD_TYPE / --config set. Injection at configure/build time = TASK-034.
      listItems: async () => CMAKE_BUILD_TYPES.map((name) => ({ id: name, label: name })),
      defaultValue: async () => 'Debug',
    },
    {
      id: 'architecture',
      icon: 'chip',
      label: 'Architecture',
      unsetText: 'default', // unselected = generator default platform (no -A override)
      clearValueId: HOST_DEFAULT_PLATFORM, // 'Host default' entry clears back to unset
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
      // Executable targets from the CMake File API codemodel (ADR-014). Single-target
      // projects auto-select via defaultValue.
      listItems: async (project) => {
        const targets = await listExecutableTargetsFor(project);
        return targets.map((t) => ({ id: t.name, label: t.name }));
      },
      defaultValue: async (project) => {
        const targets = await listExecutableTargetsFor(project);
        return targets.length === 1 ? targets[0].name : undefined;
      },
    },
  ],

  async listProjects(manifests) {
    // One project-root CMakeLists.txt = one switcher entry. A CMakeLists reached by
    // add_subdirectory has no project() command and is skipped, so nested source dirs don't
    // masquerade as projects; generated CMakeLists under build trees are skipped by path.
    const projects: ProjectInfo[] = [];
    for (const uri of manifests) {
      const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
      if (/(^|\/)(build|out|cmake-build[^/]*)\//.test(rel)) {
        continue;
      }
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (!folder || projects.some((p) => p.manifestPath === uri.fsPath)) {
        continue;
      }
      const content = await readManifest(uri);
      if (content === undefined || !hasProjectCommand(content)) {
        continue; // unreadable, or an add_subdirectory leaf without project()
      }
      projects.push({
        id: `cmake:${rel}`,
        name: parseProjectName(content) ?? cmakeProjectName(uri.fsPath),
        adapterId: 'cmake',
        manifestPath: uri.fsPath,
        workspaceFolder: folder,
      });
    }
    return projects;
  },

  // Two-stage build (ADR-014): prepareInvocation configures with the overlay -D flags, then
  // the build task is a single `cmake --build`. resolveExecutable reads the artifact path from
  // the File API. Run + debug (build-then-launch) land in TASK-035.
  createBuildTask(project, sel, config) {
    return makeCmakeBuildTask(project, sel, config);
  },
  createRunTask: (_project, _sel, _config) => notImplemented('CMakeAdapter.createRunTask', 'TASK-035'),
  createDebugConfig: (_project, _sel, _config) => notImplemented('CMakeAdapter.createDebugConfig', 'TASK-035'),

  /** Configure with the overlay before the build task (§7.3/§7.4). Idempotent (signature-cached). */
  async prepareInvocation(project, sel, config) {
    const srcDir = srcDirOf(project);
    await bridge.configure(srcDir, buildDirFor(srcDir, config), configureOptsFor(sel, config));
  },

  /**
   * The built executable path for the selected (target, config) — read from the File API
   * codemodel's artifact path (no path guessing, KB #8/DD-05), joined onto the build dir.
   * §7.4 builds first, so the binary exists by the time this resolves for debug.
   */
  async resolveExecutable(project, sel, config) {
    const srcDir = srcDirOf(project);
    const buildDir = buildDirFor(srcDir, config);
    const target = activeTarget(sel);
    if (!target) {
      throw new DevSwitcherError('EXECUTABLE_NOT_FOUND', `No target selected for ${project.name}.`); // E6
    }
    const targets = await bridge.targetsFor(srcDir, buildDir, configureOptsFor(sel, config), activeCfg(sel));
    const found = targets.find((t) => t.name === target);
    if (!found?.artifactPath) {
      throw new DevSwitcherError('EXECUTABLE_NOT_FOUND', `No executable artifact for target ${target}.`); // E6
    }
    return join(buildDir, found.artifactPath);
  },

  createProject: (target) => ({ kind: 'files', files: cmakeProjectFiles(target.projectName) }),

  // invalidateCache clears the cmake toolchain probe + File API discovery so a freshly
  // installed cmake / edited CMakeLists re-discovers on Rescan. Must not throw —
  // invalidateAll() runs it on every manual Rescan.
  invalidateCache: (_project) => bridge.invalidateCache(),

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
