import { DiagnosticProbe, LanguageAdapter } from '../../core/types';
import { notImplemented } from '../notImplemented';
import { cmakeProjectFiles } from './cmakeTemplate';
import { CMakeBridge } from './cmakeBridge';

const bridge = new CMakeBridge();

/**
 * C++ (CMake) adapter — stub for switch/build/debug (v2), but F20 project creation is
 * real: CMake has no native scaffolder, so createProject returns template files the
 * Orchestrator writes (D-13). Declares the interface surface for M1 interface
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
  createProject: (target) => ({ kind: 'files', files: cmakeProjectFiles(target.projectName) }),

  // invalidateCache is real now (ADR-014): it clears the cmake toolchain probe so a freshly
  // installed cmake clears its Doctor warning on Rescan. (File API / metadata caches join in
  // TASK-033/034.) It must not throw — invalidateAll() runs it on every manual Rescan.
  invalidateCache: (_project) => bridge.invalidateCache(),

  // F19 (§13.5) — probe cmake (critical). Real even while switch/build stay stubbed: Doctor
  // uses detectAdapters (a CMakeLists.txt glob), so a present manifest surfaces this. With
  // cmake absent, Doctor shows ❌ and the E1 warning chip lights — the missing-critical path
  // the other (installed) toolchains couldn't exercise. The debugger-extension probe joins
  // when the debugger is chosen (TASK-035).
  collectDiagnostics: async (): Promise<DiagnosticProbe[]> => {
    const tc = await bridge.checkToolchain();
    return [
      {
        id: 'cmake',
        label: 'cmake',
        severity: 'critical',
        present: tc.cmake !== undefined,
        detail: tc.cmake,
        tier: 2,
        resolution: { kind: 'openUrl', url: 'https://cmake.org/download/' },
      },
    ];
  },
};
