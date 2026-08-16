import * as vscode from 'vscode';
import { dirname, join } from 'node:path';
import { ChipItem, LanguageAdapter, ProjectInfo } from '../../core/types';
import { notImplemented } from '../notImplemented';
import { pythonProjectFiles } from './pythonTemplate';
import {
  PythonBridge,
  SYSTEM_INTERPRETERS,
  VENV_DIRS,
  pythonProjectName,
  venvInterpreter,
} from './pythonBridge';

const bridge = new PythonBridge();

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
  ],

  chips: [
    {
      id: 'environment',
      icon: 'server-environment',
      label: 'Environment',
      // Project-local venvs first, then system interpreters — self-discovered (no
      // dependency on the Python extension's interpreter picker).
      listItems: async (project) => {
        const items: ChipItem[] = [];
        const projectDir = dirname(project.manifestPath);
        for (const venv of VENV_DIRS) {
          const interpreter = venvInterpreter(join(projectDir, venv), process.platform);
          if (await fileExists(interpreter)) {
            const version = await bridge.detectVersion(interpreter);
            items.push({ id: interpreter, label: venv, description: version ?? 'venv' });
          }
        }
        for (const command of SYSTEM_INTERPRETERS) {
          const version = await bridge.detectVersion(command);
          if (version) {
            items.push({ id: command, label: command, description: version });
          }
        }
        return items;
      },
      defaultValue: async () => (await bridge.checkToolchain()).command,
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
  createRunTask: (_project, _sel, _config) => notImplemented('PythonAdapter.createRunTask', 'TASK-031'),
  createDebugConfig: (_project, _sel, _config) => notImplemented('PythonAdapter.createDebugConfig', 'TASK-032'),
  resolveExecutable: (_project, _sel, _config) => notImplemented('PythonAdapter.resolveExecutable', 'TASK-031'),
  createProject: (target) => ({ kind: 'files', files: pythonProjectFiles(target.projectName) }),
  invalidateCache: (_project) => bridge.invalidateCache(),
  collectDiagnostics: () => Promise.resolve([]), // real interpreter/extension checks land in TASK-032
};
