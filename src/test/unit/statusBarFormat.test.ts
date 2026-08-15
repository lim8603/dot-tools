import { strict as assert } from 'node:assert';
import { defaultChipFormat } from '../../ui/statusBarFormat';

describe('defaultChipFormat', () => {
  it('renders a single string value as-is', () => {
    assert.equal(defaultChipFormat('release'), 'release');
    assert.equal(defaultChipFormat('dev'), 'dev');
  });

  it('summarizes a multiSelect: empty -> default, 1-2 -> names, 3+ -> count', () => {
    assert.equal(defaultChipFormat([]), 'default');
    assert.equal(defaultChipFormat(['gui']), 'gui');
    assert.equal(defaultChipFormat(['gui', 'metrics']), 'gui,metrics');
    assert.equal(defaultChipFormat(['a', 'b', 'c']), '3 features');
  });
});
