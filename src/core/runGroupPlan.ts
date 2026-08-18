import { readinessProblems } from './readiness';
import type { ReadinessProbe, RunGroup, RunGroupMember } from './types';

/**
 * runGroupPlan — pure (vscode-free) derivation of a run group's execution plan
 * (TASK-036, C-6 / MS-013 / ADR-015). The GroupOrchestrator (TASK-037) executes
 * the plan (start tasks, wait for readiness, teardown); this module only decides
 * the order and validates the definition, so both stay unit-testable in plain Node.
 */

/** The layered topological plan for starting a group's members. */
export interface GroupPlan {
  /**
   * Members grouped into start layers. Every member in layer i depends only on
   * members in layers < i, so a layer can start once the previous layer is ready.
   * Members within a layer have no ordering constraint and may start in parallel.
   * Order within a layer preserves member declaration order (stable).
   */
  layers: string[][];
  /**
   * Present when a dependency cycle prevents a full ordering — the projectIds still
   * involved when no member could be scheduled. When set, `layers` holds the members
   * that were orderable before the cycle blocked progress.
   */
  cycle?: string[];
}

/**
 * Layer the members topologically (Kahn's algorithm). A member is ready for the
 * next layer once every intra-group dependency it names is already placed. Deps
 * that point outside the member set or at the member itself are ignored here —
 * validateGroup surfaces those as definition errors; the plan just orders what
 * can be ordered and reports a cycle if progress stalls.
 */
export function planGroupExecution(group: RunGroup): GroupPlan {
  return planLayers(group.members);
}

function planLayers(members: RunGroupMember[]): GroupPlan {
  const memberIds = members.map((m) => m.projectId);
  const memberSet = new Set(memberIds);
  const deps = new Map<string, Set<string>>();
  for (const member of members) {
    const intra = member.dependsOn.filter((d) => d !== member.projectId && memberSet.has(d));
    deps.set(member.projectId, new Set(intra));
  }

  const layers: string[][] = [];
  const placed = new Set<string>();
  let remaining = memberIds;

  while (remaining.length > 0) {
    const ready = remaining.filter((id) => every(deps.get(id), (d) => placed.has(d)));
    if (ready.length === 0) {
      return { layers, cycle: remaining };
    }
    layers.push(ready);
    for (const id of ready) {
      placed.add(id);
    }
    remaining = remaining.filter((id) => !placed.has(id));
  }

  return { layers };
}

function every(set: Set<string> | undefined, predicate: (value: string) => boolean): boolean {
  if (!set) {
    return true;
  }
  for (const value of set) {
    if (!predicate(value)) {
      return false;
    }
  }
  return true;
}

/**
 * Structural problems with a group definition — an empty array means it is runnable.
 * Surfaced by the settings UI before saving (TASK-038) and guarded by the
 * GroupOrchestrator before running (TASK-037). Detects: no members, a member listed
 * twice, a member depending on itself, a dependency on a non-member (dangling), and a
 * dependency cycle. Messages are plain English (developer-facing, not localized).
 */
export function validateGroup(group: RunGroup): string[] {
  const problems: string[] = [];

  if (group.members.length === 0) {
    problems.push('The group has no members.');
  }

  const seen = new Set<string>();
  for (const member of group.members) {
    if (seen.has(member.projectId)) {
      problems.push(`Duplicate member: ${member.projectId}.`);
    }
    seen.add(member.projectId);
  }

  const memberSet = new Set(group.members.map((m) => m.projectId));
  for (const member of group.members) {
    for (const dep of member.dependsOn) {
      if (dep === member.projectId) {
        problems.push(`${member.projectId} depends on itself.`);
      } else if (!memberSet.has(dep)) {
        problems.push(`${member.projectId} depends on ${dep}, which is not a member of the group.`);
      }
    }
    // Readiness gate, if set, must be well-formed (MS-018 / ADR-018) or the run would
    // hang / never become ready.
    if (member.readiness) {
      problems.push(...readinessProblems(member.projectId, member.readiness));
    }
  }

  if (planGroupExecution(group).cycle) {
    problems.push('The group has a dependency cycle.');
  }

  return problems;
}

/**
 * Add or remove a project as a group member (pure). Removing a member also drops it from
 * every other member's dependsOn, so no dangling reference is left behind. A no-op add of
 * an existing member (or remove of a non-member) returns the group unchanged.
 */
