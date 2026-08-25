import { strict as assert } from 'node:assert';
import * as vscode from 'vscode';
import { toExcludeGlob } from '../../core/scanExclude';

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
  'devSwitcher.stop',
  'devSwitcher.debug',
  'devSwitcher.openSettings',
  'devSwitcher.exportProfile',
  'devSwitcher.importProfile',
  'devSwitcher.doctor',
  'devSwitcher.rescan',
  'devSwitcher.toggleCompact',
  'devSwitcher.newProject',
  'devSwitcher.groups',
  'devSwitcher.runGroup',
  'devSwitcher.stopGroup',
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

/**
 * `devSwitcher.scan.exclude` rests on one assumption: that VS Code's glob engine accepts
 * a **top-level** brace list, where each alternative is a whole pattern. Everything the
 * scan used before nested the brace inside a single path instead, so this form was never
 * exercised. It cannot be checked by a unit test — only the real engine knows — and if it
 * silently failed the scan would either exclude nothing or exclude everything.
 */
describe('DevSwitcher — scan exclusions against the real glob engine', () => {
  const RS = '**/*.rs';

  it('finds the fixture source with no exclusions (baseline)', async () => {
    const hits = await vscode.workspace.findFiles(RS, toExcludeGlob(['target'], []));
    assert.ok(hits.length > 0, 'the cargo fixture should have at least one .rs file');
  });

  it('honours a user alternative in a top-level brace list', async () => {
    const hits = await vscode.workspace.findFiles(RS, toExcludeGlob(['target'], ['**/src/**']));
    assert.equal(hits.length, 0, 'excluding **/src/** should hide the fixture source');
  });

  it('excludes only what was listed — the other alternatives do not over-match', async () => {
    const hits = await vscode.workspace.findFiles(
      RS,
      toExcludeGlob(['target'], ['**/no-such-folder/**']),
    );
    assert.ok(hits.length > 0, 'an unrelated exclusion must leave the source visible');
  });
});
