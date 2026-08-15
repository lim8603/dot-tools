import { dirname } from 'node:path';
import * as vscode from 'vscode';
import { DevSwitcherError } from '../../core/errors';
import { InvocationConfig, LanguageAdapter, ProjectInfo, Selection } from '../../core/types';
import { notImplemented } from '../notImplemented';
import {
  abbreviateTriple,
  assembleCargoArgs,
  buildProfileList,
  CargoBridge,
  defaultBinTarget,
  execCapture,
  formatFeatureCount,
  parseBinTargets,
  parseFeatures,
  parseWorkspacePackages,
  pickExecutable,
} from './cargoBridge';
import { CARGO_OPTION_CATALOG } from './optionCatalog';

/**
 * Rust (Cargo) adapter — the v1 real-implementation target (TASK-006, MS-003).
 *
 * A thin vscode-aware layer over the already-tested pieces: the CargoBridge CLI
 * boundary (TASK-005) and the pure arg/parse functions (TASK-004). It owns the one
 * translation the bridge deliberately avoids — ProjectInfo → manifestPath / cwd —
 * and turns assembled args into vscode.Task objects (interface_contract §6, 상세설계서 §8).
 *
 * Deferred (still stubbed): createDebugConfig → MS-005 (M4), createProjectTask →
 * MS-008 (F20 wizard), persistSetting → v2 (§8.7). Custom [profile.*] parsing,
 * `rustup target add` auto-install (F19), and the compiler/linker invocation
 * overlay are scoped out of M2 (see session #004 plan).
 */

/** Single toolchain per host — one bridge instance holds the metadata cache. */
const bridge = new CargoBridge();

const CARGO_TASK_TYPE = 'devSwitcher.cargo';

/** Directory a cargo command runs in — the package dir (cargo walks up for the workspace). */
function cwdOf(project: ProjectInfo): string {
  return dirname(project.manifestPath);
}

/**
 * Whether the package declares a `default` feature — needed to decide
 * `--no-default-features`. Read synchronously from the warm metadata cache; on a
 * miss fall back to false (cargo's own default), which never adds the flag.
 */
function hasDefaultFeature(project: ProjectInfo): boolean {
  const metadata = bridge.peekMetadata(project.manifestPath);
  return metadata ? parseFeatures(metadata, project.name).hasDefault : false;
}

/** Merge the invocation overlay's env + outputDir (CARGO_TARGET_DIR) for a Task. */
function taskEnv(config: InvocationConfig): Record<string, string> | undefined {
  const env: Record<string, string> = { ...(config.env ?? {}) };
  if (config.outputDir) {
    env.CARGO_TARGET_DIR = config.outputDir;
  }
  return Object.keys(env).length > 0 ? env : undefined;
}

/** Build a ProcessExecution-backed cargo Task (no shell, array args — NFR-002). */
function makeCargoTask(
  action: 'build' | 'run',
  project: ProjectInfo,
  sel: Selection,
  config: InvocationConfig,
): vscode.Task {
  const args = assembleCargoArgs(action, project.name, sel, config, hasDefaultFeature(project));
  const execution = new vscode.ProcessExecution('cargo', args, {
    cwd: cwdOf(project),
    env: taskEnv(config),
  });
  const definition: vscode.TaskDefinition = { type: CARGO_TASK_TYPE, action, projectId: project.id };
  const task = new vscode.Task(
    definition,
    project.workspaceFolder,
    `${action} ${project.name}`,
    'cargo',
    execution,
    ['$devswitcher-rustc'], // owned matcher (package.json), resolves without the Rust extension
  );
  if (action === 'build') {
    task.group = vscode.TaskGroup.Build;
  }
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    clear: true,
  };
  return task;
}

