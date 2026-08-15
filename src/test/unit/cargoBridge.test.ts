import { strict as assert } from 'node:assert';
import type { InvocationConfig, Selection } from '../../core/types';
import {
  abbreviateTriple,
  assembleCargoArgs,
  buildProfileList,
  defaultBinTarget,
  featuresToArgs,
  formatFeatureCount,
  parseBinTargets,
  parseFeatures,
  parseWorkspacePackages,
  pickExecutable,
  type CargoMetadata,
} from '../../adapters/cargo/cargoBridge';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const metadata: CargoMetadata = {
  workspace_root: '/w',
  workspace_members: ['app 0.1.0 (path+file:///w/app)', 'lib 0.1.0 (path+file:///w/lib)'],
  packages: [
    {
      id: 'app 0.1.0 (path+file:///w/app)',
      name: 'app',
      manifest_path: '/w/app/Cargo.toml',
      targets: [
        { name: 'app', kind: ['bin'] },
        { name: 'helper', kind: ['bin'] },
        { name: 'demo', kind: ['example'] },
        { name: 'app', kind: ['lib'] },
      ],
      features: { default: ['gui'], gui: [], metrics: [] },
    },
    {
      id: 'lib 0.1.0 (path+file:///w/lib)',
      name: 'lib',
      manifest_path: '/w/lib/Cargo.toml',
      targets: [{ name: 'lib', kind: ['lib'] }],
      features: {},
    },
    {
      // registry dependency — NOT a workspace member
      id: 'dep 1.0.0 (registry+https://github.com/rust-lang/crates.io-index)',
      name: 'dep',
      manifest_path: '/reg/dep/Cargo.toml',
      targets: [{ name: 'dep', kind: ['lib'] }],
      features: {},
    },
  ],
};

const singleBin: CargoMetadata = {
  workspace_root: '/s',
  workspace_members: ['solo 0.1.0 (path+file:///s)'],
  packages: [
    {
      id: 'solo 0.1.0 (path+file:///s)',
      name: 'solo',
      manifest_path: '/s/Cargo.toml',
      targets: [{ name: 'solo', kind: ['bin'] }],
      features: {},
    },
  ],
};

function sel(values: Selection['values']): Selection {
  return { projectId: 'cargo:app', values };
}

// ── featuresToArgs (상세설계서 §8.3) ─────────────────────────────────────────

describe('featuresToArgs', () => {
  it('emits nothing when the default state is unchanged', () => {
    assert.deepEqual(featuresToArgs(['default'], true), []);
    assert.deepEqual(featuresToArgs([], false), []);
  });

  it('adds --no-default-features when default is deselected', () => {
    assert.deepEqual(featuresToArgs([], true), ['--no-default-features']);
    assert.deepEqual(featuresToArgs(['gui'], true), ['--no-default-features', '--features', 'gui']);
  });

  it('adds --features for non-default selections while keeping default', () => {
    assert.deepEqual(featuresToArgs(['default', 'gui'], true), ['--features', 'gui']);
    assert.deepEqual(featuresToArgs(['a'], false), ['--features', 'a']);
  });

  it('joins multiple features with commas', () => {
    assert.deepEqual(featuresToArgs(['gui', 'metrics'], true), [
      '--no-default-features',
      '--features',
      'gui,metrics',
    ]);
  });
});

// ── assembleCargoArgs (상세설계서 §8.4) ──────────────────────────────────────

describe('assembleCargoArgs', () => {
  const emptyConfig: InvocationConfig = {};

  it('builds with profile, target triple, and unchanged features', () => {
    const args = assembleCargoArgs(
      'build',
      'app',
      sel({ profile: 'release', architecture: 'x86_64-pc-windows-msvc', features: ['default'] }),
      emptyConfig,
      true,
    );
    assert.deepEqual(args, [
      'build',
      '-p',
      'app',
      '--profile',
      'release',
      '--target',
      'x86_64-pc-windows-msvc',
    ]);
  });

  it('defaults the profile to dev and omits --target when no architecture', () => {
    const args = assembleCargoArgs('build', 'app', sel({}), emptyConfig, false);
    assert.deepEqual(args, ['build', '-p', 'app', '--profile', 'dev']);
  });

  it('runs with --bin, feature flags, and -- runArgs from the invocation overlay', () => {
    const args = assembleCargoArgs(
      'run',
      'app',
      sel({ profile: 'dev', target: 'app', features: ['gui'] }),
      { runArgs: ['--flag', 'x'] },
      true,
    );
    assert.deepEqual(args, [
      'run',
      '-p',
      'app',
      '--profile',
      'dev',
      '--bin',
      'app',
      '--no-default-features',
      '--features',
      'gui',
      '--',
      '--flag',
      'x',
    ]);
  });
});

