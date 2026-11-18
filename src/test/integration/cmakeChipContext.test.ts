import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { cmakeAdapter } from '../../adapters/cmake/cmakeAdapter';
import type { InvocationConfig, ProjectInfo, Selection } from '../../core/types';

/**
 * R-2 / ADR-024 — the first Build of a CMake project with Architecture x64 and no Target
 * yet: seeding the Target used to configure `build/` without `-A`, and the build's own
 * configure with `-A x64` then failed ("Does not match the platform used previously").
 * With the chip context the seed configures the very tree the build uses, once.
 */
describe('CMake Target seeding uses the build’s own tree (R-2, ADR-024)', function () {
  this.timeout(180000);
  let dir: string;
  let project: ProjectInfo;

  before(function () {
    if (process.platform !== 'win32') {
      this.skip(); // `-A` is a Visual Studio generator platform
    }
    try {
      execFileSync('cmake', ['--version']);
    } catch {
      this.skip();
    }
    dir = mkdtempSync(join(tmpdir(), 'ds-cmake-ctx-'));
    writeFileSync(join(dir, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.21)\nproject(app CXX)\nadd_executable(app main.cpp)\n');
    writeFileSync(join(dir, 'main.cpp'), 'int main() { return 0; }\n');
    project = {
      id: 'cmake:ctx',
      name: 'app',
      adapterId: 'cmake',
      manifestPath: join(dir, 'CMakeLists.txt'),
      workspaceFolder: vscode.workspace.workspaceFolders![0],
    };
  });

  after(() => {
    cmakeAdapter.invalidateCache();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('seeds the Target and prepares the build without a platform clash', async () => {
    const config: InvocationConfig = {};
    const unset: Selection = { projectId: project.id, values: { profile: 'Debug', architecture: 'x64' } };
    const chip = cmakeAdapter.chips.find((c) => c.id === 'target')!;

    // ensureRequiredChips: seed the Target for real, with the chip context.
    const seeded = await chip.defaultValue!(project, { selection: unset, config });
    assert.equal(seeded, 'app');

    // runCargoTask: prepareInvocation configures with the same options — must not throw.
    const selection: Selection = { ...unset, values: { ...unset.values, target: 'app' } };
    await cmakeAdapter.prepareInvocation!(project, selection, config);

    const tree = join(dir, 'build', 'x64');
    const cache = readFileSync(join(tree, 'CMakeCache.txt'), 'utf8');
    assert.match(cache, /^CMAKE_GENERATOR_PLATFORM:\w+=x64$/m);
    assert.equal(existsSync(join(dir, 'build', 'CMakeCache.txt')), false, 'no second, platform-less tree');
  });
});
