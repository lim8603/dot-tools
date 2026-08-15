import { LanguageAdapter } from '../../core/types';
import { notImplemented } from '../notImplemented';

/**
 * C++ (CMake) adapter — stub. Declares the interface surface for M1 interface
 * confirmation (ASM-001/002). Real configure+build (a two-stage injection point,
 * §8) and the full catalog are v2. CMake is the only language where include
 * folders survive as invocation config.
 */
export const cmakeAdapter: LanguageAdapter = {
  id: 'cmake',
  displayName: 'C++ (CMake)',
  actions: { build: true },
  manifestGlobs: ['**/CMakeLists.txt'],
  requiredExtensions: ['ms-vscode.cmake-tools'],
  canCreateProject: true,
  configCategories: ['compiler', 'linker', 'output', 'env', 'buildEvent', 'runArgs'],
  optionCatalog: [
    {
      id: 'cxx-flags',
      category: 'compiler',
      label: 'C++ compiler flags',
      description: 'Extra flags passed to the C++ compiler (CMAKE_CXX_FLAGS).',
      example: '-D CMAKE_CXX_FLAGS="-O2 -Wall"',
      type: 'string',
      injection: 'flag',
    },
    {
      id: 'build-dir',
      category: 'output',
      label: 'Build directory',
      description: 'Directory CMake configures and builds into.',
      example: 'cmake -B build/release',
      type: 'string',
      injection: 'flag',
    },
  ],

  chips: [
    { id: 'profile', icon: 'layers', label: 'Configuration', listItems: (_project) => notImplemented('cmake profile.listItems', 'v2') },
    { id: 'architecture', icon: 'chip', label: 'Architecture', listItems: (_project) => notImplemented('cmake architecture.listItems', 'v2') },
    { id: 'target', icon: 'symbol-method', label: 'Target', required: true, listItems: (_project) => notImplemented('cmake target.listItems', 'v2') },
  ],

  listProjects: (_manifests) => notImplemented('CMakeAdapter.listProjects', 'v2'),
  createBuildTask: (_project, _sel, _config) => notImplemented('CMakeAdapter.createBuildTask', 'v2'),
  createRunTask: (_project, _sel, _config) => notImplemented('CMakeAdapter.createRunTask', 'v2'),
  createDebugConfig: (_project, _sel, _config) => notImplemented('CMakeAdapter.createDebugConfig', 'v2'),
  resolveExecutable: (_project, _sel, _config) => notImplemented('CMakeAdapter.resolveExecutable', 'v2'),
  createProjectTask: (_target) => notImplemented('CMakeAdapter.createProjectTask', 'MS-008'),
  persistSetting: (_project, _key, _value) => notImplemented('CMakeAdapter.persistSetting', 'v2'),
  invalidateCache: (_project) => notImplemented('CMakeAdapter.invalidateCache', 'v2'),
  collectDiagnostics: () => Promise.resolve([]), // v2 stub — no real toolchain checks yet
};
