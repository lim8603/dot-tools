import * as vscode from 'vscode';
import { dirname, join } from 'node:path';
import {
  ChipItem,
  DiagnosticProbe,
  LanguageAdapter,
  ProjectInfo,
} from '../../core/types';
import { notImplemented } from '../notImplemented';
import { nodeProjectFiles } from './nodeTemplate';
import {
  LOCKFILES,
  NodeBridge,
  PACKAGE_MANAGERS,
  PackageManager,
  nodeProjectName,
  parseScripts,
} from './nodeBridge';

const bridge = new NodeBridge();

/** Scripts the run/build defaults prefer, in order — the conventional Node run entry points. */
const PREFERRED_RUN_SCRIPTS = ['start', 'dev', 'serve'];

/** The directory a node command runs in — the folder holding package.json. */
function projectDirOf(project: ProjectInfo): string {
  return dirname(project.manifestPath);
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
  actions: { build: true }, // Build button runs the `build` script (`<pm> run build`), TASK-047
  manifestGlobs: ['**/package.json'],
  requiredExtensions: [], // js-debug is bundled with VSCode — nothing to install
  canCreateProject: true,
  configCategories: ['env', 'runArgs'], // tsc flags live in tsconfig (read-only, ADR-013): no compiler/linker/output
  optionCatalog: [], // TASK-047 (NODE_ENV / NODE_OPTIONS env + runArgs)

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
    // One package.json = one switcher entry. The scan already excludes node_modules
    // (adapterRegistry EXCLUDE_GLOB); filter again defensively so a nested dependency's
    // package.json can never masquerade as a project.
    const projects: ProjectInfo[] = [];
    for (const uri of manifests) {
      const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
      if (/(^|\/)node_modules\//.test(rel)) {
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

  // build/run/debug land in TASK-047/048; detection + chips + creation + Doctor first (TASK-046).
  createBuildTask: (_project, _sel, _config) => notImplemented('NodeAdapter.createBuildTask', 'TASK-047'),
  createRunTask: (_project, _sel, _config) => notImplemented('NodeAdapter.createRunTask', 'TASK-047'),
  createDebugConfig: (_project, _sel, _config) => notImplemented('NodeAdapter.createDebugConfig', 'TASK-048'),
  resolveExecutable: (_project, _sel, _config) => notImplemented('NodeAdapter.resolveExecutable', 'TASK-047'),

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
