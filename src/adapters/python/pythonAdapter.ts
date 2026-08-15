import { LanguageAdapter } from '../../core/types';
import { notImplemented } from '../notImplemented';

/**
 * Python adapter — stub AND the framework litmus (interface_contract §6/§8).
 *
 * actions.build === false, so the settings page must drop compiler/linker/output
 * and keep only env + runArgs (configCategories below). Chips are environment +
 * target — no profile/architecture. If the status bar and settings page honor
 * these declarations without Python-specific code, the chip and settings-page
 * frameworks are proven language-agnostic (INV-2).
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
      example: 'PYTHONPATH=./src:./libs',
      type: 'string',
      injection: 'env',
    },
    {
      id: 'py-dont-write-bytecode',
      category: 'env',
      label: 'Disable .pyc files',
      description: 'Prevents writing bytecode cache files (PYTHONDONTWRITEBYTECODE).',
      example: 'PYTHONDONTWRITEBYTECODE=1',
      type: 'bool',
      defaultValue: false,
      injection: 'env',
    },
  ],

  chips: [
    { id: 'environment', icon: 'server-environment', label: 'Environment', listItems: (_project) => notImplemented('python environment.listItems', 'v2') },
    { id: 'target', icon: 'symbol-method', label: 'Target', listItems: (_project) => notImplemented('python target.listItems', 'v2') },
  ],

  listProjects: (_manifests) => notImplemented('PythonAdapter.listProjects', 'v2'),
  createBuildTask: (_project, _sel, _config) => notImplemented('PythonAdapter.createBuildTask (no build concept)', 'v2'),
  createRunTask: (_project, _sel, _config) => notImplemented('PythonAdapter.createRunTask', 'v2'),
  createDebugConfig: (_project, _sel, _config) => notImplemented('PythonAdapter.createDebugConfig', 'v2'),
  resolveExecutable: (_project, _sel, _config) => notImplemented('PythonAdapter.resolveExecutable', 'v2'),
  createProjectTask: (_target) => notImplemented('PythonAdapter.createProjectTask', 'MS-008'),
  persistSetting: (_project, _key, _value) => notImplemented('PythonAdapter.persistSetting', 'v2'),
  invalidateCache: (_project) => notImplemented('PythonAdapter.invalidateCache', 'v2'),
  collectDiagnostics: () => Promise.resolve([]), // v2 stub — no real toolchain checks yet
};
