import * as vscode from 'vscode';
import { dirname } from 'node:path';
import {
  DevSwitcherError,
  DiagnosticProbe,
  InvocationConfig,
  LanguageAdapter,
  ProjectInfo,
  Selection,
} from '../../core/types';
import { goProjectFiles } from './goTemplate';
import { GoBridge, assembleGoArgs, buildDelveConfig, goProjectName, parseModulePath } from './goBridge';

const bridge = new GoBridge();

/** Friendly names for the extensions Doctor reports (F19); falls back to the id. */
const EXTENSION_LABELS: Record<string, string> = { 'golang.go': 'Go' };
const extensionLabel = (id: string): string => EXTENSION_LABELS[id] ?? id;

const GO_TASK_TYPE = 'devSwitcher.go';

/** The module directory a `go` command runs in — the folder holding go.mod. */
function moduleDirOf(project: ProjectInfo): string {
  return dirname(project.manifestPath);
}

/** The selected target main-package import path, defaulting to the module root (`.`). */
function targetOf(sel: Selection): string {
  return typeof sel.values.target === 'string' && sel.values.target.length > 0 ? sel.values.target : '.';
}

/**
 * The invocation overlay's env for a Task. Go has no outputDir/RUSTFLAGS analogue — every
 * env-category option (CGO_ENABLED, GOFLAGS, …) is already an env var (§8), so this just
 * surfaces config.env when non-empty. Mirrors dotnet/python taskEnv.
 */
function taskEnv(config: InvocationConfig): Record<string, string> | undefined {
  const env: Record<string, string> = { ...(config.env ?? {}) };
  return Object.keys(env).length > 0 ? env : undefined;
}

