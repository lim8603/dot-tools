import { strict as assert } from 'node:assert';
import * as vscode from 'vscode';

/**
 * Integration smoke tests (TASK-020, 상세설계서 §15.2). Run in a real VSCode host via
 * `@vscode/test-cli` (npm run test:integration) with the cargo fixture as the
 * workspace. These cover what unit tests cannot: the extension actually activates and
 * contributes its commands. Deeper scenarios (chip picks, build/run, debug, Doctor,
 * WSL) stay in the manual checklist in 05_verification/test_case.md — they need user
 * interaction or a toolchain the CI host may lack.
 */

const EXTENSION_ID = 'lim8603.devswitcher-tools';

const CONTRIBUTED_COMMANDS = [
  'devSwitcher.switchProject',
  'devSwitcher.pickChip',
  'devSwitcher.build',
  'devSwitcher.run',
  'devSwitcher.debug',
  'devSwitcher.openSettings',
  'devSwitcher.exportProfile',
  'devSwitcher.importProfile',
  'devSwitcher.doctor',
  'devSwitcher.toggleCompact',
  'devSwitcher.newProject',
];

describe('DevSwitcher — activation smoke', () => {
  it('the extension is present and activates', async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `extension ${EXTENSION_ID} should be installed in the host`);
    await extension.activate();
    assert.equal(extension.isActive, true);
  });

  it('registers every contributed command', async () => {
    const commands = await vscode.commands.getCommands(true);
    for (const command of CONTRIBUTED_COMMANDS) {
      assert.ok(commands.includes(command), `command not registered: ${command}`);
    }
  });

  it('opens the settings page without throwing', async () => {
    await vscode.commands.executeCommand('devSwitcher.openSettings');
  });
});
