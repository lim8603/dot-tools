import * as vscode from 'vscode';
import type { ChipDescriptor, ChipValue, ProjectInfo } from '../core/types';

interface ChipQuickPickItem extends vscode.QuickPickItem {
  id: string;
}

/**
 * Show a chip's QuickPick and return the picked value (TASK-008, 상세설계서 §5.3).
 * The current selection is pre-checked. Returns undefined when the user cancels;
 * for a multiSelect an empty array means "deselect all" (distinct from cancel).
 */
export async function pickChipValue(
  chip: ChipDescriptor,
  project: ProjectInfo,
  current: ChipValue | undefined,
): Promise<ChipValue | undefined> {
  const items = await chip.listItems(project);
  if (items.length === 0) {
    void vscode.window.showInformationMessage(`No ${chip.label} options available.`);
    return undefined;
  }

  const selectedIds = new Set(
    Array.isArray(current) ? current : current !== undefined ? [current] : [],
  );
  const quickItems: ChipQuickPickItem[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description,
    detail: item.detail,
    picked: selectedIds.has(item.id),
  }));

  if (chip.multiSelect) {
    const picked = await vscode.window.showQuickPick(quickItems, {
      canPickMany: true,
      placeHolder: chip.label,
    });
    return picked ? picked.map((item) => item.id) : undefined; // undefined = cancelled
  }

  const picked = await vscode.window.showQuickPick(quickItems, { placeHolder: chip.label });
  return picked?.id;
}
