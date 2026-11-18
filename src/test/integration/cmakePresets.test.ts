import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { cmakeAdapter } from '../../adapters/cmake/cmakeAdapter';
import type { ProjectInfo } from '../../core/types';

/**
 * TASK-067 — a module whose CMakePresets.json only `include`s a shared presets file must
 * still drive the Preset chip. The tree lives in the OS temp dir, outside the workspace
 * folder (on Windows usually another drive), which also exercises reading presets files
 * by absolute path through workspace.fs.
 */
describe('CMake presets — include + condition (TASK-067)', () => {
  let tmp: string;
  let project: ProjectInfo;

  before(() => {
    tmp = mkdtempSync(join(tmpdir(), 'devswitcher-presets-'));
    const lockfree = join(tmp, 'modules', 'lockfree');
    const shared = join(tmp, 'modules', 'tools', 'presets');
    mkdirSync(lockfree, { recursive: true });
    mkdirSync(shared, { recursive: true });
    writeFileSync(join(lockfree, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.21)\nproject(lockfree NONE)\n');
    writeFileSync(
      join(lockfree, 'CMakePresets.json'),
      JSON.stringify({ version: 6, include: ['../tools/presets/hdr_presets.json'] }),
    );
    writeFileSync(
      join(shared, 'hdr_presets.json'),
      JSON.stringify({
        version: 6,
        configurePresets: [
          { name: 'base', hidden: true, binaryDir: '${sourceDir}/out/${presetName}' },
          { name: 'win-msvc', inherits: 'base', condition: { type: 'equals', lhs: '${hostSystemName}', rhs: 'Windows' } },
          { name: 'linux-gcc', inherits: 'base', condition: { type: 'equals', lhs: '${hostSystemName}', rhs: 'Linux' } },
        ],
      }),
    );
    project = {
      id: 'cmake:lockfree',
      name: 'lockfree',
      adapterId: 'cmake',
      manifestPath: join(lockfree, 'CMakeLists.txt'),
      workspaceFolder: vscode.workspace.workspaceFolders![0],
    };
  });

  after(() => {
    cmakeAdapter.invalidateCache();
    rmSync(tmp, { recursive: true, force: true });
  });

  const expected = process.platform === 'win32' ? ['win-msvc'] : process.platform === 'linux' ? ['linux-gcc'] : [];

  it('offers the included presets enabled on this host as the Preset chip', async () => {
    const chip = cmakeAdapter.chips.find((c) => c.id === 'preset')!;
    assert.equal(await chip.appliesTo!(project), expected.length > 0, 'the Preset chip shows when a preset is enabled');
    const items = await chip.listItems(project, { probe: false });
    assert.deepEqual(items.map((i) => i.id), expected);
    assert.equal(await chip.defaultValue!(project, { probe: false }), expected[0], 'the sole preset is auto-selected');
  });

  it('hides the plain-path Configuration chip when presets drive configure', async function () {
    if (expected.length === 0) { this.skip(); }
    const profile = cmakeAdapter.chips.find((c) => c.id === 'profile')!;
    assert.equal(await profile.appliesTo!(project), false);
  });
});
