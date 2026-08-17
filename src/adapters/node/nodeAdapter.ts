import * as vscode from 'vscode';
import { dirname, join } from 'node:path';
import {
  ChipItem,
  DiagnosticProbe,
  InvocationConfig,
  LanguageAdapter,
  ProjectInfo,
  Selection,
} from '../../core/types';
import { nodeProjectFiles } from './nodeTemplate';
import {
  BUILD_SCRIPT,
  LOCKFILES,
  NodeBridge,
  PACKAGE_MANAGERS,
  PackageManager,
  assembleNodeArgs,
  buildNodeDebugConfig,
  nodeProjectName,
  parseScripts,
} from './nodeBridge';

const bridge = new NodeBridge();

const NODE_TASK_TYPE = 'devSwitcher.node';

/** Scripts the run/build defaults prefer, in order — the conventional Node run entry points. */
const PREFERRED_RUN_SCRIPTS = ['start', 'dev', 'serve'];

/** The directory a node command runs in — the folder holding package.json. */
function projectDirOf(project: ProjectInfo): string {
  return dirname(project.manifestPath);
}

/** The selected package manager (chip value), defaulting to npm. */
function resolvePackageManager(sel: Selection): PackageManager {
  const v = sel.values.packageManager;
  return typeof v === 'string' && (PACKAGE_MANAGERS as string[]).includes(v) ? (v as PackageManager) : 'npm';
}

/** The selected run script (chip value), or undefined when unset. */
function scriptOf(sel: Selection): string | undefined {
  return typeof sel.values.script === 'string' && sel.values.script.length > 0 ? sel.values.script : undefined;
}

/**
 * The invocation overlay's env for a Task. Node has no compiler/linker/output channel (tsc
 * flags live in tsconfig, ADR-013), so every overlay option (NODE_ENV, NODE_OPTIONS,
 * NODE_PATH, …) is already an env var (§8) — this just surfaces config.env when non-empty.
 * Mirrors go/python taskEnv.
 */
function taskEnv(config: InvocationConfig): Record<string, string> | undefined {
  const env: Record<string, string> = { ...(config.env ?? {}) };
  return Object.keys(env).length > 0 ? env : undefined;
}

/**
 * Build a `<pm> run <script>` Task. Node runs npm scripts through the package manager, which
 * on Windows is a `.cmd` shim (npm/pnpm/yarn) that a shell-less ProcessExecution cannot spawn
 * (Node 24 refuses `.cmd` without a shell — EINVAL). So this uses the **array form** of
 * ShellExecution: the shell resolves the `.cmd`, and VSCode quotes each arg individually, so
 * there is still no shell-injection surface — the security goal of NFR-002 is preserved via
 * array quoting rather than ProcessExecution (ADR-016, a documented NFR-002 exception like
 * NFR-002a). Build always runs the conventional `build` script; run runs the selected script
 * with runArgs forwarded after `--`. The build task carries the built-in `$tsc` matcher so a
 * TS build's compile errors populate the Problems panel.
 */
function makeNodeTask(action: 'build' | 'run', project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task {
  const pm = resolvePackageManager(sel);
  const script = action === 'build' ? BUILD_SCRIPT : (scriptOf(sel) ?? 'start');
  const args = assembleNodeArgs(script, action === 'run' ? (config.runArgs ?? []) : []);
  const execution = new vscode.ShellExecution(pm, args, {
    cwd: projectDirOf(project),
    env: taskEnv(config),
  });
  const definition: vscode.TaskDefinition = { type: NODE_TASK_TYPE, action, projectId: project.id };
  const task = new vscode.Task(
    definition,
    project.workspaceFolder,
    `${action} ${project.name}`,
    'node',
    execution,
    action === 'build' ? ['$tsc'] : undefined, // VSCode's built-in TypeScript matcher
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

/** Read package.json text (remote-safe via workspace.fs, ADR-008); '' when unreadable. */
async function readManifestText(manifestPath: string): Promise<string> {
  try {
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(manifestPath));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return ''; // unreadable package.json — parsers degrade to empty
  }
}

/** True when a file exists at the path (remote-safe via workspace.fs, ADR-008). */
async function fileExists(fsPath: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(fsPath));
    return true;
  } catch {
    return false;
  }
}

