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
  onLiveChange?: (value: ChipValue) => void,
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
    return pickMultiSelect(chip.label, quickItems, onLiveChange);
  }

  if (chip.secondaryToggle) {
    return pickWithToggle(chip.label, chip.secondaryToggle, items);
  }

  const picked = await vscode.window.showQuickPick(quickItems, { placeHolder: chip.label });
  return picked?.id;
}

/**
 * Multi-select pick (e.g. cargo features) as a toggle list — deliberately NOT
 * canSelectMany, whose mandatory OK button can't be hidden. Each row shows a
 * `$(check)`/`$(blank)` marker; Enter or click toggles it (the list stays open and
 * the chip updates live via onLiveChange), and Esc / click-away closes and commits
 * the toggled set — including the empty set (deselect-all → []). No confirm button.
 */
function pickMultiSelect(
  label: string,
  items: ChipQuickPickItem[],
  onLiveChange?: (ids: string[]) => void,
): Promise<string[]> {
  const selected = new Set(items.filter((item) => item.picked).map((item) => item.id));
  const idsOf = (): string[] => items.filter((item) => selected.has(item.id)).map((item) => item.id);

  return new Promise((resolve) => {
    const qp = vscode.window.createQuickPick<ChipQuickPickItem>();
    qp.placeholder = `${label} — Enter/click toggles, Esc closes`;

    const render = (): void => {
      const activeId = qp.activeItems[0]?.id;
      qp.items = items.map((item) => ({
        ...item,
        label: `${selected.has(item.id) ? '$(check)' : '$(blank)'} ${item.label}`,
      }));
      if (activeId !== undefined) {
        const match = qp.items.find((item) => item.id === activeId);
        if (match) {
          qp.activeItems = [match];
        }
      }
    };
    render();

    qp.onDidAccept(() => {
      const active = qp.activeItems[0];
      if (!active) {
        return;
      }
      if (selected.has(active.id)) {
        selected.delete(active.id);
      } else {
        selected.add(active.id);
      }
      render(); // stay open; reflect the new marker
      onLiveChange?.(idsOf());
    });
    qp.onDidHide(() => {
      qp.dispose();
      resolve(idsOf()); // closing commits the toggled set (no cancel for multi-select)
    });
    qp.show();
  });
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
