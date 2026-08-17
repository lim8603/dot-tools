import * as vscode from 'vscode';
import type { LanguageAdapter, ProjectInfo, Selection } from '../core/types';
import { defaultChipFormat } from './statusBarFormat';

const PROJECT_CHIP = 'project';
const SETTINGS_CHIP = 'settings';
const TOOLCHAIN_CHIP = 'toolchain';
const GROUP_CHIP = 'group';
const STOP_CHIP = 'stop';
const ACTION_CHIPS = ['build', 'debug', 'run'] as const;

/**
 * Fixed display orders for the trailing controls so their left→right order stays stable
 * regardless of how many chips precede them (chips use the running counter 0..k, always a
 * higher priority = further left). Sequence: build · debug · run · group · settings. The
 * group launcher (managed independently by setGroups) slots between run and the gear.
 */
const TRAILING_ORDER = { build: 900, debug: 901, run: 902, stop: 903, group: 904, settings: 905 } as const;

/** Options that colour special states on top of a normal render (F6 / §5.4). */
export interface RenderOptions {
  /** Manifest parse failed — mark the project chip and keep the last good render. */
  manifestError?: boolean;
  /**
   * Chip ids to omit for this project (TASK-041). The orchestrator resolves these from
   * each chip's `appliesTo` predicate; a hidden chip is drawn nowhere and swept out below.
   * Lets CMake show the Preset chip in place of profile/architecture when presets exist.
   */
  hiddenChipIds?: ReadonlySet<string>;
}

/**
 * StatusBarController — renders the active project's chips and action buttons purely
 * from ChipDescriptor[] (TASK-008, ADR-003 / 상세설계서 §5). It never learns which
 * language an adapter speaks: adding or changing an adapter touches no code here.
 *
 * Items are reused across renders (chipId → StatusBarItem). Execution of the action
 * buttons is the orchestrator/TaskRunner's job (MS-005); this only draws them. The
 * cargo/rustup-missing warning chip (E1, §5.4) is managed independently of render()
 * via setToolchainWarning — it must survive the no-active-project path (that is when
 * a missing toolchain zeroed the scan), so render()/hideAll() leave it alone.
 */
export class StatusBarController {
  private readonly items = new Map<string, vscode.StatusBarItem>();

  /** Draw the full status bar for the active project. */
  render(adapter: LanguageAdapter, project: ProjectInfo, sel: Selection, opts: RenderOptions = {}): void {
    let order = 0;
    // Compact mode drops the value text, leaving icon-only chips (hover/click for the
    // value) — for narrow windows. VSCode gives no status-bar-width signal, so it is a
    // user toggle (devSwitcher.statusBar.compact), not automatic.
    const dsConfig = vscode.workspace.getConfiguration('devSwitcher');
    const compact = dsConfig.get<boolean>('statusBar.compact', false);
    // selectedOnly hides optional chips that have no value (e.g. architecture 'default',
    // empty features) for a leaner bar. Required chips stay so a needed pick isn't hidden.
    const selectedOnly = dsConfig.get<boolean>('statusBar.selectedOnly', false);

    const projectItem = this.upsert(
      PROJECT_CHIP,
      compact ? '$(repo)' : `$(repo) ${project.name}`,
      project.name,
      'devSwitcher.switchProject',
      undefined,
      order++,
    );
    projectItem.backgroundColor = opts.manifestError
      ? new vscode.ThemeColor('statusBarItem.errorBackground')
      : undefined;
    projectItem.show();

    const shownChipIds: string[] = [];
    for (const chip of adapter.chips) {
      if (opts.hiddenChipIds?.has(chip.id)) {
        continue; // not applicable to this project (e.g. profile hidden while a preset is active)
      }
      const value = sel.values[chip.id];
      // A chip is "unselected" when it has no value, or its value reads as blank
      // (empty array, or a chip-defined default like features holding only 'default').
      const blank =
        value === undefined ||
        (chip.isBlank ? chip.isBlank(value) : Array.isArray(value) && value.length === 0);
      if (selectedOnly && blank && !chip.required) {
        continue; // hidden in selected-only mode (swept out below)
      }
      shownChipIds.push(chip.id);
      // Unset chips show a value-like `unsetText` when the adapter provides one (e.g.
      // 'default' for architecture = host target), else the '(Label)' prompt.
      const text =
        value !== undefined
          ? (chip.format?.(value) ?? defaultChipFormat(value))
          : (chip.unsetText ?? `(${chip.label})`);
      const tooltip =
        value !== undefined
          ? `${chip.label}: ${Array.isArray(value) ? value.join(', ') : value}`
          : chip.unsetText !== undefined
            ? `${chip.label}: ${chip.unsetText}`
            : chip.label;
      const label = compact ? `$(${chip.icon})` : `$(${chip.icon}) ${text}`;
      const item = this.upsert(chip.id, label, tooltip, 'devSwitcher.pickChip', [chip.id], order++);
      item.backgroundColor =
        chip.required && value === undefined
          ? new vscode.ThemeColor('statusBarItem.warningBackground')
          : undefined;
      item.show();
    }

    this.renderAction('build', '$(tools)', 'Build', 'devSwitcher.build', adapter.actions.build, TRAILING_ORDER.build);
    this.renderAction('debug', '$(debug-alt)', 'Debug', 'devSwitcher.debug', true, TRAILING_ORDER.debug);
    this.renderAction('run', '$(play)', 'Run', 'devSwitcher.run', true, TRAILING_ORDER.run);

    // The run-group launcher (TRAILING_ORDER.group) sits between Run and the gear; it is
    // shown/hidden by setGroups, not here, so it survives the no-active-project state.
    const gear = this.upsert(SETTINGS_CHIP, '$(gear)', 'DevSwitcher Settings', 'devSwitcher.openSettings', undefined, TRAILING_ORDER.settings);
    gear.show();

    // Hide any chip left over from a previously active adapter. The toolchain (E1) and
    // group (C-6) chips are owned by setToolchainWarning/setGroups, so they are always
    // exempt from this sweep.
    const visible = new Set<string>([
      PROJECT_CHIP,
      SETTINGS_CHIP,
      TOOLCHAIN_CHIP,
      GROUP_CHIP,
      STOP_CHIP, // owned by setStopVisible (running state), not this sweep
      ...shownChipIds,
      ...ACTION_CHIPS,
    ]);
    for (const [id, item] of this.items) {
      if (!visible.has(id)) {
        item.hide();
      }
    }
  }

