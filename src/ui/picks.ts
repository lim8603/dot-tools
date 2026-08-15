import * as vscode from 'vscode';
import type { ChipDescriptor, ChipItem, ChipValue, ProjectInfo } from '../core/types';

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

  if (chip.secondaryToggle) {
    return pickWithToggle(chip.label, chip.secondaryToggle, items);
  }

  const picked = await vscode.window.showQuickPick(quickItems, { placeHolder: chip.label });
  return picked?.id;
}

/**
 * Single-select pick that hides `secondary` items behind a toolbar toggle (§13.4).
 * Uses createQuickPick so we can add the button; collapsed by default so a long tail
 * (e.g. ~90 not-installed rustup targets) stays out of the way until requested.
 */
function pickWithToggle(
  label: string,
  toggleTooltip: string,
  items: ChipItem[],
): Promise<string | undefined> {
  const toItem = (item: ChipItem): ChipQuickPickItem => ({
    id: item.id,
    label: item.label,
    description: item.description,
    detail: item.detail,
  });
  const primary = items.filter((item) => !item.secondary);
  const expand: vscode.QuickInputButton = { iconPath: new vscode.ThemeIcon('cloud-download'), tooltip: toggleTooltip };
  const collapse: vscode.QuickInputButton = { iconPath: new vscode.ThemeIcon('list-filter'), tooltip: 'Show installed only' };

  return new Promise((resolve) => {
    const qp = vscode.window.createQuickPick<ChipQuickPickItem>();
    qp.placeholder = label;
    let showAll = false;
    let result: string | undefined;

    const apply = (): void => {
      qp.items = (showAll ? items : primary).map(toItem);
      qp.buttons = [showAll ? collapse : expand];
    };
    apply();

    qp.onDidTriggerButton(() => {
      showAll = !showAll;
      apply();
    });
    qp.onDidAccept(() => {
      result = qp.selectedItems[0]?.id;
      qp.hide();
    });
    qp.onDidHide(() => {
      qp.dispose();
      resolve(result); // undefined on Escape
    });
    qp.show();
  });
}
