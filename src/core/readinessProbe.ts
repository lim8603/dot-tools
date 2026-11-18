import * as http from 'node:http';
import * as https from 'node:https';
import * as net from 'node:net';
import { DEFAULT_READINESS_INTERVAL_MS, pollUntilReady, type AbortLike } from './readiness';
import type { ReadinessProbe } from './types';

/**
 * readinessProbe — the I/O side of run-group readiness (TASK-051, MS-018 / ADR-018).
 * vscode-free but not pure: it opens real TCP sockets / HTTP requests. The retry policy
 * is delegated to the pure pollUntilReady (core/readiness.ts); this module only supplies
 * a single attempt and the real clock/sleep. Node built-ins only (net/http/https), no
 * external dependency (ADR-009).
 */

/**
 * Loopback hosts for port probes — run groups target locally started services (ADR-018).
 * Both families: a dev server bound to `localhost` often listens on ::1 only (Node 17+
 * resolves localhost to IPv6 first on Windows/macOS), so probing 127.0.0.1 alone would
 * time a healthy member out.
 */
const PROBE_HOSTS = ['127.0.0.1', '::1'];
/** Per-attempt socket/request timeout so a black-hole host doesn't stall an attempt. */
const ATTEMPT_TIMEOUT_MS = 2000;

/**
 * Wait until the member's readiness probe passes or its timeout elapses. Uses the pure
 * poll loop with the real clock; `signal` (from the group's cancellation) aborts the wait.
 * Returns `{ ready:false }` on timeout/cancel — the caller treats that as a failed start.
 */
export function waitForReadiness(probe: ReadinessProbe, signal?: AbortLike): Promise<{ ready: boolean }> {
  const attempt = probe.kind === 'port'
    ? async (): Promise<boolean> => {
        for (const host of PROBE_HOSTS) {
          if (await probePort(host, probe.port, signal)) {
            return true; // a refused connect returns at once, so trying in turn is cheap
          }
        }
        return false;
      }
    : (): Promise<boolean> => probeHttp(probe.url, probe.expectStatus ?? 200, signal);
  return pollUntilReady(attempt, {
    timeoutMs: probe.timeoutMs,
    intervalMs: DEFAULT_READINESS_INTERVAL_MS,
    now: () => Date.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    signal,
  });
}

/** One TCP-connect attempt: resolves true when the port accepts a connection. */
export function probePort(host: string, port: number, signal?: AbortSignalLike): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let settled = false;
    let detach = (): void => undefined;
    const finish = (ok: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      detach();
      socket.destroy();
      resolve(ok);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(ATTEMPT_TIMEOUT_MS, () => finish(false));
    detach = onAbort(signal, () => finish(false));
  });
}

/** One HTTP(S) GET attempt: resolves true when the response status equals expectStatus. */
export function probeHttp(url: string, expectStatus: number, signal?: AbortSignalLike): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let detach = (): void => undefined;
    const get = url.toLowerCase().startsWith('https:') ? https.get : http.get;
    const finish = (ok: boolean): void => {
      if (!settled) {
        settled = true;
        detach();
        resolve(ok);
      }
    };
    const request = get(url, (response) => {
      const ok = response.statusCode === expectStatus;
      response.resume(); // drain so the socket can be reused/closed
      finish(ok);
    });
    request.once('error', () => finish(false));
    request.setTimeout(ATTEMPT_TIMEOUT_MS, () => {
      request.destroy();
      finish(false);
    });
    detach = onAbort(signal, () => {
      request.destroy();
      finish(false);
    });
  });
}

/** Abort surface used by the probes — a Node/DOM AbortSignal satisfies it. */
interface AbortSignalLike extends AbortLike {
  addEventListener?(type: 'abort', listener: () => void, options?: { once?: boolean }): void;
  removeEventListener?(type: 'abort', listener: () => void): void;
}

/** Run `handler` when the signal aborts (immediately if already aborted), returning a
 *  detach function. Every attempt must detach when it settles: the group's one signal
 *  lives for the whole wait, and a listener per attempt (every 500 ms) would pile up.
 *  Tolerates a plain AbortLike without addEventListener (used in unit tests). */
function onAbort(signal: AbortSignalLike | undefined, handler: () => void): () => void {
  if (!signal) {
    return () => undefined;
  }
  if (signal.aborted) {
    handler();
    return () => undefined;
  }
  signal.addEventListener?.('abort', handler, { once: true });
  return () => signal.removeEventListener?.('abort', handler);
}
