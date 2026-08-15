import type { DiagnosticItem, DiagnosticProbe, DiagnosticStatus } from './types';

/**
 * Doctor diagnostics — pure, vscode-free classification (TASK-016, F19 / 상세설계서 §13).
 *
 * Adapters emit raw DiagnosticProbe[] (they own the toolchain/extension probing);
 * this module derives each probe's status and orders the list so Doctor (TASK-017)
 * only has to render. Kept vscode-free and unit-tested (coding_convention: 순수 함수
 * 분리). Doctor stays adapter-agnostic (§13.5) — no language knowledge lives here.
 */

/** Sort priority: unsatisfied checks first, passing ones last (a Doctor surfaces problems). */
const STATUS_RANK: Record<DiagnosticStatus, number> = { error: 0, warn: 1, info: 2, ok: 3 };

/**
 * Classify probes into items and order them by severity (error → warn → info → ok),
 * stable within a status group. A probe's resolution is dropped once it reads 'ok'
 * so the UI never offers a fix for something already satisfied.
 */
export function buildDiagnostics(probes: DiagnosticProbe[]): DiagnosticItem[] {
  return probes.map(toItem).sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
}

/** Codicon id for a status — used by the Doctor QuickPick (`$(<icon>)`). */
export function diagnosticIcon(status: DiagnosticStatus): string {
  return { ok: 'check', warn: 'warning', error: 'error', info: 'info' }[status];
}

/** The worst status across items — for the E1 warning-chip decision (TASK-017). */
export function worstStatus(items: DiagnosticItem[]): DiagnosticStatus {
  return items.reduce<DiagnosticStatus>(
    (worst, item) => (STATUS_RANK[item.status] < STATUS_RANK[worst] ? item.status : worst),
    'ok',
  );
}

function toItem(probe: DiagnosticProbe): DiagnosticItem {
  const status = deriveStatus(probe);
  const item: DiagnosticItem = { id: probe.id, label: probe.label, status, tier: probe.tier };
  if (probe.detail !== undefined) {
    item.detail = probe.detail;
  }
  if (status !== 'ok' && probe.resolution !== undefined) {
    item.resolution = probe.resolution;
  }
  return item;
}

/**
 * Status from (severity, present): info checks are always informational; otherwise a
 * satisfied check is ok, and an unsatisfied one is an error when critical (E1 — cargo
 * missing) or a warning when optional (rustup / an extension / a missing target).
 */
function deriveStatus(probe: DiagnosticProbe): DiagnosticStatus {
  if (probe.severity === 'info') {
    return 'info';
  }
  if (probe.present) {
    return 'ok';
  }
  return probe.severity === 'critical' ? 'error' : 'warn';
}
