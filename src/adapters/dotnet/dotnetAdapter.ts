import * as vscode from 'vscode';
import { LanguageAdapter, NEW_PROJECT_TASK_TYPE, NewProjectTarget } from '../../core/types';
import { notImplemented } from '../notImplemented';

/** `dotnet new console -o <name>` in the target folder (F20, TASK-023) — the native
 *  template lands in a `<name>/` sub-folder. ProcessExecution, no shell (NFR-002). */
function makeDotnetNewTask(target: NewProjectTarget): vscode.Task {
  const execution = new vscode.ProcessExecution('dotnet', ['new', 'console', '-o', target.projectName], {
    cwd: target.folderUri.fsPath,
  });
  const task = new vscode.Task(
    { type: NEW_PROJECT_TASK_TYPE, language: 'csharp' },
    vscode.workspace.getWorkspaceFolder(target.folderUri) ?? vscode.TaskScope.Workspace,
    `new ${target.projectName}`,
    'dotnet',
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
 * C# (.NET) adapter — stub for switch/build/debug (v2), but F20 project creation is
 * real (dotnet new console). Declares the interface surface for M1 interface
 * confirmation (ASM-001/002). Real `-p:` injection (§8) and the full catalog are
 * v2. dotnet is the only language where the output name is injectable
 * (-p:AssemblyName) without editing the project.
 */
export const dotnetAdapter: LanguageAdapter = {
  id: 'dotnet',
  displayName: 'C# (.NET)',
  actions: { build: true },
  manifestGlobs: ['**/*.csproj'],
  requiredExtensions: ['ms-dotnettools.csdevkit'],
  canCreateProject: true,
  configCategories: ['compiler', 'linker', 'output', 'env', 'buildEvent', 'runArgs'],
  optionCatalog: [
    {
      id: 'optimize',
      category: 'compiler',
      label: 'Optimize',
      description: 'Enables compiler optimizations (-p:Optimize).',
      example: 'dotnet build -p:Optimize=true',
      type: 'bool',
      defaultValue: false,
      injection: 'flag',
    },
    {
      id: 'assembly-name',
      category: 'output',
      label: 'Assembly name',
      description:
        'Overrides the output assembly name (-p:AssemblyName) — injectable without editing the project.',
      example: 'dotnet build -p:AssemblyName=MyApp',
      type: 'string',
      injection: 'flag',
    },
    {
      id: 'publish-trimmed',
      category: 'linker',
      label: 'Trim on publish',
      description: 'Removes unused code when publishing (-p:PublishTrimmed).',
      example: 'dotnet publish -p:PublishTrimmed=true',
      type: 'bool',
      defaultValue: false,
      injection: 'flag',
    },
  ],

  chips: [
    { id: 'profile', icon: 'layers', label: 'Configuration', listItems: (_project) => notImplemented('dotnet profile.listItems', 'v2') },
    { id: 'architecture', icon: 'chip', label: 'Architecture', listItems: (_project) => notImplemented('dotnet architecture.listItems', 'v2') },
    { id: 'target', icon: 'symbol-method', label: 'Target', required: true, listItems: (_project) => notImplemented('dotnet target.listItems', 'v2') },
  ],

  listProjects: (_manifests) => notImplemented('DotnetAdapter.listProjects', 'v2'),
  createBuildTask: (_project, _sel, _config) => notImplemented('DotnetAdapter.createBuildTask', 'v2'),
  createRunTask: (_project, _sel, _config) => notImplemented('DotnetAdapter.createRunTask', 'v2'),
  createDebugConfig: (_project, _sel, _config) => notImplemented('DotnetAdapter.createDebugConfig', 'v2'),
  resolveExecutable: (_project, _sel, _config) => notImplemented('DotnetAdapter.resolveExecutable', 'v2'),
  createProject: (target) => ({ kind: 'task', task: makeDotnetNewTask(target) }),
  invalidateCache: (_project) => notImplemented('DotnetAdapter.invalidateCache', 'v2'),
  collectDiagnostics: () => Promise.resolve([]), // v2 stub — no real toolchain checks yet
};
