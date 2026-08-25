import * as vscode from 'vscode';
import { dirname, join } from 'node:path';
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
import { pythonProjectFiles } from './pythonTemplate';
import {
  PythonBridge,
  SYSTEM_INTERPRETERS,
  VENV_DIRS,
  assemblePythonArgs,
  buildDebugpyConfig,
  interpreterKey,
  pythonProjectName,
  resolveInterpreter,
  venvInterpreter,
} from './pythonBridge';

const bridge = new PythonBridge();

const PYTHON_TASK_TYPE = 'devSwitcher.python';

/** Friendly names for the extensions Doctor reports (F19); falls back to the id. */
const EXTENSION_LABELS: Record<string, string> = { 'ms-python.python': 'Python' };
const extensionLabel = (id: string): string => EXTENSION_LABELS[id] ?? id;

/** Directory a python command runs in — the project directory (next to pyproject.toml). */
function cwdOf(project: ProjectInfo): string {
  return dirname(project.manifestPath);
}

/**
 * The invocation overlay's env for a Task. Python has no outputDir / RUSTFLAGS analogue —
 * every overlay option (PYTHONPATH, PYTHONOPTIMIZE, …) is already an env var (§8), so this
 * just surfaces config.env when non-empty. Mirrors dotnet's taskEnv.
 */
function taskEnv(config: InvocationConfig): Record<string, string> | undefined {
  const env: Record<string, string> = { ...(config.env ?? {}) };
  return Object.keys(env).length > 0 ? env : undefined;
}

/**
 * Build a ProcessExecution-backed `python <script> [args]` run Task (no shell, array
 * args — NFR-002). The interpreter comes from the environment chip (venv path or system
 * command, `python` fallback); the script is the target chip's `.py` file; runArgs follow
 * the script (F16). No problemMatcher — an interpreted run has no compile diagnostics.
 */
function makePythonRunTask(project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task {
  const interpreter = resolveInterpreter(sel.values.environment);
  const script = typeof sel.values.target === 'string' ? sel.values.target : 'main.py';
  const args = assemblePythonArgs(script, config.runArgs ?? []);
  const execution = new vscode.ProcessExecution(interpreter, args, {
    cwd: cwdOf(project),
    env: taskEnv(config),
  });
  const definition: vscode.TaskDefinition = { type: PYTHON_TASK_TYPE, action: 'run', projectId: project.id };
  const task = new vscode.Task(
    definition,
    project.workspaceFolder,
    `run ${project.name}`,
    'python',
    execution,
  );
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    clear: true,
  };
  return task;
}

/** True when a file exists (remote-safe via workspace.fs, ADR-008). */
async function fileExists(fsPath: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(fsPath));
    return true;
  } catch {
    return false;
  }
}

/** The `.py` files at a project root (next to pyproject.toml) — the run-target candidates. */
async function pyFilesIn(projectDir: string): Promise<string[]> {
  let entries: [string, vscode.FileType][] = [];
  try {
    entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(projectDir));
  } catch {
    return []; // unreadable dir
  }
  return entries
    .filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.py'))
    .map(([name]) => name)
    .sort();
}

/**
 * Python adapter (MS-011, C-7) — the framework litmus (interface_contract §6/§8).
 *
 * Interpreted: actions.build === false, so the status bar drops the Build button and the
 * settings page keeps only env + runArgs (no compiler/linker/output). Chips are
 * environment (project venvs + system interpreters, self-discovered — no Python-extension
 * dependency) and target (a .py file at the project root, default main.py). If the UI
 * honors these declarations with no Python-specific code, the chip/settings frameworks are
 * proven language-agnostic (INV-2). run/debug (debugpy) land in TASK-031/032. F20 project
 * creation writes pyproject.toml + main.py (D-13). The extension never edits them (ADR-013).
 */
