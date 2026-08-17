/**
 * Keyboard-shortcut list for the settings-page General tab (MS-017 / ADR-017).
 *
 * VSCode has no runtime keybinding API, so the extension's shortcuts are its static
 * `contributes.keybindings`. This pure helper turns those (plus the command titles from
 * `contributes.commands`) into display rows — read from the extension's OWN packageJSON so
 * the General tab is a single source of truth with no drift. `keybindings.json` overrides
 * are not readable via any API, so the rows show the *default* key; changing it is delegated
 * to the native Keyboard Shortcuts editor (deep-linked from the tab).
 */

/** A raw `contributes.keybindings` entry (only the fields we read). */
export interface RawKeybinding {
  command: string;
  key?: string;
  mac?: string;
  when?: string;
}

/** A raw `contributes.commands` entry (only the fields we read). */
export interface RawCommand {
  command: string;
  title: string;
}

/** One shortcut row the General tab renders. */
export interface ShortcutRow {
  command: string;
  title: string;
  key: string; // the default key for the current platform ('mac' field on darwin, else 'key')
}

/**
 * Build the General-tab shortcut rows from contributed keybindings + command titles.
 * `key` is resolved for the platform (darwin uses the `mac` field, falling back to `key`).
 * Entries with no usable key are dropped. Order follows the keybindings array.
 */
export function buildShortcutList(
  keybindings: RawKeybinding[],
  commands: RawCommand[],
  platform: NodeJS.Platform,
): ShortcutRow[] {
  const titleOf = new Map(commands.map((c) => [c.command, c.title]));
  const rows: ShortcutRow[] = [];
  for (const kb of keybindings) {
    if (!kb.command) {
      continue;
    }
    const key = platform === 'darwin' ? kb.mac ?? kb.key ?? '' : kb.key ?? '';
    if (!key) {
      continue;
    }
    rows.push({ command: kb.command, title: titleOf.get(kb.command) ?? kb.command, key });
  }
  return rows;
}
