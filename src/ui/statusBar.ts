import * as vscode from 'vscode';
import type { LanguageAdapter, ProjectInfo, Selection } from '../core/types';
import { defaultChipFormat } from './statusBarFormat';

const PROJECT_CHIP = 'project';
const ACTION_CHIPS = ['build', 'debug', 'run'] as const;

/** Options that colour special states on top of a normal render (F6 / §5.4). */
export interface RenderOptions {
  /** Manifest parse failed — mark the project chip and keep the last good render. */
  manifestError?: boolean;
}

/**
 * StatusBarController — renders the active project's chips and action buttons purely
 * from ChipDescriptor[] (TASK-008, ADR-003 / 상세설계서 §5). It never learns which
 * language an adapter speaks: adding or changing an adapter touches no code here.
 *
 * Items are reused across renders (chipId → StatusBarItem). Execution of the action
 * buttons is the orchestrator/TaskRunner's job (MS-005); this only draws them. The
 * cargo/rustup-missing warning chip (E1) is deferred with the Doctor flow (MS-007).
 */
export class StatusBarController {
  private readonly items = new Map<string, vscode.StatusBarItem>();

  /** Draw the full status bar for the active project. */
  render(adapter: LanguageAdapter, project: ProjectInfo, sel: Selection, opts: RenderOptions = {}): void {
    let order = 0;

    const projectItem = this.upsert(
      PROJECT_CHIP,
      `$(repo) ${project.name}`,
      project.name,
      'devSwitcher.switchProject',
      undefined,
      order++,
    );
    projectItem.backgroundColor = opts.manifestError
      ? new vscode.ThemeColor('statusBarItem.errorBackground')
      : undefined;
    projectItem.show();

    for (const chip of adapter.chips) {
      const value = sel.values[chip.id];
      const text =
        value !== undefined ? (chip.format?.(value) ?? defaultChipFormat(value)) : `(${chip.label})`;
      const tooltip =
        value !== undefined
          ? `${chip.label}: ${Array.isArray(value) ? value.join(', ') : value}`
          : chip.label;
      const item = this.upsert(chip.id, `$(${chip.icon}) ${text}`, tooltip, 'devSwitcher.pickChip', [chip.id], order++);
      item.backgroundColor =
        chip.required && value === undefined
          ? new vscode.ThemeColor('statusBarItem.warningBackground')
          : undefined;
      item.show();
    }

    this.renderAction('build', '$(tools)', 'Build', 'devSwitcher.build', adapter.actions.build, order++);
    this.renderAction('debug', '$(debug-alt)', 'Debug', 'devSwitcher.debug', true, order++);
    this.renderAction('run', '$(play)', 'Run', 'devSwitcher.run', true, order++);

    // Hide any chip left over from a previously active adapter.
    const visible = new Set<string>([PROJECT_CHIP, ...adapter.chips.map((c) => c.id), ...ACTION_CHIPS]);
    for (const [id, item] of this.items) {
      if (!visible.has(id)) {
        item.hide();
      }
    }
  }

  /**
   * Show an action button as busy — spinner, no command (§5.4). Cleared by the next
   * render(), which the orchestrator calls when the task finishes.
   */
  markActionBusy(actionId: string): void {
    const item = this.items.get(actionId);
    if (item) {
      item.text = '$(sync~spin)';
      item.command = undefined;
    }
  }

  /** Hide the whole status bar (no projects, or extension idle — §5.4). */
  hideAll(): void {
    for (const item of this.items.values()) {
      item.hide();
    }
  }

  dispose(): void {
    for (const item of this.items.values()) {
      item.dispose();
    }
    this.items.clear();
  }

  private renderAction(
    id: string,
    icon: string,
    title: string,
    command: string,
    enabled: boolean,
    order: number,
  ): void {
    const item = this.upsert(id, icon, title, command, undefined, order);
    if (enabled) {
      item.show();
    } else {
      item.hide();
    }
  }

  private upsert(
    id: string,
    text: string,
    tooltip: string,
    command: string,
    args: unknown[] | undefined,
    order: number,
  ): vscode.StatusBarItem {
    let item = this.items.get(id);
    if (!item) {
      // Higher priority renders further left, so the project chip (order 0) leads.
      item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000 - order);
      this.items.set(id, item);
    }
    item.text = text;
    item.tooltip = tooltip;
    item.command = args && args.length > 0 ? { title: id, command, arguments: args } : command;
    return item;
  }
}
