import { strict as assert } from 'node:assert';
import { buildShortcutList } from '../../ui/settingsPanel/shortcuts';

const KEYBINDINGS = [
  { command: 'devSwitcher.build', key: 'ctrl+alt+b', mac: 'cmd+alt+b', when: 'devSwitcher.hasProjects' },
  { command: 'devSwitcher.debug', key: 'ctrl+alt+d', mac: 'cmd+alt+d' },
];
const COMMANDS = [
  { command: 'devSwitcher.build', title: 'Build' },
  { command: 'devSwitcher.debug', title: 'Debug' },
];

describe('buildShortcutList', () => {
  it('joins keybindings with their command titles, using the platform key', () => {
    assert.deepEqual(buildShortcutList(KEYBINDINGS, COMMANDS, 'win32'), [
      { command: 'devSwitcher.build', title: 'Build', key: 'ctrl+alt+b' },
      { command: 'devSwitcher.debug', title: 'Debug', key: 'ctrl+alt+d' },
    ]);
  });

  it('prefers the mac field on darwin, falling back to key', () => {
    const rows = buildShortcutList(
      [{ command: 'devSwitcher.build', key: 'ctrl+alt+b', mac: 'cmd+alt+b' }, { command: 'devSwitcher.debug', key: 'ctrl+alt+d' }],
      COMMANDS,
      'darwin',
    );
    assert.equal(rows[0].key, 'cmd+alt+b');
    assert.equal(rows[1].key, 'ctrl+alt+d'); // no mac field → falls back to key
  });

  it('falls back to the command id when no title is contributed', () => {
    const rows = buildShortcutList([{ command: 'devSwitcher.run', key: 'ctrl+alt+r' }], [], 'linux');
    assert.deepEqual(rows, [{ command: 'devSwitcher.run', title: 'devSwitcher.run', key: 'ctrl+alt+r' }]);
  });

  it('drops entries with no usable key for the platform', () => {
    assert.deepEqual(buildShortcutList([{ command: 'devSwitcher.build', mac: 'cmd+alt+b' }], COMMANDS, 'win32'), []);
    assert.deepEqual(buildShortcutList([{ command: '', key: 'ctrl+alt+b' }], COMMANDS, 'win32'), []);
  });
});
