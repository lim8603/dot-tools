import { LanguageAdapter } from '../../core/types';
import { notImplemented } from '../notImplemented';
import { CARGO_OPTION_CATALOG } from './optionCatalog';

/**
 * Rust (Cargo) adapter — the v1 real-implementation target. TASK-003 declares
 * the interface surface (chips, capabilities, option catalog); the CargoBridge
 * metadata/build parsing and task assembly land in M2 (interface_contract §6/§8).
 */
export const cargoAdapter: LanguageAdapter = {
  id: 'cargo',
  displayName: 'Rust (Cargo)',
  actions: { build: true },
  manifestGlobs: ['**/Cargo.toml'],
  requiredExtensions: ['vadimcn.vscode-lldb'],
  canCreateProject: true,
  optionCatalog: CARGO_OPTION_CATALOG,
  configCategories: ['compiler', 'linker', 'output', 'env', 'buildEvent', 'runArgs'],

  chips: [
    {
      id: 'profile',
      icon: 'layers',
      label: 'Profile',
      listItems: (_project) => notImplemented('cargo profile.listItems', 'M2'),
    },
    {
      id: 'architecture',
      icon: 'chip',
      label: 'Architecture',
      listItems: (_project) => notImplemented('cargo architecture.listItems', 'M2'),
    },
    {
      id: 'features',
      icon: 'checklist',
      label: 'Features',
      multiSelect: true,
      listItems: (_project) => notImplemented('cargo features.listItems', 'M2'),
    },
    {
      id: 'target',
      icon: 'symbol-method',
      label: 'Target',
      required: true,
      listItems: (_project) => notImplemented('cargo target.listItems', 'M2'),
    },
  ],

  listProjects: (_manifests) => notImplemented('CargoAdapter.listProjects', 'M2'),
  createBuildTask: (_project, _sel, _config) => notImplemented('CargoAdapter.createBuildTask', 'M2'),
  createRunTask: (_project, _sel, _config) => notImplemented('CargoAdapter.createRunTask', 'M2'),
  createDebugConfig: (_project, _sel, _config) => notImplemented('CargoAdapter.createDebugConfig', 'M4'),
  resolveExecutable: (_project, _sel, _config) => notImplemented('CargoAdapter.resolveExecutable', 'M2'),
  createProjectTask: (_target) => notImplemented('CargoAdapter.createProjectTask', 'MS-008'),
  persistSetting: (_project, _key, _value) => notImplemented('CargoAdapter.persistSetting', 'v2'),
  invalidateCache: (_project) => notImplemented('CargoAdapter.invalidateCache', 'M3'),
};
