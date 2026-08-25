import { dirname } from 'node:path';
import * as vscode from 'vscode';
import { DevSwitcherError } from '../../core/errors';
import {
  ChipItem,
  DiagnosticProbe,
  InvocationConfig,
  LanguageAdapter,
  NEW_PROJECT_TASK_TYPE,
  NewProjectTarget,
  ProjectInfo,
  Selection,
} from '../../core/types';
import {
  abbreviateTriple,
  assembleCargoArgs,
  buildConfigArgs,
  buildLldbConfig,
  buildProfileList,
  buildRustflags,
  CargoBridge,
  CargoMetadata,
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
 * The extension never edits Cargo.toml — canonical-file edits are permanently out of
 * scope (ADR-013, C-3 dropped); overlays inject at call time (ADR-011). createDebugConfig
 * (MS-005), `rustup target add` (MS-007), and createProjectTask (MS-008, F20) are implemented.
 */

/** Single toolchain per host — one bridge instance holds the metadata cache. */
const bridge = new CargoBridge();

/** Friendly names for the extensions Doctor reports (F19); falls back to the id. */
const EXTENSION_LABELS: Record<string, string> = { 'vadimcn.vscode-lldb': 'CodeLLDB' };
const extensionLabel = (id: string): string => EXTENSION_LABELS[id] ?? id;

/** Architecture-chip sentinel: pick this to clear the target back to host default (§8.3). */
const HOST_DEFAULT_TARGET = '__host_default__';

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

/** The active profile name for the overlay (chip value, default dev). */
function activeProfile(sel: Selection): string {
  return typeof sel.values.profile === 'string' ? sel.values.profile : 'dev';
}

/** Merge the invocation overlay's env + outputDir + linker RUSTFLAGS for a Task. */
function taskEnv(config: InvocationConfig): Record<string, string> | undefined {
  const env: Record<string, string> = { ...(config.env ?? {}) };
  if (config.outputDir) {
    env.CARGO_TARGET_DIR = config.outputDir;
  }
  const rustflags = buildRustflags(config.linker ?? {}, config.compiler ?? {});
  if (rustflags) {
    env.RUSTFLAGS = env.RUSTFLAGS ? `${env.RUSTFLAGS} ${rustflags}` : rustflags;
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
  const overlayArgs = buildConfigArgs(config.compiler ?? {}, activeProfile(sel));
  const args = assembleCargoArgs(action, project.name, sel, config, hasDefaultFeature(project), overlayArgs);
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

/**
 * `cargo new <name>` in the target folder (F20, TASK-022) — the native tool scaffolds
 * Cargo.toml + src/main.rs into a `<name>/` sub-folder (ADR-010: the extension never
 * writes files itself). ProcessExecution, no shell (NFR-002). ManifestWatcher then
 * detects the new manifest and the Orchestrator switches to it.
 */
function makeCargoNewTask(target: NewProjectTarget): vscode.Task {
  const execution = new vscode.ProcessExecution('cargo', ['new', target.projectName], {
    cwd: target.folderUri.fsPath,
  });
  const definition: vscode.TaskDefinition = { type: NEW_PROJECT_TASK_TYPE, language: 'rust' };
  const task = new vscode.Task(
    definition,
    vscode.workspace.getWorkspaceFolder(target.folderUri) ?? vscode.TaskScope.Workspace,
    `new ${target.projectName}`,
    'cargo',
    execution,
  );
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    clear: true,
  };
  return task;
}

/**
 * Cargo metadata for a chip callback, honouring `opts.probe` (v1.2.1 contract): a
 * probe:false ask is answered from the cache only, never by running cargo. undefined
 * means "no answer" — callers return an empty list / no default, which the orchestrator
 * treats as "unknown" and leaves the stored selection alone.
 */
async function metadataFor(
  project: ProjectInfo,
  opts?: { probe?: boolean },
): Promise<CargoMetadata | undefined> {
  return opts?.probe === false
    ? bridge.peekMetadata(project.manifestPath)
    : await bridge.fetchMetadata(project.manifestPath);
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
      unsetText: 'default', // unselected = host default target (no --target)
      clearValueId: HOST_DEFAULT_TARGET, // 'Host default' entry clears back to unset
      // F19 §13.4: installed targets show by default; the not-installed tail is marked
      // `secondary` so the QuickPick keeps it behind a toggle (secondaryToggle). Picking
      // a not-installed one runs `rustup target add` via onPick. The 'Host default' entry
      // returns to the unset state (no --target).
      secondaryToggle: 'Show installable targets',
      listItems: async (_project, opts) => {
        // probe:false answers from the cache only — `rustup target list` is a process.
        const targets = opts?.probe === false ? bridge.peekAllTargets() : await bridge.listAllTargets();
        if (!targets) {
          return [];
        }
        const items: ChipItem[] = [
          { id: HOST_DEFAULT_TARGET, label: 'Host default', description: 'no --target override' },
        ];
        for (const t of [...targets].sort((a, b) => Number(b.installed) - Number(a.installed))) {
          items.push({
            id: t.triple,
            label: t.triple,
            description: abbreviateTriple(t.triple),
            detail: t.installed ? undefined : 'not installed — select to add',
            secondary: !t.installed,
          });
        }
        return items;
      },
      onPick: async (_project, value) => {
        if (typeof value !== 'string') {
          return true;
        }
        const target = (await bridge.listAllTargets()).find((t) => t.triple === value);
        if (!target || target.installed) {
          return true; // already installed, or an unknown value — nothing to add
        }
        const install = 'Install';
        const choice = await vscode.window.showInformationMessage(
          `Rust target ${value} is not installed. Install it with rustup?`,
          install,
        );
        if (choice !== install) {
          return false;
        }
        const result = await vscode.window.withProgress(
          { location: vscode.ProgressLocation.Notification, title: `Installing Rust target ${value}…` },
          () => bridge.addTarget(value),
        );
        if (!result.ok) {
          void vscode.window.showErrorMessage(
            `DevSwitcher: failed to add target ${value}. ${result.stderr.trim()}`.trim(),
          );
          return false;
        }
        return true;
      },
      format: (value) => (typeof value === 'string' ? abbreviateTriple(value) : String(value)),
    },
    {
      id: 'features',
      icon: 'checklist',
      label: 'Features',
      multiSelect: true,
      // 'default'-only (or nothing) is the baseline → blank for selectedOnly (hidden
      // when a leaner bar is requested); any real feature makes the chip non-blank.
      isBlank: (value) => !Array.isArray(value) || value.every((f) => f === 'default'),
      // probe:false answers from the cache only — `cargo metadata` is a process, and
      // the switch/render/rescan paths run this for every project with stored state.
      listItems: async (project, opts) => {
        const metadata = await metadataFor(project, opts);
        if (!metadata) {
          return [];
        }
        return parseFeatures(metadata, project.name).names.map((name) => ({
          id: name,
          label: name, // 'default' is self-explanatory — no redundant description
        }));
      },
      format: (value) => formatFeatureCount(Array.isArray(value) ? value : []),
      defaultValue: async (project, opts) => {
        const metadata = await metadataFor(project, opts);
        if (!metadata) {
          return undefined;
        }
        return parseFeatures(metadata, project.name).hasDefault ? ['default'] : [];
      },
    },
    {
      id: 'target',
      icon: 'symbol-method',
      label: 'Target',
      required: true,
      listItems: async (project, opts) => {
        const metadata = await metadataFor(project, opts);
        return metadata ? parseBinTargets(metadata, project.name) : [];
      },
      defaultValue: async (project, opts) => {
        const metadata = await metadataFor(project, opts);
        return metadata ? defaultBinTarget(metadata, project.name) : undefined;
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

  async createDebugConfig(project, sel, config) {
    // §7.4 runs the build first, so this resolve reads paths from the warm cache (§8.6).
    const program = await this.resolveExecutable(project, sel, config);
    const target = typeof sel.values.target === 'string' ? sel.values.target : undefined;
    return buildLldbConfig(target, program, config.runArgs ?? [], cwdOf(project));
  },

  async resolveExecutable(project, sel, config) {
    // Build with JSON messages and read the artifact path cargo reports (DD-05) —
    // no path guessing. §7.4 leaves the cache warm, so this is fast.
    const overlayArgs = buildConfigArgs(config.compiler ?? {}, activeProfile(sel));
    const args = [
      ...assembleCargoArgs('build', project.name, sel, config, hasDefaultFeature(project), overlayArgs),
      '--message-format=json',
    ];
    // Same env as the build task so a custom target dir / RUSTFLAGS resolves the same artifact.
    const result = await execCapture('cargo', args, cwdOf(project), undefined, taskEnv(config));
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

  createProject: (target) => ({ kind: 'task', task: makeCargoNewTask(target) }),

  invalidateCache: (project) => bridge.invalidateCache(project?.manifestPath),

  // F19 (§13.5) — probe the Rust toolchain (cargo critical / rustup optional) and each
  // required extension. Doctor's pure core (core/diagnostics) turns these into ordered
  // items; TASK-018 will add rustup-target probes here.
  collectDiagnostics: async (): Promise<DiagnosticProbe[]> => {
    const tc = await bridge.checkToolchain();
    const probes: DiagnosticProbe[] = [
      {
        id: 'cargo',
        label: 'cargo',
        severity: 'critical',
        present: tc.cargo !== undefined,
        detail: tc.cargo,
        tier: 2,
        resolution: { kind: 'openUrl', url: 'https://rustup.rs' },
      },
      {
        id: 'rustup',
        label: 'rustup',
        severity: 'optional',
        present: tc.rustup !== undefined,
        detail: tc.rustup,
        tier: 2,
        resolution: { kind: 'openUrl', url: 'https://rustup.rs' },
      },
    ];
    for (const extId of cargoAdapter.requiredExtensions) {
      const ext = vscode.extensions.getExtension(extId);
      probes.push({
        id: extId,
        label: extensionLabel(extId),
        severity: 'optional',
        present: ext !== undefined,
        detail: ext?.packageJSON?.version as string | undefined,
        tier: 1,
        resolution: { kind: 'installExtension', extensionId: extId },
      });
    }
    return probes;
  },
};