export const cargoAdapter: LanguageAdapter = {
  id: 'cargo',
  displayName: 'Rust (Cargo)',
  actions: { build: true },
  manifestGlobs: ['**/Cargo.toml'],
  requiredExtensions: ['vadimcn.vscode-lldb'],
  canCreateProject: true,
  optionCatalog: CARGO_OPTION_CATALOG,
  configCategories: ['compiler', 'linker', 'output', 'env', 'buildEvent', 'runArgs'],

  chips: [
    {
      id: 'profile',
      icon: 'layers',
      label: 'Profile',
      // M2: built-in dev/release. Custom [profile.*] parsing (Cargo.toml read) deferred.
      listItems: async () => buildProfileList([]),
      defaultValue: async () => 'dev',
    },
    {
      id: 'architecture',
      icon: 'chip',
      label: 'Architecture',
      // M2: installed targets only. Unselected = host default (no --target).
      // Not-installed enumeration + `rustup target add` on select (F19) is deferred.
      listItems: async () =>
        (await bridge.listInstalledTargets()).map((triple) => ({
          id: triple,
          label: triple,
          description: abbreviateTriple(triple),
        })),
      format: (value) => (typeof value === 'string' ? abbreviateTriple(value) : String(value)),
    },
    {
      id: 'features',
      icon: 'checklist',
      label: 'Features',
      multiSelect: true,
      listItems: async (project) => {
        const metadata = await bridge.fetchMetadata(project.manifestPath);
        return parseFeatures(metadata, project.name).names.map((name) => ({
          id: name,
          label: name,
          description: name === 'default' ? 'default' : undefined,
        }));
      },
      format: (value) => formatFeatureCount(Array.isArray(value) ? value : []),
      defaultValue: async (project) => {
        const metadata = await bridge.fetchMetadata(project.manifestPath);
        return parseFeatures(metadata, project.name).hasDefault ? ['default'] : [];
      },
    },
    {
      id: 'target',
      icon: 'symbol-method',
      label: 'Target',
      required: true,
      listItems: async (project) => {
        const metadata = await bridge.fetchMetadata(project.manifestPath);
        return parseBinTargets(metadata, project.name);
      },
      defaultValue: async (project) => {
        const metadata = await bridge.fetchMetadata(project.manifestPath);
        return defaultBinTarget(metadata, project.name);
      },
    },
  ],

  async listProjects(manifests) {
    const projects: ProjectInfo[] = [];
    const covered = new Set<string>(); // manifest paths already emitted by a fetched workspace

    // Shorter paths first: a workspace root's metadata covers its members, so we
    // skip the members' own manifests instead of re-running cargo for each.
    const sorted = [...manifests].sort((a, b) => a.fsPath.length - b.fsPath.length);
    for (const uri of sorted) {
      if (covered.has(uri.fsPath)) {
        continue;
      }
      let metadata;
      try {
        metadata = await bridge.fetchMetadata(uri.fsPath);
      } catch {
        continue; // E2/E3: unreadable manifest — watcher retries on save
      }
      for (const pkg of parseWorkspacePackages(metadata)) {
        covered.add(pkg.manifestPath);
        if (projects.some((p) => p.manifestPath === pkg.manifestPath)) {
          continue;
        }
        const manifestUri = vscode.Uri.file(pkg.manifestPath);
        const folder = vscode.workspace.getWorkspaceFolder(manifestUri);
        if (!folder) {
          continue; // outside the workspace (registry path, etc.)
        }
        projects.push({
          id: `cargo:${vscode.workspace.asRelativePath(manifestUri, false)}`,
          name: pkg.name,
          adapterId: 'cargo',
          manifestPath: pkg.manifestPath,
          workspaceFolder: folder,
        });
      }
    }
    return projects;
  },

  createBuildTask(project, sel, config) {
    return makeCargoTask('build', project, sel, config);
  },

  createRunTask(project, sel, config) {
    return makeCargoTask('run', project, sel, config);
  },

  createDebugConfig: (_project, _sel, _config) => notImplemented('CargoAdapter.createDebugConfig', 'M4'),

  async resolveExecutable(project, sel, config) {
    // Build with JSON messages and read the artifact path cargo reports (DD-05) —
    // no path guessing. §7.4 leaves the cache warm, so this is fast.
    const args = [
      ...assembleCargoArgs('build', project.name, sel, config, hasDefaultFeature(project)),
      '--message-format=json',
    ];
    const result = await execCapture('cargo', args, cwdOf(project));
    if (result.exitCode !== 0) {
      throw new DevSwitcherError(
        'CARGO_BUILD_FAILED',
        `cargo build failed for ${project.name} (exit ${result.exitCode}).`,
        result.stderr,
      );
    }
    const target = typeof sel.values.target === 'string' ? sel.values.target : undefined;
    const executable = pickExecutable(result.stdout.split(/\r?\n/), target);
    if (!executable) {
      throw new DevSwitcherError('EXECUTABLE_NOT_FOUND', 'No runnable binary target found.'); // E6
    }
    return executable;
  },

  createProjectTask: (_target) => notImplemented('CargoAdapter.createProjectTask', 'MS-008'),
  persistSetting: (_project, _key, _value) => notImplemented('CargoAdapter.persistSetting', 'v2'),

  invalidateCache: (project) => bridge.invalidateCache(project?.manifestPath),
};
