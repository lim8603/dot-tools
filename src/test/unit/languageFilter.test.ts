import { strict as assert } from 'node:assert';
import { enabledAdapterIds } from '../../core/languageFilter';

const ALL = ['cargo', 'cmake', 'vs', 'dotnet', 'go', 'node', 'python'];

describe('enabledAdapterIds (B-3, fail-open)', () => {
  it('an absent or non-array setting enables everything', () => {
    assert.deepEqual([...enabledAdapterIds(undefined, ALL)].sort(), [...ALL].sort());
    assert.deepEqual([...enabledAdapterIds('cargo', ALL)].sort(), [...ALL].sort());
    assert.deepEqual([...enabledAdapterIds({ cargo: true }, ALL)].sort(), [...ALL].sort());
  });

  it('a valid subset narrows to exactly those adapters', () => {
    const enabled = enabledAdapterIds(['cargo', 'vs'], ALL);
    assert.equal(enabled.size, 2);
    assert.ok(enabled.has('cargo'));
    assert.ok(enabled.has('vs'));
    assert.ok(!enabled.has('cmake'));
  });

  it('unknown and non-string entries are dropped before deciding', () => {
    const enabled = enabledAdapterIds(['go', 'not-a-language', 42], ALL);
    assert.deepEqual([...enabled], ['go']);
  });

  it('an empty list (or one that empties after validation) fails open to all', () => {
    assert.equal(enabledAdapterIds([], ALL).size, ALL.length);
    assert.equal(enabledAdapterIds(['nope'], ALL).size, ALL.length);
  });
});
