import { strict as assert } from 'node:assert';
import {
  memberStages,
  planGroupExecution,
  validateGroup,
  withMember,
  withMemberDependencies,
  withMemberStage,
} from '../../core/runGroupPlan';
import type { RunGroup, RunGroupMember } from '../../core/types';

// Build a group from a compact { projectId: [deps...] } spec (declaration order = key order).
function group(spec: Record<string, string[]>, name = 'g'): RunGroup {
  const members: RunGroupMember[] = Object.entries(spec).map(([projectId, dependsOn]) => ({
    projectId,
    dependsOn,
  }));
  return { id: 'group:test', name, members };
}

// ── planGroupExecution (ADR-015 layered topological order) ────────────────────

describe('planGroupExecution', () => {
  it('puts a single member in one layer', () => {
    const plan = planGroupExecution(group({ a: [] }));
    assert.deepEqual(plan.layers, [['a']]);
    assert.equal(plan.cycle, undefined);
  });

  it('orders a linear chain one member per layer (auth → api → web)', () => {
    const plan = planGroupExecution(group({ web: ['api'], api: ['auth'], auth: [] }));
    assert.deepEqual(plan.layers, [['auth'], ['api'], ['web']]);
    assert.equal(plan.cycle, undefined);
  });

  it('places independent members in the same (parallel) first layer', () => {
    const plan = planGroupExecution(group({ a: [], b: [], c: [] }));
    assert.deepEqual(plan.layers, [['a', 'b', 'c']]);
  });

  it('waits for every dependency before a fan-in member (diamond)', () => {
    // d depends on b and c; b and c both depend on a.
    const plan = planGroupExecution(group({ a: [], b: ['a'], c: ['a'], d: ['b', 'c'] }));
    assert.deepEqual(plan.layers, [['a'], ['b', 'c'], ['d']]);
  });

  it('preserves declaration order within a layer', () => {
    const plan = planGroupExecution(group({ c: [], a: [], b: [] }));
    assert.deepEqual(plan.layers, [['c', 'a', 'b']]);
  });

  it('reports a cycle and stops placing the members involved', () => {
    const plan = planGroupExecution(group({ a: ['b'], b: ['a'] }));
    assert.deepEqual(plan.layers, []);
    assert.deepEqual(plan.cycle, ['a', 'b']);
  });

  it('orders the acyclic prefix and reports only the cycle tail', () => {
    // root has no deps; x and y form a cycle among themselves.
    const plan = planGroupExecution(group({ root: [], x: ['y'], y: ['x'] }));
    assert.deepEqual(plan.layers, [['root']]);
    assert.deepEqual(plan.cycle, ['x', 'y']);
  });

  it('ignores a dangling dependency for ordering (validateGroup flags it separately)', () => {
    const plan = planGroupExecution(group({ a: ['missing'] }));
    assert.deepEqual(plan.layers, [['a']]);
    assert.equal(plan.cycle, undefined);
  });
});

// ── validateGroup (definition guard) ──────────────────────────────────────────

describe('validateGroup', () => {
  it('accepts a well-formed group', () => {
    assert.deepEqual(validateGroup(group({ auth: [], api: ['auth'] })), []);
  });

  it('rejects an empty group', () => {
    assert.deepEqual(validateGroup(group({})), ['The group has no members.']);
  });

  it('flags a self-dependency', () => {
    const problems = validateGroup(group({ a: ['a'] }));
    assert.ok(problems.some((p) => p.includes('depends on itself')));
  });

  it('flags a dangling dependency on a non-member', () => {
    const problems = validateGroup(group({ a: ['ghost'] }));
    assert.ok(problems.some((p) => p.includes('ghost') && p.includes('not a member')));
  });

  it('flags a dependency cycle', () => {
    const problems = validateGroup(group({ a: ['b'], b: ['a'] }));
    assert.ok(problems.some((p) => p.includes('dependency cycle')));
  });

  it('flags a duplicate member', () => {
    // Two members share a projectId (bypass the spec helper, which would dedupe keys).
    const dup: RunGroup = {
      id: 'group:dup',
      name: 'dup',
      members: [
        { projectId: 'a', dependsOn: [] },
        { projectId: 'a', dependsOn: [] },
      ],
    };
    const problems = validateGroup(dup);
    assert.ok(problems.some((p) => p.includes('Duplicate member')));
  });
});

// ── withMember / withMemberDependencies (settings-page edits) ──────────────────

describe('withMember', () => {
  it('adds a new member with no dependencies', () => {
    const next = withMember(group({ a: [] }), 'b', true);
    assert.deepEqual(next.members, [
      { projectId: 'a', dependsOn: [] },
      { projectId: 'b', dependsOn: [] },
    ]);
  });

  it('removing a member also strips it from other members dependsOn', () => {
    const next = withMember(group({ a: [], b: ['a'] }), 'a', false);
    assert.deepEqual(next.members, [{ projectId: 'b', dependsOn: [] }]);
  });

  it('is a no-op when adding an existing member', () => {
    const g = group({ a: [] });
    assert.deepEqual(withMember(g, 'a', true).members, g.members);
  });
});

describe('withMemberDependencies', () => {
  it('sets a member dependsOn, dropping self and non-members', () => {
    const next = withMemberDependencies(group({ a: [], b: [], c: [] }), 'c', ['a', 'c', 'ghost', 'b']);
    const c = next.members.find((m) => m.projectId === 'c');
    assert.deepEqual(c?.dependsOn, ['a', 'b']);
  });

  it('leaves other members untouched', () => {
    const next = withMemberDependencies(group({ a: [], b: ['a'] }), 'a', ['b']);
    assert.deepEqual(next.members.find((m) => m.projectId === 'b')?.dependsOn, ['a']);
  });
});

// ── memberStages / withMemberStage (stage-based settings UI) ───────────────────

describe('memberStages', () => {
  it('numbers a linear chain 1, 2, 3', () => {
    const s = memberStages(group({ a: [], b: ['a'], c: ['b'] }));
    assert.deepEqual([s.get('a'), s.get('b'), s.get('c')], [1, 2, 3]);
  });

  it('puts independent members in stage 1', () => {
    const s = memberStages(group({ a: [], b: [] }));
    assert.deepEqual([s.get('a'), s.get('b')], [1, 1]);
  });

  it('numbers a diamond by layer', () => {
    const s = memberStages(group({ a: [], b: ['a'], c: ['a'], d: ['b', 'c'] }));
    assert.deepEqual([s.get('a'), s.get('b'), s.get('c'), s.get('d')], [1, 2, 2, 3]);
  });
});

describe('withMemberStage', () => {
  const dep = (g: RunGroup, id: string): string[] | undefined =>
    g.members.find((m) => m.projectId === id)?.dependsOn;

  it('rebuilds dependsOn so a higher stage depends on every lower stage', () => {
    const g = withMemberStage(group({ a: [], b: [], c: [] }), 'c', 2);
    assert.deepEqual(dep(g, 'a'), []);
    assert.deepEqual(dep(g, 'b'), []);
    assert.deepEqual(dep(g, 'c')?.slice().sort(), ['a', 'b']);
  });

  it('moving a member back to stage 1 clears its own dependencies', () => {
    const g = withMemberStage(group({ a: [], b: ['a'], c: ['b'] }), 'c', 1);
    assert.deepEqual(dep(g, 'c'), []);
  });

  it('clamps a stage below 1 and stays runnable', () => {
    const g = withMemberStage(group({ a: [], b: [] }), 'b', 0);
    assert.deepEqual(dep(g, 'b'), []);
    assert.deepEqual(validateGroup(g), []);
  });
});