export const pythonAdapter: LanguageAdapter = {
  id: 'python',
  displayName: 'Python',
  actions: { build: false },
  manifestGlobs: ['**/pyproject.toml'],
  requiredExtensions: ['ms-python.python'],
  canCreateProject: true,
  configCategories: ['env', 'runArgs'], // litmus: no compiler/linker/output
  optionCatalog: [
    {
      id: 'pythonpath',
      category: 'env',
      label: 'PYTHONPATH',
      description: 'Extra module search paths — the interpreted-language stand-in for include paths (§8).',
      example: './src:./libs',
      injectsAs: 'PYTHONPATH=<value>',
      type: 'string',
      injection: 'env',
    },
    {
      id: 'pydontwritebytecode',
      category: 'env',
      // env options are keyed by `label` (applyOption), so the label IS the variable name.
      label: 'PYTHONDONTWRITEBYTECODE',
      description: 'Set to 1 to stop Python writing .pyc bytecode cache files.',
      example: '1',
      injectsAs: 'PYTHONDONTWRITEBYTECODE=<value>',
      type: 'string',
      injection: 'env',
    },
    {
      id: 'pyoptimize',
      category: 'env',
      // Env form of the `-O` interpreter flag — injected as env so injection stays uniform
      // (Python has no compiler-flag channel; §8). The label IS the variable name.
      label: 'PYTHONOPTIMIZE',
      description: 'Optimization level (like python -O): 1 removes assert statements, 2 also strips docstrings.',
      example: '1',
      injectsAs: 'PYTHONOPTIMIZE=<value>',
      type: 'string',
      injection: 'env',
    },
  ],

  chips: [
    {
      id: 'environment',
      icon: 'server-environment',
      label: 'Environment',
      // Project-local venvs first, then system interpreters — self-discovered (no
      // dependency on the Python extension's interpreter picker). System commands are
      // deduped by their real sys.executable so PATH aliases that resolve to one
      // interpreter (python vs python3 vs py) list only once, highest-preference first.
      // Probing costs one process per candidate (every venv dir plus every system
      // interpreter), so a probe:false ask — project switch, settings-page render, the
      // rescan bookkeeping pass — answers from the cache only. Nothing cached yet is a
      // valid "no answer": the chip stays as it was until the picker or an action asks
      // for real. (v1.2.1 contract; the same rule CMake follows for configure.)
      listItems: async (project, opts) => {
        const probing = opts?.probe !== false;
        const items: ChipItem[] = [];
        const seen = new Set<string>(); // real interpreter paths already listed
        const projectDir = dirname(project.manifestPath);
        for (const venv of VENV_DIRS) {
          const interpreter = venvInterpreter(join(projectDir, venv), process.platform);
          if (!probing) {
            const cached = bridge.peekInterpreter(interpreter);
            if (cached) {
              seen.add(interpreterKey(cached.executable, process.platform));
              items.push({ id: interpreter, label: venv, description: cached.version });
            }
            continue; // fileExists is cheap but pointless without a probe result to show
          }
          if (await fileExists(interpreter)) {
            const info = await bridge.detectInterpreter(interpreter);
            seen.add(interpreterKey(info?.executable ?? interpreter, process.platform));
            items.push({ id: interpreter, label: venv, description: info?.version ?? 'venv' });
          }
        }
        for (const command of SYSTEM_INTERPRETERS) {
          const info = probing
            ? await bridge.detectInterpreter(command)
            : (bridge.peekInterpreter(command) ?? undefined);
          if (!info) {
            continue;
          }
          const key = interpreterKey(info.executable, process.platform);
          if (seen.has(key)) {
            continue; // same interpreter as an entry already listed (alias or the active venv)
          }
          seen.add(key);
          items.push({ id: command, label: command, description: info.version });
        }
        return items;
      },
      defaultValue: async (_project, opts) => {
        if (opts?.probe === false) {
          // Answer only if a system interpreter is already known — checkToolchain probes.
          const known = SYSTEM_INTERPRETERS.find((c) => bridge.peekInterpreter(c));
          return known;
        }
        return (await bridge.checkToolchain()).command;
      },
    },
    {
      id: 'target',
      icon: 'symbol-method',
      label: 'Target',
      required: true,
      // The .py file to run/debug. Single-file projects auto-select; main.py preferred.
      listItems: async (project) => {
        const files = await pyFilesIn(dirname(project.manifestPath));
        return files.map((name) => ({ id: name, label: name }));
      },
      defaultValue: async (project) => {
        const files = await pyFilesIn(dirname(project.manifestPath));
        if (files.includes('main.py')) {
          return 'main.py';
        }
        return files.length === 1 ? files[0] : undefined;
      },
    },
  ],

  async listProjects(manifests) {
    // One pyproject.toml = one switcher entry. Skip virtualenv / cache trees so a venv's
    // own pyproject files never masquerade as projects.
    const projects: ProjectInfo[] = [];
    for (const uri of manifests) {
      const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
      if (/(^|\/)(\.venv|venv|env|node_modules|__pycache__|site-packages)\//.test(rel)) {
        continue;
      }
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (!folder || projects.some((p) => p.manifestPath === uri.fsPath)) {
        continue;
      }
      projects.push({
        id: `python:${rel}`,
        name: pythonProjectName(uri.fsPath),
        adapterId: 'python',
        manifestPath: uri.fsPath,
        workspaceFolder: folder,
      });
    }
    return projects;
  },

  // actions.build === false → createBuildTask is never called (Python has no build step).
  createBuildTask: (_project, _sel, _config) => notImplemented('PythonAdapter.createBuildTask (no build concept)', 'n/a'),

  createRunTask(project, sel, config) {
    return makePythonRunTask(project, sel, config);
  },

  async createDebugConfig(project, sel, config) {
    // No build (build === false), so the orchestrator (§7.4) skips straight here.
    // program = the target script (resolveExecutable validates it exists); python = the
    // same interpreter the run task uses so a picked venv debugs where it runs; env carries
    // the overlay (PYTHONPATH, …) into the debug session. debugpy ships with ms-python.python.
    const program = await this.resolveExecutable(project, sel, config);
    const python = resolveInterpreter(sel.values.environment);
    return buildDebugpyConfig(project.name, program, python, config.runArgs ?? [], cwdOf(project), taskEnv(config));
  },

  async resolveExecutable(project, sel, _config) {
    // Interpreted: no build, no compiled artifact. The "executable" the debug flow (§7.4)
    // launches is the target .py script itself (debugpy's `program`; the interpreter is the
    // separate `python` field, TASK-032). Resolve its absolute path and confirm it exists.
    const script = typeof sel.values.target === 'string' ? sel.values.target : undefined;
    if (!script) {
      throw new DevSwitcherError('EXECUTABLE_NOT_FOUND', `No target script selected for ${project.name}.`); // E6
    }
    const abs = join(cwdOf(project), script);
    if (!(await fileExists(abs))) {
      throw new DevSwitcherError('EXECUTABLE_NOT_FOUND', `Target script not found: ${abs}.`); // E6
    }
    return abs;
  },

  createProject: (target) => ({ kind: 'files', files: pythonProjectFiles(target.projectName) }),
  invalidateCache: (_project) => bridge.invalidateCache(),

  // F19 (§13.5) — probe the interpreter (critical) and the Python extension (optional, for
  // debugpy). Doctor's pure core (core/diagnostics) turns these into ordered items.
  collectDiagnostics: async (): Promise<DiagnosticProbe[]> => {
    const tc = await bridge.checkToolchain();
    const probes: DiagnosticProbe[] = [
      {
        id: 'python',
        label: 'Python',
        severity: 'critical',
        present: tc.ok,
        detail: tc.python, // e.g. 'Python 3.12.13'
        tier: 2,
        resolution: { kind: 'openUrl', url: 'https://www.python.org/downloads/' },
      },
    ];
    for (const extId of pythonAdapter.requiredExtensions) {
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
