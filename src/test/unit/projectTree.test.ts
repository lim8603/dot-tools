import { strict as assert } from 'node:assert';
import { orderByHierarchy, visibleInSwitcher } from '../../core/projectTree';

describe('orderByHierarchy (ADR-019)', () => {
  it('places each sub-project right after its parent, keeping scan order otherwise', () => {
    const ordered = orderByHierarchy([
      { id: 'cargo:a' },
      { id: 'cmake:root' },
      { id: 'cmake:root/app', parentId: 'cmake:root' },
      { id: 'cmake:other' },
      { id: 'cmake:root/lib', parentId: 'cmake:root' },
    ]);
    assert.deepEqual(
      ordered.map((p) => p.id),
      ['cargo:a', 'cmake:root', 'cmake:root/app', 'cmake:root/lib', 'cmake:other'],
    );
  });

  it('keeps a sub whose parent is missing as top-level instead of dropping it', () => {
    const ordered = orderByHierarchy([{ id: 'cmake:orphan/app', parentId: 'cmake:gone' }]);
    assert.deepEqual(ordered.map((p) => p.id), ['cmake:orphan/app']);
  });
});

describe('visibleInSwitcher (ADR-019)', () => {
  it('hides only library-only sub-projects when the preference is off', () => {
    assert.equal(visibleInSwitcher({ parentId: 'cmake:root', library: true }, false), false);
    assert.equal(visibleInSwitcher({ parentId: 'cmake:root', library: true }, true), true);
    assert.equal(visibleInSwitcher({ parentId: 'cmake:root' }, false), true); // executable sub
    assert.equal(visibleInSwitcher({ library: true }, false), true); // library-only ROOT stays
  });
});