export function withMember(group: RunGroup, projectId: string, member: boolean): RunGroup {
  const has = group.members.some((m) => m.projectId === projectId);
  if (member && !has) {
    return { ...group, members: [...group.members, { projectId, dependsOn: [] }] };
  }
  if (!member && has) {
    const members = group.members
      .filter((m) => m.projectId !== projectId)
      .map((m) => ({ ...m, dependsOn: m.dependsOn.filter((d) => d !== projectId) }));
    return { ...group, members };
  }
  return group;
}

/** Replace one member's dependsOn, keeping only ids that are members and not itself (pure). */
export function withMemberDependencies(group: RunGroup, projectId: string, dependsOn: string[]): RunGroup {
  const memberIds = new Set(group.members.map((m) => m.projectId));
  const cleaned = dependsOn.filter((d) => d !== projectId && memberIds.has(d));
  const members = group.members.map((m) => (m.projectId === projectId ? { ...m, dependsOn: cleaned } : m));
  return { ...group, members };
}

/**
 * Set (or clear) one member's readiness gate (MS-018 / ADR-018, pure). Passing `undefined`
 * removes the field so the member falls back to process-spawn readiness. A no-op for a
 * non-member. The stored probe is not validated here — validateGroup surfaces problems.
 */
export function withMemberReadiness(
  group: RunGroup,
  projectId: string,
  readiness: ReadinessProbe | undefined,
): RunGroup {
  const members = group.members.map((member) => {
    if (member.projectId !== projectId) {
      return member;
    }
    if (readiness === undefined) {
      // Drop only `readiness` (falls back to process-spawn) — other member fields
      // (debug launch mode, dependsOn) survive the clear.
      const rest = { ...member };
      delete rest.readiness;
      return rest;
    }
    return { ...member, readiness };
  });
  return { ...group, members };
}

// ── Stage view (settings UI) ──────────────────────────────────────────────────
// The UI expresses order as a per-member 1-based "stage": same stage = parallel, a
// higher stage starts after every lower stage. Stages are derived from the dependsOn
// DAG (a member's stage = its layer index + 1) and, on edit, converted back to
// dependsOn (a member depends on every member in a lower stage). dependsOn stays the
// stored model + engine input; stages are just a simpler, order-preserving projection.

/** Each member's 1-based stage (= its layer index + 1). A member caught in a cycle —
 *  which the stage editor can't create — falls back to stage 1. */
export function memberStages(group: RunGroup): Map<string, number> {
  const stages = new Map<string, number>();
  planGroupExecution(group).layers.forEach((layer, index) => {
    for (const id of layer) {
      stages.set(id, index + 1);
    }
  });
  for (const member of group.members) {
    if (!stages.has(member.projectId)) {
      stages.set(member.projectId, 1);
    }
  }
  return stages;
}

/**
 * Set one member's launch mode (MS-021 / ADR-020): debug=true launches it under the
 * debugger during a group start; false clears back to a plain run (the flag is dropped,
 * keeping the persisted member additive-minimal). Ignores a non-member (pure).
 */
export function withMemberLaunch(group: RunGroup, projectId: string, debug: boolean): RunGroup {
  const members = group.members.map((member) => {
    if (member.projectId !== projectId) {
      return member;
    }
    if (!debug) {
      const rest = { ...member };
      delete rest.debug;
      return rest;
    }
    return { ...member, debug: true };
  });
  return { ...group, members };
}

/** Set one member's stage (>= 1) and rebuild every member's dependsOn from the resulting
 *  stage map: a member depends on exactly the members in a strictly lower stage (pure). */
export function withMemberStage(group: RunGroup, projectId: string, stage: number): RunGroup {
  const stages = memberStages(group);
  if (!stages.has(projectId)) {
    return group; // not a member
  }
  stages.set(projectId, Math.max(1, Math.floor(stage)));
  const members = group.members.map((member) => {
    const own = stages.get(member.projectId) ?? 1;
    const dependsOn = group.members
      .filter((other) => other.projectId !== member.projectId && (stages.get(other.projectId) ?? 1) < own)
      .map((other) => other.projectId);
    return { ...member, dependsOn };
  });
  return { ...group, members };
}
