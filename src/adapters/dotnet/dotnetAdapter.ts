import * as vscode from 'vscode';
import { dirname } from 'node:path';
import { DevSwitcherError } from '../../core/errors';
import {
  ChipItem,
  ChipValue,
  DiagnosticProbe,
  InvocationConfig,
  LanguageAdapter,
  NEW_PROJECT_TASK_TYPE,
  NewProjectTarget,
  ProjectInfo,
  Selection,
} from '../../core/types';
import {
  DotnetBridge,
  assembleDotnetArgs,
  buildConfigurationList,
  buildCoreclrConfig,
  buildMsbuildProps,
  dotnetProjectName,
  targetFrameworkItems,
} from './dotnetBridge';

const bridge = new DotnetBridge();

/** Friendly names for the extensions Doctor reports (F19); falls back to the id. */
const EXTENSION_LABELS: Record<string, string> = { 'ms-dotnettools.csdevkit': 'C# Dev Kit' };
const extensionLabel = (id: string): string => EXTENSION_LABELS[id] ?? id;

/** Architecture-chip sentinel: pick this to clear the RID back to host default (no -r). */
const HOST_DEFAULT_RID = '__host_default__';

/** Common .NET runtime identifiers offered on the Architecture chip (optional, -r <rid>). */
const COMMON_RIDS = ['win-x64', 'win-arm64', 'linux-x64', 'linux-arm64', 'osx-x64', 'osx-arm64'];

const DOTNET_TASK_TYPE = 'devSwitcher.dotnet';

/** Directory a dotnet command runs in — the project directory. */
function cwdOf(project: ProjectInfo): string {
  return dirname(project.manifestPath);
}

function asString(v: ChipValue | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** The invocation overlay's env for a Task (dotnet has no RUSTFLAGS/target-dir analogue). */
function taskEnv(config: InvocationConfig): Record<string, string> | undefined {
  const env: Record<string, string> = { ...(config.env ?? {}) };
  return Object.keys(env).length > 0 ? env : undefined;
}

/** Build a ProcessExecution-backed dotnet Task (no shell, array args — NFR-002). */
function makeDotnetTask(
  action: 'build' | 'run',
  project: ProjectInfo,
  sel: Selection,
  config: InvocationConfig,
): vscode.Task {
  const props = buildMsbuildProps(config.compiler ?? {}, config.linker ?? {});
  const args = assembleDotnetArgs(action, project.manifestPath, sel, config, props);
  const execution = new vscode.ProcessExecution('dotnet', args, {
    cwd: cwdOf(project),
    env: taskEnv(config),
  });
  const definition: vscode.TaskDefinition = { type: DOTNET_TASK_TYPE, action, projectId: project.id };
  const task = new vscode.Task(
    definition,
    project.workspaceFolder,
    `${action} ${project.name}`,
    'dotnet',
    execution,
    action === 'build' ? ['$msCompile'] : undefined, // built-in MSBuild matcher, no extension needed
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
  // The catalog id IS the MSBuild property name — every option injects as `-p:<id>=<value>`
  // (buildMsbuildProps). `example` is the bare value; `injectsAs` teaches the injected form.
  optionCatalog: [
    {
      id: 'Optimize',
      category: 'compiler',
      label: 'Optimize',
      description: 'Enables compiler optimizations. On by default in Release, off in Debug.',
      example: 'true',
      injectsAs: 'dotnet build -p:Optimize=<value>',
      docUrl: 'https://learn.microsoft.com/dotnet/csharp/language-reference/compiler-options/code-generation#optimize',
      type: 'bool',
      defaultValue: false,
      injection: 'flag',
    },
    {
      id: 'LangVersion',
      category: 'compiler',
      label: 'Language version',
      description: 'C# language version to compile against (e.g. latest, preview, 12).',
      example: 'latest',
      injectsAs: 'dotnet build -p:LangVersion=<value>',
      docUrl: 'https://learn.microsoft.com/dotnet/csharp/language-reference/configure-language-version',
      type: 'string',
      injection: 'flag',
    },
    {
      id: 'AssemblyName',
      category: 'compiler',
      label: 'Assembly name',
      description: 'Overrides the output assembly name — injectable without editing the project.',
      example: 'MyApp',
      injectsAs: 'dotnet build -p:AssemblyName=<value>',
      type: 'string',
      injection: 'flag',
    },
    {
      id: 'PublishTrimmed',
      category: 'linker',
      label: 'Trim on publish',
      description: 'Removes unused code when publishing to reduce size.',
      example: 'true',
      injectsAs: 'dotnet publish -p:PublishTrimmed=<value>',
      docUrl: 'https://learn.microsoft.com/dotnet/core/deploying/trimming/trim-self-contained',
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

  createBuildTask(project, sel, config) {
    return makeDotnetTask('build', project, sel, config);
  },

  createRunTask(project, sel, config) {
    return makeDotnetTask('run', project, sel, config);
  },

  async createDebugConfig(project, sel, config) {
    // §7.4 builds first; resolveExecutable then reads the assembly path (TargetPath).
    const program = await this.resolveExecutable(project, sel, config);
    return buildCoreclrConfig(project.name, program, config.runArgs ?? [], cwdOf(project));
  },

  async resolveExecutable(project, sel, config) {
    // The built assembly path from MSBuild's TargetPath — no path guessing (DD-05 analogue).
    const configuration = asString(sel.values.profile) ?? 'Debug';
    const framework = asString(sel.values.target);
    const props = buildMsbuildProps(config.compiler ?? {}, config.linker ?? {});
    const targetPath = await bridge.resolveTargetPath(project.manifestPath, configuration, framework, props);
    if (!targetPath) {
      throw new DevSwitcherError('EXECUTABLE_NOT_FOUND', `Could not resolve the output assembly for ${project.name}.`); // E6
    }
    return targetPath;
  },

  createProject: (target) => ({ kind: 'task', task: makeDotnetNewTask(target) }),
  invalidateCache: (project) => bridge.invalidateCache(project?.manifestPath),

  collectDiagnostics: async (): Promise<DiagnosticProbe[]> => {
    const tc = await bridge.checkToolchain();
    const probes: DiagnosticProbe[] = [
      {
        id: 'dotnet',
        label: '.NET SDK',
        severity: 'critical',
        present: tc.dotnet !== undefined,
        detail: tc.dotnet,
        tier: 2,
        resolution: { kind: 'openUrl', url: 'https://dotnet.microsoft.com/download' },
      },
    ];
    for (const extId of dotnetAdapter.requiredExtensions) {
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