// ── pickExecutable (상세설계서 §8.5) ─────────────────────────────────────────

describe('pickExecutable', () => {
  const lines = [
    '{"reason":"compiler-artifact","executable":null,"target":{"name":"app","kind":["lib"]}}',
    'note: some non-json line',
    '{"reason":"compiler-artifact","executable":"/w/target/debug/helper","target":{"name":"helper","kind":["bin"]}}',
    '{"reason":"compiler-artifact","executable":"/w/target/debug/app","target":{"name":"app","kind":["bin"]}}',
    '{"reason":"build-finished","success":true}',
  ];

  it('prefers the exact target-name match', () => {
    assert.equal(pickExecutable(lines, 'helper'), '/w/target/debug/helper');
  });

  it('falls back to the first bin when the target is unknown', () => {
    assert.equal(pickExecutable(lines, undefined), '/w/target/debug/helper');
  });

  it('returns undefined when no executable is present', () => {
    assert.equal(pickExecutable(['{"reason":"build-finished"}', ''], 'app'), undefined);
  });
});

// ── formatting ───────────────────────────────────────────────────────────────

describe('abbreviateTriple', () => {
  it('abbreviates known triples', () => {
    assert.equal(abbreviateTriple('x86_64-pc-windows-msvc'), 'x64-msvc');
    assert.equal(abbreviateTriple('aarch64-apple-darwin'), 'arm64-darwin');
    assert.equal(abbreviateTriple('x86_64-unknown-linux-gnu'), 'x64-gnu');
  });

  it('passes through unrecognized single-part input', () => {
    assert.equal(abbreviateTriple('wasm32'), 'wasm32');
  });
});

describe('formatFeatureCount', () => {
  it('summarizes the features chip', () => {
    assert.equal(formatFeatureCount([]), 'default');
    assert.equal(formatFeatureCount(['default']), 'default');
    assert.equal(formatFeatureCount(['gui']), 'gui');
    assert.equal(formatFeatureCount(['default', 'gui']), 'gui');
    assert.equal(formatFeatureCount(['gui', 'metrics']), '2 features');
  });
});

// ── cargo metadata parsing (상세설계서 §8.2/§8.3) ────────────────────────────

describe('parseWorkspacePackages', () => {
  it('returns workspace members only, excluding registry deps', () => {
    assert.deepEqual(parseWorkspacePackages(metadata), [
      { name: 'app', manifestPath: '/w/app/Cargo.toml' },
      { name: 'lib', manifestPath: '/w/lib/Cargo.toml' },
    ]);
  });
});

describe('parseFeatures', () => {
  it('lists feature names and detects the default feature', () => {
    assert.deepEqual(parseFeatures(metadata, 'app'), {
      names: ['default', 'gui', 'metrics'],
      hasDefault: true,
    });
    assert.deepEqual(parseFeatures(metadata, 'lib'), { names: [], hasDefault: false });
  });
});

describe('parseBinTargets', () => {
  it('includes bin and example targets, excluding lib', () => {
    assert.deepEqual(parseBinTargets(metadata, 'app'), [
      { id: 'app', label: 'app', description: undefined },
      { id: 'helper', label: 'helper', description: undefined },
      { id: 'demo', label: 'demo', description: 'example' },
    ]);
  });
});

describe('defaultBinTarget', () => {
  it('auto-selects when exactly one bin exists', () => {
    assert.equal(defaultBinTarget(singleBin, 'solo'), 'solo');
  });

  it('returns undefined when there are multiple or zero bins', () => {
    assert.equal(defaultBinTarget(metadata, 'app'), undefined);
    assert.equal(defaultBinTarget(metadata, 'lib'), undefined);
  });
});

describe('buildProfileList', () => {
  it('lists built-in profiles plus custom ones without duplicating dev/release', () => {
    assert.deepEqual(buildProfileList(['bench', 'dev']), [
      { id: 'dev', label: 'dev', description: 'Debug' },
      { id: 'release', label: 'release', description: 'Release' },
      { id: 'bench', label: 'bench', description: 'custom' },
    ]);
  });
});
