import { LanguageAdapter } from '../../core/types';
import { notImplemented } from '../notImplemented';

/**
 * C# (.NET) adapter — stub. Declares the interface surface for M1 interface
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
  createProjectTask: (_target) => notImplemented('DotnetAdapter.createProjectTask', 'MS-008'),
  persistSetting: (_project, _key, _value) => notImplemented('DotnetAdapter.persistSetting', 'v2'),
  invalidateCache: (_project) => notImplemented('DotnetAdapter.invalidateCache', 'v2'),
  collectDiagnostics: () => Promise.resolve([]), // v2 stub — no real toolchain checks yet
};