  /**
   * Show or hide the E1 toolchain-missing warning chip (§5.4). Independent of render()
   * so it persists when a missing toolchain leaves no active project. Clicking it runs
   * Doctor. `refreshDiagnostics` (orchestrator) drives it from worstStatus.
   */
  setToolchainWarning(show: boolean, tooltip = 'DevSwitcher: toolchain issue — click to run Doctor'): void {
    if (!show) {
      this.items.get(TOOLCHAIN_CHIP)?.hide();
      return;
    }
    const item = this.upsert(TOOLCHAIN_CHIP, '$(warning) Toolchain', tooltip, 'devSwitcher.doctor', undefined, -1);
    item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    item.show();
  }

  /**
   * Show or hide the run-group launcher (C-6 / MS-013). Independent of render() — groups
   * are workspace-level, so the launcher persists across project switches and the no-active-
   * project state (like the toolchain chip). Hidden when no group is defined. Icon-only
   * (`$(run-all)`, plus a running count) — clicking opens the group menu (run / stop / stop-all).
   */
  setGroups(defined: number, running: number): void {
    if (defined === 0) {
      this.items.get(GROUP_CHIP)?.hide();
      return;
    }
    const tooltip =
      running > 0
        ? `DevSwitcher: ${running} run group(s) running — click to run or stop a group`
        : 'DevSwitcher: run groups';
    const text = running > 0 ? `$(run-all) ${running}` : '$(run-all)';
    const item = this.upsert(GROUP_CHIP, text, tooltip, 'devSwitcher.groups', undefined, TRAILING_ORDER.group);
    item.show();
  }

  /**
   * Show or hide the Stop button (F16 companion to Run). Independent of render() — the
   * orchestrator drives it from the active project's running state (a live `run`/`build`
   * task or an active debug session), so it appears only while there is something to stop,
   * sitting just after Run. Clicking it runs devSwitcher.stop.
   */
  setStopVisible(show: boolean): void {
    if (!show) {
      this.items.get(STOP_CHIP)?.hide();
      return;
    }
    const item = this.upsert(STOP_CHIP, '$(debug-stop)', 'DevSwitcher: Stop', 'devSwitcher.stop', undefined, TRAILING_ORDER.stop);
    item.show();
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

  /** Hide the project UI (no projects, or extension idle — §5.4). Keeps the E1 toolchain
   *  and group launcher chips, whose visibility setToolchainWarning/setGroups own. */
  hideAll(): void {
    for (const [id, item] of this.items) {
      if (id !== TOOLCHAIN_CHIP && id !== GROUP_CHIP) {
        item.hide();
      }
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
