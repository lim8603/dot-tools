import { strict as assert } from 'node:assert';
import { buildProfileExport, mergeImport, parseProfileExport } from '../../core/profileExport';
import { DevSwitcherError, PROFILE_EXPORT_VERSION } from '../../core/types';
import type { PersistedState, ProfileExport } from '../../core/types';

function state(partial: Partial<PersistedState> = {}): PersistedState {
  return { selections: {}, invocation: {}, groups: [], ...partial };
}

const sample = state({
  activeProjectId: 'cargo:app/Cargo.toml',
  selections: { 'cargo:app/Cargo.toml': { profile: 'release', features: ['gui', 'metrics'] } },
  invocation: { 'cargo:app/Cargo.toml': { release: { runArgs: ['--config', 'dev.toml'] } } },
});

describe('buildProfileExport', () => {
  it('stamps version + timestamp and mirrors the two state maps', () => {
    const out = buildProfileExport(sample, '2026-08-15T00:00:00Z');
    assert.equal(out.version, PROFILE_EXPORT_VERSION);
    assert.equal(out.exportedAt, '2026-08-15T00:00:00Z');
    assert.deepEqual(out.selections, sample.selections);
    assert.deepEqual(out.invocation, sample.invocation);
  });

  it('drops activeProjectId (machine/session-specific)', () => {
    const out = buildProfileExport(sample, 'now') as ProfileExport & { activeProjectId?: string };
    assert.equal(out.activeProjectId, undefined);
  });

  it('deep-copies so later state mutation cannot leak into the payload', () => {
    const src = state({ selections: { p: { profile: 'dev' } }, invocation: {} });
    const out = buildProfileExport(src, 'now');
    src.selections['p'].profile = 'release';
    assert.equal(out.selections['p'].profile, 'dev');
  });
});

describe('parseProfileExport', () => {
  it('round-trips a built payload', () => {
    const text = JSON.stringify(buildProfileExport(sample, 'now'));
    const parsed = parseProfileExport(text);
    assert.deepEqual(parsed.selections, sample.selections);
    assert.deepEqual(parsed.invocation, sample.invocation);
  });

  it('throws PROFILE_IMPORT_INVALID on non-JSON', () => {
    assert.throws(() => parseProfileExport('{not json'), (e: unknown) => {
      assert.ok(e instanceof DevSwitcherError);
      assert.equal(e.code, 'PROFILE_IMPORT_INVALID');
      return true;
    });
  });

  it('throws on an unsupported version', () => {
    const text = JSON.stringify({ version: 99, selections: {}, invocation: {} });
    assert.throws(() => parseProfileExport(text), (e: unknown) => e instanceof DevSwitcherError && e.code === 'PROFILE_IMPORT_INVALID');
  });

  it('throws when a required map is missing or the wrong shape', () => {
    const noInvocation = JSON.stringify({ version: 1, selections: {} });
    assert.throws(() => parseProfileExport(noInvocation), DevSwitcherError);
    const badSelections = JSON.stringify({ version: 1, selections: { p: 'oops' }, invocation: {} });
    assert.throws(() => parseProfileExport(badSelections), DevSwitcherError);
  });
});

describe('mergeImport', () => {
  const imported = buildProfileExport(sample, 'now');

  it('applies projectIds present in the current scan', () => {
    const merge = mergeImport(state(), imported, ['cargo:app/Cargo.toml']);
    assert.deepEqual(merge.applied, ['cargo:app/Cargo.toml']);
    assert.deepEqual(merge.skipped, []);
    assert.deepEqual(merge.next.selections['cargo:app/Cargo.toml'], sample.selections['cargo:app/Cargo.toml']);
    assert.deepEqual(merge.next.invocation['cargo:app/Cargo.toml'], sample.invocation['cargo:app/Cargo.toml']);
  });

  it('skips projectIds absent from the workspace, writing nothing for them', () => {
    const merge = mergeImport(state(), imported, []);
    assert.deepEqual(merge.applied, []);
    assert.deepEqual(merge.skipped, ['cargo:app/Cargo.toml']);
    assert.deepEqual(merge.next.selections, {});
    assert.deepEqual(merge.next.invocation, {});
  });

  it('preserves activeProjectId and untouched projects', () => {
    const current = state({
      activeProjectId: 'cargo:other/Cargo.toml',
      selections: { 'cargo:other/Cargo.toml': { profile: 'dev' } },
    });
    const merge = mergeImport(current, imported, ['cargo:app/Cargo.toml']);
    assert.equal(merge.next.activeProjectId, 'cargo:other/Cargo.toml');
    assert.deepEqual(merge.next.selections['cargo:other/Cargo.toml'], { profile: 'dev' });
  });

  it('does not alias imported data into the merged state', () => {
    const merge = mergeImport(state(), imported, ['cargo:app/Cargo.toml']);
    (merge.next.selections['cargo:app/Cargo.toml'].features as string[]).push('extra');
    assert.deepEqual(imported.selections['cargo:app/Cargo.toml'].features, ['gui', 'metrics']);
  });

  it('applies a project referenced only in the invocation map', () => {
    const invOnly: ProfileExport = { version: 1, exportedAt: 'now', selections: {}, invocation: { p: { dev: { env: { A: '1' } } } } };
    const merge = mergeImport(state(), invOnly, ['p']);
    assert.deepEqual(merge.applied, ['p']);
    assert.deepEqual(merge.next.invocation['p'], { dev: { env: { A: '1' } } });
  });
});
