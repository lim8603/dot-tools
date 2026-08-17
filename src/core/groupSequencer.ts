import type { AbortLike } from './readiness';

/**
 * groupSequencer — pure (vscode-free) layer-by-layer start sequencing for a run group
 * (TASK-037, C-6 / MS-013 / ADR-015). The order comes from planGroupExecution's layers;
 * the actual member start is injected as `startMember`, so the sequencing — start a
 * layer in parallel, await readiness, advance, and tear down on failure — is unit-
 * testable with fakes and knows nothing about vscode or adapters.
 */

/** A started member the sequencer can wait on and stop. Produced by the injected starter. */
export interface MemberHandle {
  /** Resolves when the member is ready — its process spawned (ADR-015) and, if the member
   *  declares one, its readiness probe passed (MS-018 / ADR-018) — or `started:false` when
   *  it fails to start / times out / is cancelled. */
  ready: Promise<{ started: boolean }>;
  /** Stop the member (used to tear down already-started members on abort). */
  terminate(): void;
}

/** The outcome of sequencing a group's start. */
export interface SequenceOutcome {
  /** Members that became ready, in start order. */
  started: string[];
  /** true when a member failed to start and the started ones were torn down. */
  aborted: boolean;
  /** The member that failed to start (set only when aborted). */
  failed?: string;
}

/**
 * Start a group's members layer by layer. Within a layer every member starts in
 * parallel; the next layer starts only once the whole current layer is ready, so a
 * dependent never starts before the members it depends on (ADR-015). If a member
 * throws while starting or reports `started:false`, every member started so far is
 * terminated (reverse order) and the run aborts.
 *
 * `startMember` performs the real work (resolve project/adapter, optional build, start
 * the run task) and returns a MemberHandle; a throw means that member could not start.
 *
 * `signal` (MS-018 / ADR-018) cancels the start: checked before each layer so a cancel
 * between layers stops before the next one begins. A cancel during a layer's readiness
 * wait surfaces as a member reporting `started:false` (the injected readiness gate honours
 * the same signal), which aborts and tears down like any failed start.
 */
export async function sequenceGroup(
  layers: string[][],
  startMember: (projectId: string) => Promise<MemberHandle>,
  signal?: AbortLike,
): Promise<SequenceOutcome> {
  const handles: MemberHandle[] = [];
  const started: string[] = [];

  const teardown = (): void => {
    for (const handle of [...handles].reverse()) {
      handle.terminate();
    }
  };

  for (const layer of layers) {
    if (signal?.aborted) {
      teardown();
      return { started, aborted: true };
    }
    // Start every member in this layer concurrently. A throw becomes an undefined slot.
    const startedLayer = await Promise.all(
      layer.map(async (projectId) => {
        try {
          return { projectId, handle: await startMember(projectId) };
        } catch {
          return { projectId, handle: undefined as MemberHandle | undefined };
        }
      }),
    );

    for (const { projectId, handle } of startedLayer) {
      if (!handle) {
        teardown();
        return { started, aborted: true, failed: projectId };
      }
      handles.push(handle);
    }

    // Advance only when the whole layer is ready.
    const readiness = await Promise.all(startedLayer.map((entry) => entry.handle!.ready));
    for (let i = 0; i < readiness.length; i++) {
      if (readiness[i].started) {
        started.push(startedLayer[i].projectId);
      } else {
        teardown();
        return { started, aborted: true, failed: startedLayer[i].projectId };
      }
    }
  }

  return { started, aborted: false };
}
