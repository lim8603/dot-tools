import { strict as assert } from 'node:assert';
import { sequenceGroup, type MemberHandle } from '../../core/groupSequencer';

// A controllable member: records start/terminate and exposes a gate to resolve readiness.
interface Gate {
  resolve(result: { started: boolean }): void;
}

function harness() {
  const events: string[] = [];
  const gates = new Map<string, Gate>();
  const throwFor = new Set<string>();

  const startMember = async (projectId: string): Promise<MemberHandle> => {
    events.push(`start:${projectId}`);
    if (throwFor.has(projectId)) {
      throw new Error(`boom:${projectId}`);
    }
    let resolve!: (result: { started: boolean }) => void;
    const ready = new Promise<{ started: boolean }>((r) => {
      resolve = r;
    });
    gates.set(projectId, { resolve });
    return { ready, terminate: () => events.push(`term:${projectId}`) };
  };

  return { events, gates, throwFor, startMember };
}

// Let queued microtasks/promise callbacks run so intermediate state is observable.
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

describe('sequenceGroup', () => {
  it('starts a single layer and reports it started', async () => {
    const h = harness();
    const run = sequenceGroup([['a']], h.startMember);
    await settle();
    h.gates.get('a')!.resolve({ started: true });
    assert.deepEqual(await run, { started: ['a'], aborted: false });
  });

  it('starts a dependent layer only after the previous layer is ready', async () => {
    const h = harness();
    const run = sequenceGroup([['a'], ['b']], h.startMember);
    await settle();
    assert.deepEqual(h.events, ['start:a']); // b must wait for a's readiness

    h.gates.get('a')!.resolve({ started: true });
    await settle();
    assert.deepEqual(h.events, ['start:a', 'start:b']);

    h.gates.get('b')!.resolve({ started: true });
    assert.deepEqual(await run, { started: ['a', 'b'], aborted: false });
  });

  it('starts every member of a layer in parallel', async () => {
    const h = harness();
    const run = sequenceGroup([['a', 'b', 'c']], h.startMember);
    await settle();
    // all three started before any resolves
    assert.deepEqual(h.events.sort(), ['start:a', 'start:b', 'start:c']);

    for (const id of ['a', 'b', 'c']) {
      h.gates.get(id)!.resolve({ started: true });
    }
    assert.deepEqual((await run).started, ['a', 'b', 'c']);
  });

  it('aborts and tears down started members when one is not ready', async () => {
    const h = harness();
    const run = sequenceGroup([['a'], ['b']], h.startMember);
    await settle();
    h.gates.get('a')!.resolve({ started: true });
    await settle();
    h.gates.get('b')!.resolve({ started: false }); // b failed to become ready

    const outcome = await run;
    assert.equal(outcome.aborted, true);
    assert.equal(outcome.failed, 'b');
    assert.deepEqual(outcome.started, ['a']);
    assert.ok(h.events.includes('term:a')); // the started member was stopped
    assert.ok(h.events.includes('term:b'));
  });

  it('aborts and tears down when a member throws while starting', async () => {
    const h = harness();
    h.throwFor.add('b');
    const run = sequenceGroup([['a'], ['b']], h.startMember);
    await settle();
    h.gates.get('a')!.resolve({ started: true });

    const outcome = await run;
    assert.equal(outcome.aborted, true);
    assert.equal(outcome.failed, 'b');
    assert.deepEqual(outcome.started, ['a']);
    assert.ok(h.events.includes('term:a')); // already-started member rolled back
  });

  // MS-018 / ADR-018: a cancel between layers stops before the next layer starts, and the
  // members started so far are torn down.
  it('does not start the next layer when the signal aborts, and tears down (MS-018)', async () => {
    const h = harness();
    const signal = { aborted: false };
    const run = sequenceGroup([['a'], ['b']], h.startMember, signal);
    await settle();
    assert.deepEqual(h.events, ['start:a']);

    signal.aborted = true; // user cancels while a is ready-waiting
    h.gates.get('a')!.resolve({ started: true });

    const outcome = await run;
    assert.equal(outcome.aborted, true);
    assert.deepEqual(outcome.started, ['a']);
    assert.ok(!h.events.includes('start:b'), 'the next layer must not start after cancel');
    assert.ok(h.events.includes('term:a')); // started member rolled back on cancel
  });

  it('aborts before starting anything when the signal is already aborted (MS-018)', async () => {
    const h = harness();
    const outcome = await sequenceGroup([['a']], h.startMember, { aborted: true });
    assert.equal(outcome.aborted, true);
    assert.deepEqual(outcome.started, []);
    assert.deepEqual(h.events, []); // nothing started
  });
});
