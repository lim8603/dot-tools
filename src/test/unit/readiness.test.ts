import { strict as assert } from 'node:assert';
import {
  DEFAULT_READINESS_INTERVAL_MS,
  describeReadiness,
  pollUntilReady,
  readinessProblems,
  type PollOptions,
} from '../../core/readiness';
import type { ReadinessProbe } from '../../core/types';

/** A fake clock that advances by `intervalMs` on every sleep — lets the poll loop reach its
 *  deadline deterministically without real timers. */
function fakeClock(): Pick<PollOptions, 'now' | 'sleep'> {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
  };
}

describe('pollUntilReady', () => {
  const base = { timeoutMs: 5000, intervalMs: DEFAULT_READINESS_INTERVAL_MS };

  it('resolves ready on the first successful attempt (no sleep)', async () => {
    let attempts = 0;
    const result = await pollUntilReady(
      async () => {
        attempts++;
        return true;
      },
      { ...base, ...fakeClock() },
    );
    assert.deepEqual(result, { ready: true });
    assert.equal(attempts, 1);
  });

  it('retries until an attempt succeeds', async () => {
    let attempts = 0;
    const result = await pollUntilReady(
      async () => {
        attempts++;
        return attempts >= 3;
      },
      { ...base, ...fakeClock() },
    );
    assert.deepEqual(result, { ready: true });
    assert.equal(attempts, 3);
  });

  it('gives up as not-ready once the deadline passes', async () => {
    let attempts = 0;
    const result = await pollUntilReady(
      async () => {
        attempts++;
        return false;
      },
      { ...base, timeoutMs: 1000, ...fakeClock() }, // 500ms interval → ~3 attempts (0, 500, 1000)
    );
    assert.deepEqual(result, { ready: false });
    // At least one attempt, and it stops after the deadline rather than looping forever.
    assert.ok(attempts >= 1 && attempts <= 4, `attempts was ${attempts}`);
  });

  it('stops immediately when the signal is already aborted (no attempt)', async () => {
    let attempts = 0;
    const result = await pollUntilReady(
      async () => {
        attempts++;
        return true;
      },
      { ...base, ...fakeClock(), signal: { aborted: true } },
    );
    assert.deepEqual(result, { ready: false });
    assert.equal(attempts, 0);
  });

  it('stops as not-ready when the signal aborts between attempts', async () => {
    const signal = { aborted: false };
    let attempts = 0;
    const result = await pollUntilReady(
      async () => {
        attempts++;
        signal.aborted = true; // aborted after the first failing attempt
        return false;
      },
      { ...base, ...fakeClock(), signal },
    );
    assert.deepEqual(result, { ready: false });
    assert.equal(attempts, 1);
  });
});

describe('readinessProblems', () => {
  it('accepts a valid port probe', () => {
    assert.deepEqual(readinessProblems('p', { kind: 'port', port: 8080, timeoutMs: 30000 }), []);
  });

  it('rejects an out-of-range or non-integer port', () => {
    assert.equal(readinessProblems('p', { kind: 'port', port: 0, timeoutMs: 1000 }).length, 1);
    assert.equal(readinessProblems('p', { kind: 'port', port: 70000, timeoutMs: 1000 }).length, 1);
    assert.equal(readinessProblems('p', { kind: 'port', port: 80.5, timeoutMs: 1000 }).length, 1);
  });

  it('accepts a valid http probe and rejects a bad URL', () => {
    assert.deepEqual(readinessProblems('p', { kind: 'http', url: 'http://localhost:3000/health', timeoutMs: 5000 }), []);
    assert.equal(readinessProblems('p', { kind: 'http', url: 'localhost:3000', timeoutMs: 5000 }).length, 1);
  });

  it('rejects a non-positive timeout and an out-of-range status', () => {
    assert.equal(readinessProblems('p', { kind: 'port', port: 8080, timeoutMs: 0 }).length, 1);
    assert.equal(
      readinessProblems('p', { kind: 'http', url: 'http://x.test', expectStatus: 99, timeoutMs: 5000 }).length,
      1,
    );
  });
});

describe('describeReadiness', () => {
  const cases: Array<[ReadinessProbe | undefined, string]> = [
    [undefined, 'process start'],
    [{ kind: 'port', port: 8080, timeoutMs: 30000 }, 'port 8080'],
    [{ kind: 'http', url: 'http://localhost:3000/health', timeoutMs: 5000 }, 'HTTP 200 @ http://localhost:3000/health'],
    [{ kind: 'http', url: 'http://x.test', expectStatus: 204, timeoutMs: 5000 }, 'HTTP 204 @ http://x.test'],
  ];
  for (const [probe, expected] of cases) {
    it(`describes ${expected}`, () => assert.equal(describeReadiness(probe), expected));
  }
});
