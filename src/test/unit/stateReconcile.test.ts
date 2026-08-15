import { strict as assert } from 'node:assert';
import { reconcileValues, resolveActiveProject } from '../../core/stateReconcile';

// ── reconcileValues (상세설계서 §6.2) ─────────────────────────────────────────

describe('reconcileValues', () => {
  it('keeps values still offered by the chip', () => {
    const result = reconcileValues(
      { profile: 'release', target: 'app' },
      { profile: ['dev', 'release'], target: ['app', 'helper'] },
    );
    assert.deepEqual(result.values, { profile: 'release', target: 'app' });
    assert.deepEqual(result.removed, []);
  });

  it('drops a single value no longer offered (e.g. a deleted profile)', () => {
    const result = reconcileValues({ profile: 'bench' }, { profile: ['dev', 'release'] });
    assert.deepEqual(result.values, {});
    assert.deepEqual(result.removed, ['profile']);
  });

  it('filters invalid ids out of a multiSelect value', () => {
    const result = reconcileValues({ features: ['gui', 'legacy'] }, { features: ['gui', 'metrics'] });
    assert.deepEqual(result.values, { features: ['gui'] });
    assert.deepEqual(result.removed, ['features']);
  });

  it('drops a multiSelect entirely when nothing valid remains', () => {
    const result = reconcileValues({ features: ['legacy'] }, { features: ['gui'] });
    assert.deepEqual(result.values, {});
    assert.deepEqual(result.removed, ['features']);
  });

  it('leaves a chip untouched when no valid list is provided (unreconcilable this pass)', () => {
    const result = reconcileValues(
      { profile: 'release', target: 'app' },
      { profile: ['dev', 'release'] }, // target intentionally absent
    );
    assert.deepEqual(result.values, { profile: 'release', target: 'app' });
    assert.deepEqual(result.removed, []);
  });
});

// ── resolveActiveProject (상세설계서 §3.3c) ───────────────────────────────────

describe('resolveActiveProject', () => {
  it('keeps the stored active project when it is still scanned', () => {
    assert.equal(resolveActiveProject('cargo:b', ['cargo:a', 'cargo:b']), 'cargo:b');
  });

  it('falls back to the first scanned project when the stored one is gone', () => {
    assert.equal(resolveActiveProject('cargo:x', ['cargo:a', 'cargo:b']), 'cargo:a');
  });

  it('returns undefined when nothing is scanned', () => {
    assert.equal(resolveActiveProject('cargo:a', []), undefined);
    assert.equal(resolveActiveProject(undefined, []), undefined);
  });
});
