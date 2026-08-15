import * as vscode from 'vscode';
import { diagnosticIcon } from '../core/diagnostics';
import type { DiagnosticItem } from '../core/types';

interface DoctorQuickPickItem extends vscode.QuickPickItem {
  diagnostic: DiagnosticItem;
}

/**
 * Show the Doctor QuickPick (TASK-017, F19 / 상세설계서 §13.5) and return the picked
 * item. Each row shows its status codicon, label, and detail (version/note); a row
 * with a resolution appends a hint. The orchestrator dispatches the resolution — this
 * only presents the list. Returns undefined on cancel.
 */
export async function pickDiagnostic(items: DiagnosticItem[]): Promise<DiagnosticItem | undefined> {
  const quickItems: DoctorQuickPickItem[] = items.map((item) => ({
    diagnostic: item,
    label: `$(${diagnosticIcon(item.status)}) ${item.label}`,
    description: item.detail,
    detail: item.resolution ? resolutionHint(item) : undefined,
  }));

  const picked = await vscode.window.showQuickPick(quickItems, {
    placeHolder: 'DevSwitcher — environment diagnostics (select an item to resolve)',
    matchOnDetail: true,
  });
  return picked?.diagnostic;
}

/** A short "what selecting this does" line, so actionable rows read as actionable. */
function resolutionHint(item: DiagnosticItem): string | undefined {
  const r = item.resolution;
  switch (r?.kind) {
    case 'installExtension':
      return `Install ${r.extensionId}`;
    case 'installTarget':
      return `Install target ${r.triple}`;
    case 'runCommand':
      return `Run: ${r.command} ${r.args.join(' ')}`.trim();
    case 'openUrl':
      return `Open ${r.url}`;
    default:
      return undefined;
  }
}
