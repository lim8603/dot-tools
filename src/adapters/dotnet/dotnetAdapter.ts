import * as vscode from 'vscode';
import { ChipItem, LanguageAdapter, NEW_PROJECT_TASK_TYPE, NewProjectTarget, ProjectInfo } from '../../core/types';
import { notImplemented } from '../notImplemented';
import {
  DotnetBridge,
  buildConfigurationList,
  dotnetProjectName,
  targetFrameworkItems,
} from './dotnetBridge';

const bridge = new DotnetBridge();

/** Architecture-chip sentinel: pick this to clear the RID back to host default (no -r). */
const HOST_DEFAULT_RID = '__host_default__';

/** Common .NET runtime identifiers offered on the Architecture chip (optional, -r <rid>). */
const COMMON_RIDS = ['win-x64', 'win-arm64', 'linux-x64', 'linux-arm64', 'osx-x64', 'osx-arm64'];

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
 * C# (.NET) adapter (MS-010, C-7). Detection + chip switching are real: `.csproj`
 * projects list via a glob scan and DotnetBridge reads Configuration/TFM metadata with
 * `dotnet msbuild -getProperty`. build/run/debug injection (-p:/-c/-f, coreclr) land in
 * TASK-028/029. dotnet is the only language where the output name is injectable
 * (-p:AssemblyName) without editing the project. The extension never edits the .csproj
 * (ADR-013). F20 project creation (dotnet new console) is real.
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
    {
      id: 'profile',
      icon: 'layers',
      label: 'Configuration',
      // Built-in Debug/Release. Custom configurations (rare) are a later concern.
      listItems: async () => buildConfigurationList(),
      defaultValue: async () => 'Debug',
    },
    {
      id: 'architecture',
      icon: 'chip',
      label: 'Architecture',
      unsetText: 'default', // unselected = framework-dependent build (no -r RID)
      clearValueId: HOST_DEFAULT_RID, // 'Host default' entry clears back to unset
      listItems: async () => {
        const items: ChipItem[] = [
          { id: HOST_DEFAULT_RID, label: 'Host default', description: 'no -r override' },
        ];
        for (const rid of COMMON_RIDS) {
          items.push({ id: rid, label: rid });
        }
        return items;
      },
    },
    {
      id: 'target',
      icon: 'symbol-method',
      label: 'Target',
      required: true,
      // The TFM to build/run against. Single-TFM projects auto-select (defaultValue);
      // multi-target (<TargetFrameworks>) projects list each framework (MS-010 scope).
      listItems: async (project) => {
        const metadata = await bridge.fetchMetadata(project.manifestPath);
        return targetFrameworkItems(metadata.targetFrameworks);
      },
      defaultValue: async (project) => {
        const metadata = await bridge.fetchMetadata(project.manifestPath);
        return metadata.targetFrameworks.length === 1 ? metadata.targetFrameworks[0] : undefined;
      },
    },
  ],

  async listProjects(manifests) {
    // One .csproj = one switcher entry (.sln is out of scope in v1). The name comes from
    // the filename (fast, no dotnet call); AssemblyName is read lazily for build output.
    const projects: ProjectInfo[] = [];
    for (const uri of manifests) {
      const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
      if (/(^|\/)(bin|obj)\//.test(rel)) {
        continue; // generated project files under bin/obj are not real projects
      }
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (!folder || projects.some((p) => p.manifestPath === uri.fsPath)) {
        continue;
      }
      projects.push({
        id: `dotnet:${rel}`,
        name: dotnetProjectName(uri.fsPath),
        adapterId: 'dotnet',
        manifestPath: uri.fsPath,
        workspaceFolder: folder,
      });
    }
    return projects;
  },

  createBuildTask: (_project, _sel, _config) => notImplemented('DotnetAdapter.createBuildTask', 'TASK-028'),
  createRunTask: (_project, _sel, _config) => notImplemented('DotnetAdapter.createRunTask', 'TASK-028'),
  createDebugConfig: (_project, _sel, _config) => notImplemented('DotnetAdapter.createDebugConfig', 'TASK-029'),
  resolveExecutable: (_project, _sel, _config) => notImplemented('DotnetAdapter.resolveExecutable', 'TASK-028'),
  createProject: (target) => ({ kind: 'task', task: makeDotnetNewTask(target) }),
  invalidateCache: (project) => bridge.invalidateCache(project?.manifestPath),
  collectDiagnostics: () => Promise.resolve([]), // real SDK/extension checks land in TASK-029
};