/** Build a ProcessExecution-backed `go build`/`go run` Task (no shell, array args — NFR-002). */
function makeGoTask(action: 'build' | 'run', project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task {
  const args = assembleGoArgs(action, targetOf(sel), config);
  const execution = new vscode.ProcessExecution('go', args, {
    cwd: moduleDirOf(project),
    env: taskEnv(config),
  });
  const definition: vscode.TaskDefinition = { type: GO_TASK_TYPE, action, projectId: project.id };
  const task = new vscode.Task(
    definition,
    project.workspaceFolder,
    `${action} ${project.name}`,
    'go',
    execution,
    action === 'build' ? ['$devswitcher-go'] : undefined, // owned matcher (package.json), no extension needed
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
 * target-only) — build flags (-ldflags/-race/-tags) live in the settings-page catalog.
 * build/run inject the compiler overlay as `go build`/`go run` flags; debug launches via
 * delve (golang.go, `type: 'go'`). F20 project creation writes go.mod + main.go (D-13). The
 * extension never edits them (ADR-013).
 */
export const goAdapter: LanguageAdapter = {
  id: 'go',
  displayName: 'Go',
  actions: { build: true },
  manifestGlobs: ['**/go.mod'],
  requiredExtensions: ['golang.go'],
  canCreateProject: true,
  configCategories: ['compiler', 'env', 'runArgs'], // no linker/output in idiomatic Go
  // Go injects build flags on the command line (§8). Compiler options are keyed by id
  // (goBuildFlags); the env option is keyed by its label = the variable name (like python).
  optionCatalog: [
    {
      id: 'ldflags',
      category: 'compiler',
      label: 'Linker flags (-ldflags)',
      description: 'Flags passed to the Go linker. Common: "-s -w" strips the symbol table and DWARF for a smaller binary.',
      example: '-s -w',
      injectsAs: 'go build -ldflags "<value>"',
      docUrl: 'https://pkg.go.dev/cmd/link',
      type: 'string',
      injection: 'flag',
    },
    {
      id: 'gcflags',
      category: 'compiler',
      label: 'Compiler flags (-gcflags)',
      description: 'Flags passed to the Go compiler. Common: "all=-N -l" disables optimizations and inlining for a smoother debug experience.',
      example: 'all=-N -l',
      injectsAs: 'go build -gcflags "<value>"',
      docUrl: 'https://pkg.go.dev/cmd/compile',
      type: 'string',
      injection: 'flag',
    },
    {
      id: 'tags',
      category: 'compiler',
      label: 'Build tags (-tags)',
      description: 'Comma-separated build constraints that select tagged files (e.g. dev, integration).',
      example: 'dev,integration',
      injectsAs: 'go build -tags <value>',
      docUrl: 'https://pkg.go.dev/go/build#hdr-Build_Constraints',
      type: 'string',
      injection: 'flag',
    },
    {
      id: 'race',
      category: 'compiler',
      label: 'Race detector (-race)',
      description: 'Builds with the data-race detector enabled. Slower, but catches concurrent access bugs.',
      example: 'true',
      injectsAs: 'go build -race',
      docUrl: 'https://go.dev/doc/articles/race_detector',
      type: 'bool',
      defaultValue: false,
      injection: 'flag',
    },
    {
      id: 'trimpath',
      category: 'compiler',
      label: 'Trim paths (-trimpath)',
      description: 'Removes local filesystem paths from the compiled binary for reproducible builds.',
      example: 'true',
      injectsAs: 'go build -trimpath',
      type: 'bool',
      defaultValue: false,
      injection: 'flag',
    },
    {
      id: 'cgo',
      category: 'env',
      // env options are keyed by `label` (applyOption), so the label IS the variable name.
      label: 'CGO_ENABLED',
      description: 'Set to 0 for a pure-Go static build (no C toolchain); 1 to enable cgo.',
      example: '0',
      injectsAs: 'CGO_ENABLED=<value>',
      type: 'string',
      injection: 'env',
    },
  ],

  chips: [
    {
      id: 'target',
      icon: 'symbol-method',
      label: 'Target',
      required: true,
      // The main package to build/run/debug. Single-main modules auto-select; a module with
      // several cmd/ mains lists each by import path.
      // probe:false answers from the cache only — listing main packages runs `go list`,
      // and the switch/render/rescan paths must not spawn a process per project.
      listItems: async (project, opts) => {
        const dir = moduleDirOf(project);
        const pkgs =
          opts?.probe === false ? bridge.peekMainPackages(dir) : await bridge.listMainPackages(dir);
        return (pkgs ?? []).map((p) => ({
          id: p.importPath,
          label: p.importPath.split('/').pop() ?? p.importPath,
          description: p.importPath,
        }));
      },
      defaultValue: async (project, opts) => {
        const dir = moduleDirOf(project);
        const pkgs =
          opts?.probe === false ? bridge.peekMainPackages(dir) : await bridge.listMainPackages(dir);
        return pkgs?.length === 1 ? pkgs[0].importPath : undefined;
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

  createBuildTask(project, sel, config) {
    return makeGoTask('build', project, sel, config);
  },

  createRunTask(project, sel, config) {
    // `go run` compiles and runs in one command (single-command run, no runRequiresBuild).
    return makeGoTask('run', project, sel, config);
  },

  async createDebugConfig(project, sel, config) {
    // delve mode:'debug' compiles the target package itself, so program = the package dir
    // (resolveExecutable). The debug flow (§7.4) has already ensured golang.go and run a
    // build. Pass build tags (not the release ldflags, which would strip debug symbols) and
    // the env overlay so a picked CGO_ENABLED etc. carries into the debug session.
    const program = await this.resolveExecutable(project, sel, config);
    const tags = typeof config.compiler?.tags === 'string' ? config.compiler.tags.trim() : '';
    const buildFlags = tags ? `-tags ${tags}` : undefined;
    return buildDelveConfig(project.name, program, config.runArgs ?? [], moduleDirOf(project), taskEnv(config), buildFlags);
  },

  async resolveExecutable(project, sel, _config) {
    // For delve `mode: debug` the "program" is the target package's directory (delve builds
    // it), not a pre-built binary — so resolve the selected main package's dir from `go list`.
    const target = typeof sel.values.target === 'string' ? sel.values.target : undefined;
    if (!target) {
      throw new DevSwitcherError('EXECUTABLE_NOT_FOUND', `No target package selected for ${project.name}.`); // E6
    }
    const pkgs = await bridge.listMainPackages(moduleDirOf(project));
    const pkg = pkgs.find((p) => p.importPath === target);
    if (!pkg) {
      throw new DevSwitcherError('EXECUTABLE_NOT_FOUND', `Target package not found: ${target}.`); // E6
    }
    return pkg.dir;
  },

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
