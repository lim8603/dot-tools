import type { ReadinessProbe } from './types';

/**
 * readiness — pure (vscode-free) readiness polling + validation for run-group members
 * (TASK-051, MS-018 / ADR-018). The control loop (when to retry, when to give up) lives
 * here with injected clock/sleep/signal so it is unit-testable in plain Node; the real
 * TCP/HTTP probes are the injected `attempt` (core/readinessProbe.ts).
 */

/** Default gap between readiness attempts (ms). */
export const DEFAULT_READINESS_INTERVAL_MS = 500;

/** The minimal abort surface the loop needs — satisfied by a DOM/Node AbortSignal. */
export interface AbortLike {
  readonly aborted: boolean;
}

export interface PollOptions {
  /** Overall budget from the first attempt until giving up. */
  timeoutMs: number;
  /** Gap between attempts. */
  intervalMs: number;
  /** Monotonic-ish clock (Date.now in production; a fake in tests). */
  now: () => number;
  /** Sleep between attempts (real setTimeout in production; resolves instantly in tests). */
  sleep: (ms: number) => Promise<void>;
  /** Cancels the wait early (user cancelled the group start). */
  signal?: AbortLike;
}

/**
 * Poll `attempt` until it resolves true or the deadline passes. One attempt runs
 * immediately; further attempts are spaced by `intervalMs` until `timeoutMs` elapses.
 * Returns `{ ready:false }` on timeout or when `signal` aborts — never throws for a
 * failed attempt (the caller treats not-ready as a failed start).
 */
export async function pollUntilReady(
  attempt: () => Promise<boolean>,
  opts: PollOptions,
): Promise<{ ready: boolean }> {
  const deadline = opts.now() + opts.timeoutMs;
  for (;;) {
    if (opts.signal?.aborted) {
      return { ready: false };
    }
    if (await attempt()) {
      return { ready: true };
    }
    if (opts.signal?.aborted || opts.now() >= deadline) {
      return { ready: false };
    }
    await opts.sleep(opts.intervalMs);
  }
}

/**
 * Structural problems with a readiness probe (pure). Empty array = valid. Surfaced by
 * validateGroup so a malformed probe blocks the run instead of hanging. Messages are
 * developer-facing English (not localized), matching runGroupPlan's validateGroup.
 */
export function readinessProblems(projectId: string, probe: ReadinessProbe): string[] {
  const problems: string[] = [];
  if (probe.timeoutMs <= 0) {
    problems.push(`${projectId} readiness timeout must be greater than 0.`);
  }
  if (probe.kind === 'port') {
    if (!Number.isInteger(probe.port) || probe.port < 1 || probe.port > 65535) {
      problems.push(`${projectId} readiness port must be an integer between 1 and 65535.`);
    }
  } else {
    if (!/^https?:\/\/.+/i.test(probe.url)) {
      problems.push(`${projectId} readiness URL must start with http:// or https://.`);
    }
    if (probe.expectStatus !== undefined && (probe.expectStatus < 100 || probe.expectStatus > 599)) {
      problems.push(`${projectId} readiness status code must be between 100 and 599.`);
    }
  }
  return problems;
}

/** One-line human description of a readiness gate, for status/tooltips (pure). */
export function describeReadiness(probe: ReadinessProbe | undefined): string {
  if (!probe) {
    return 'process start';
  }
  if (probe.kind === 'port') {
    return `port ${probe.port}`;
  }
  return `HTTP ${probe.expectStatus ?? 200} @ ${probe.url}`;
}
