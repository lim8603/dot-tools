import * as vscode from 'vscode';
import { dirname } from 'node:path';
import { DiagnosticProbe, LanguageAdapter, ProjectInfo } from '../../core/types';
import { notImplemented } from '../notImplemented';
import { goProjectFiles } from './goTemplate';
import { GoBridge, goProjectName, parseModulePath } from './goBridge';

const bridge = new GoBridge();

/** Friendly names for the extensions Doctor reports (F19); falls back to the id. */
const EXTENSION_LABELS: Record<string, string> = { 'golang.go': 'Go' };
const extensionLabel = (id: string): string => EXTENSION_LABELS[id] ?? id;

/** The module directory a `go` command runs in — the folder holding go.mod. */
function moduleDirOf(project: ProjectInfo): string {
  return dirname(project.manifestPath);
}

/** Read + parse the go.mod module path (remote-safe via workspace.fs, ADR-008). */
async function readModulePath(manifestPath: string): Promise<string | undefined> {
  try {
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(manifestPath));
    return parseModulePath(new TextDecoder('utf-8').decode(bytes));
  } catch {
    return undefined; // unreadable go.mod — fall back to the folder name
  }
}

/**
 * Go adapter (MS-015, v0.5.0 — INT-001 5th language). Detection + the target chip are real:
 * `go.mod` modules list via a glob scan and GoBridge reads the module's `main` packages with
 * `go list`. Go has no native Debug/Release profile, so the only chip is `target` (Human:
 * target-only) — build flags (-ldflags/-race/-tags) live in the settings-page catalog
 * (TASK-044). build/run injection lands in TASK-044; debug (delve) in TASK-045. F20 project
 * creation writes go.mod + main.go (D-13). The extension never edits them (ADR-013).
 */
export const goAdapter: LanguageAdapter = {
  id: 'go',
  displayName: 'Go',
  actions: { build: true },
  manifestGlobs: ['**/go.mod'],
  requiredExtensions: ['golang.go'],
  canCreateProject: true,
  optionCatalog: [], // build-flag catalog (-ldflags/-tags/-race/env) lands in TASK-044
  configCategories: [], // TASK-044

  chips: [
    {
      id: 'target',
      icon: 'symbol-method',
      label: 'Target',
      required: true,
      // The main package to build/run/debug. Single-main modules auto-select; a module with
      // several cmd/ mains lists each by import path.
      listItems: async (project) => {
        const pkgs = await bridge.listMainPackages(moduleDirOf(project));
        return pkgs.map((p) => ({
          id: p.importPath,
          label: p.importPath.split('/').pop() ?? p.importPath,
          description: p.importPath,
        }));
      },
      defaultValue: async (project) => {
        const pkgs = await bridge.listMainPackages(moduleDirOf(project));
        return pkgs.length === 1 ? pkgs[0].importPath : undefined;
      },
    },
  ],

  async listProjects(manifests) {
    // One go.mod = one switcher entry (a module). Skip vendored module copies. The name is
    // the module path's last segment (read from go.mod), else the folder name.
    const projects: ProjectInfo[] = [];
    for (const uri of manifests) {
      const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
      if (/(^|\/)vendor\//.test(rel)) {
        continue;
      }
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (!folder || projects.some((p) => p.manifestPath === uri.fsPath)) {
        continue;
      }
      const modulePath = await readModulePath(uri.fsPath);
      projects.push({
        id: `go:${rel}`,
        name: goProjectName(modulePath, uri.fsPath),
        adapterId: 'go',
        manifestPath: uri.fsPath,
        workspaceFolder: folder,
      });
    }
    return projects;
  },

  // build/run injection lands in TASK-044; debug (delve) in TASK-045.
  createBuildTask: (_project, _sel, _config) => notImplemented('GoAdapter.createBuildTask', 'TASK-044'),
  createRunTask: (_project, _sel, _config) => notImplemented('GoAdapter.createRunTask', 'TASK-044'),
  createDebugConfig: (_project, _sel, _config) => notImplemented('GoAdapter.createDebugConfig', 'TASK-045'),
  resolveExecutable: (_project, _sel, _config) => notImplemented('GoAdapter.resolveExecutable', 'TASK-044'),

  createProject: (target) => ({ kind: 'files', files: goProjectFiles(target.projectName) }),
  invalidateCache: (project) => bridge.invalidateCache(project ? moduleDirOf(project) : undefined),

  // F19 (§13.5) — probe the Go toolchain (critical) and the Go extension (optional, for
  // delve debugging). Doctor's pure core (core/diagnostics) turns these into ordered items.
  collectDiagnostics: async (): Promise<DiagnosticProbe[]> => {
    const tc = await bridge.checkToolchain();
    const probes: DiagnosticProbe[] = [
      {
        id: 'go',
        label: 'Go',
        severity: 'critical',
        present: tc.ok,
        detail: tc.go, // e.g. 'go version go1.22.0 windows/amd64'
        tier: 2,
        resolution: { kind: 'openUrl', url: 'https://go.dev/dl/' },
      },
    ];
    for (const extId of goAdapter.requiredExtensions) {
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