/** The package manager to use for a project: the first lockfile that exists, else npm. */
async function detectPackageManager(projectDir: string): Promise<PackageManager> {
  for (const { file, pm } of LOCKFILES) {
    if (await fileExists(join(projectDir, file))) {
      return pm;
    }
  }
  return 'npm';
}

/**
 * Node.js / TypeScript adapter (MS-016, v0.6.0 — INT-001 6th language). Detection and both
 * chips are real: `package.json` projects list via a glob scan, and the **script** chip
 * reads the npm `scripts` map (the run/build target — a Node project's "what to run" is a
 * script, not a compiled target). The **packageManager** chip auto-detects npm/pnpm/yarn
 * from the lockfile and lets the user override. build/run inject the selected script as
 * `<pm> run <script>` (TASK-047); debug launches that same script under the bundled
 * js-debug (`type: 'node'`, TASK-048) — so requiredExtensions is empty. TypeScript's tsc
 * step lives inside the project's own `build` script (ADR-013: the extension never edits
 * tsconfig.json). F20 project creation writes package.json + index.js (D-13).
 */
export const nodeAdapter: LanguageAdapter = {
  id: 'node',
  displayName: 'Node.js / TypeScript',
  // Build button runs the `build` script; debug opts out of the pre-build (debugRequiresBuild:
  // false) — Node debugs the npm script directly and npm's prestart/prebuild hooks build (ADR-016).
  actions: { build: true, debugRequiresBuild: false },
  manifestGlobs: ['**/package.json'],
  requiredExtensions: [], // js-debug is bundled with VSCode — nothing to install
  canCreateProject: true,
  configCategories: ['env', 'runArgs'], // tsc flags live in tsconfig (read-only, ADR-013): no compiler/linker/output
  // Node has no compiler-flag channel, so every option is an env var (§8), keyed by its
  // label = the variable name (applyOption), like python/go's env options.
  optionCatalog: [
    {
      id: 'nodeenv',
      category: 'env',
      label: 'NODE_ENV',
      description: 'The environment name many libraries branch on — e.g. "production" disables dev-only checks and enables optimizations.',
      example: 'production',
      injectsAs: 'NODE_ENV=<value>',
      type: 'string',
      injection: 'env',
    },
    {
      id: 'nodeoptions',
      category: 'env',
      label: 'NODE_OPTIONS',
      description: 'Flags passed to the node runtime itself — e.g. raise the heap (--max-old-space-size) or enable source maps (--enable-source-maps).',
      example: '--max-old-space-size=4096',
      injectsAs: 'NODE_OPTIONS=<value>',
      docUrl: 'https://nodejs.org/api/cli.html#node_optionsoptions',
      type: 'string',
      injection: 'env',
    },
    {
      id: 'nodepath',
      category: 'env',
      label: 'NODE_PATH',
      description: 'Extra module-resolution directories — the Node analogue of PYTHONPATH (§8).',
      example: './src:./libs',
      injectsAs: 'NODE_PATH=<value>',
      docUrl: 'https://nodejs.org/api/modules.html#loading-from-the-global-folders',
      type: 'string',
      injection: 'env',
    },
  ],

  chips: [
    {
      id: 'script',
      icon: 'symbol-method',
      label: 'Script',
      required: true,
      // The npm script to run/build/debug. Single-script projects auto-select; otherwise
      // the conventional run entry (start → dev → serve) is preferred as the default.
      listItems: async (project) => {
        const scripts = parseScripts(await readManifestText(project.manifestPath));
        return scripts.map((s): ChipItem => ({ id: s.name, label: s.name, description: s.command }));
      },
      defaultValue: async (project) => {
        const scripts = parseScripts(await readManifestText(project.manifestPath));
        const names = scripts.map((s) => s.name);
        const preferred = PREFERRED_RUN_SCRIPTS.find((n) => names.includes(n));
        if (preferred) {
          return preferred;
        }
        return names.length === 1 ? names[0] : undefined;
      },
    },
    {
      id: 'packageManager',
      icon: 'package',
      label: 'Package Manager',
      // npm / pnpm / yarn. Auto-detected from the lockfile (default), overridable here.
      listItems: async () => PACKAGE_MANAGERS.map((pm): ChipItem => ({ id: pm, label: pm })),
      defaultValue: async (project) => detectPackageManager(projectDirOf(project)),
    },
  ],

  async listProjects(manifests) {
    // One package.json = one switcher entry. The scan already excludes node_modules /
    // .vscode-test (adapterRegistry EXCLUDE_GLOB); filter again defensively so a nested
    // dependency's or a bundled tool's package.json can never masquerade as a project.
    const projects: ProjectInfo[] = [];
    for (const uri of manifests) {
      const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
      if (/(^|\/)(node_modules|\.vscode-test)\//.test(rel)) {
        continue;
      }
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (!folder || projects.some((p) => p.manifestPath === uri.fsPath)) {
        continue;
      }
      const text = await readManifestText(uri.fsPath);
      projects.push({
        id: `node:${rel}`,
        name: nodeProjectName(text, uri.fsPath),
        adapterId: 'node',
        manifestPath: uri.fsPath,
        workspaceFolder: folder,
      });
    }
    return projects;
  },

  createBuildTask(project, sel, config) {
    // Build button = `<pm> run build` (TS's tsc lives in the project's build script).
    return makeNodeTask('build', project, sel, config);
  },

  createRunTask(project, sel, config) {
    // `<pm> run <script>` — a single self-contained command (no runRequiresBuild).
    return makeNodeTask('run', project, sel, config);
  },

  async createDebugConfig(project, sel, config) {
    // Debug the selected npm script under the bundled js-debug (Human: debug the script).
    // runtimeExecutable = the package manager (js-debug resolves the .cmd shim); the debug
    // flow skipped the pre-build (debugRequiresBuild:false), so the script's own lifecycle
    // (or a prior Build) produces anything it needs. requiredExtensions is empty.
    const pm = resolvePackageManager(sel);
    const script = scriptOf(sel) ?? 'start';
    return buildNodeDebugConfig(project.name, pm, script, config.runArgs ?? [], projectDirOf(project), taskEnv(config));
  },

  async resolveExecutable(project, _sel, _config) {
    // Node debug launches the package manager (runtimeExecutable), not a pre-built binary,
    // so there is no compiled artifact to resolve. Return the package.json `main` entry
    // (default index.js) as a best-effort program path for callers that want "the program".
    const text = await readManifestText(project.manifestPath);
    let main = 'index.js';
    try {
      const pkg = JSON.parse(text) as { main?: unknown };
      if (typeof pkg.main === 'string' && pkg.main.trim().length > 0) {
        main = pkg.main.trim();
      }
    } catch {
      // unparseable package.json — keep the index.js default
    }
    return join(projectDirOf(project), main);
  },

  createProject: (target) => ({ kind: 'files', files: nodeProjectFiles(target.projectName) }),
  invalidateCache: (_project) => bridge.invalidateCache(),

  // F19 (§13.5) — probe the Node toolchain (critical). No required extension: the debugger
  // (js-debug) is bundled with VSCode. Doctor's pure core (core/diagnostics) orders these.
  collectDiagnostics: async (): Promise<DiagnosticProbe[]> => {
    const tc = await bridge.checkToolchain();
    return [
      {
        id: 'node',
        label: 'Node.js',
        severity: 'critical',
        present: tc.ok,
        detail: tc.node, // e.g. 'v20.11.0'
        tier: 2,
        resolution: { kind: 'openUrl', url: 'https://nodejs.org/en/download' },
      },
    ];
  },
};
