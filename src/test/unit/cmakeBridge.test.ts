import { strict as assert } from 'node:assert';
import {
  CMakeBridge,
  type CMakeExec,
  cmakeProjectName,
  parseCMakeVersion,
} from '../../adapters/cmake/cmakeBridge';

describe('cmakeProjectName', () => {
  it('uses the folder that holds CMakeLists.txt', () => {
    assert.equal(cmakeProjectName('/home/u/app/CMakeLists.txt'), 'app');
    assert.equal(cmakeProjectName('C:\\src\\my-tool\\CMakeLists.txt'), 'my-tool');
  });
});

describe('parseCMakeVersion', () => {
  it('extracts the bare version from `cmake --version` output', () => {
    assert.equal(parseCMakeVersion('cmake version 3.28.1\n\nCMake suite maintained…'), '3.28.1');
    assert.equal(parseCMakeVersion('cmake version 4.0.0-rc1'), '4.0.0-rc1');
  });

  it('returns undefined when the output does not look like cmake', () => {
    assert.equal(parseCMakeVersion(''), undefined);
    assert.equal(parseCMakeVersion('command not found'), undefined);
  });
});

describe('CMakeBridge.checkToolchain', () => {
  /** A CMakeExec that returns a fixed result (or throws to simulate a missing binary). */
  const fakeExec = (result: { stdout?: string; exitCode?: number } | 'spawn-fail'): CMakeExec =>
    () => (result === 'spawn-fail'
      ? Promise.reject(new Error('ENOENT'))
      : Promise.resolve({ stdout: result.stdout ?? '', stderr: '', exitCode: result.exitCode ?? 0 }));

  it('reports ok with the version when cmake answers', async () => {
    const tc = await new CMakeBridge(fakeExec({ stdout: 'cmake version 3.28.1' })).checkToolchain();
    assert.deepEqual(tc, { cmake: '3.28.1', ok: true });
  });

  it('reports not-ok when cmake is absent (spawn failure)', async () => {
    const tc = await new CMakeBridge(fakeExec('spawn-fail')).checkToolchain();
    assert.deepEqual(tc, { cmake: undefined, ok: false });
  });

  it('reports not-ok on a non-zero exit', async () => {
    const tc = await new CMakeBridge(fakeExec({ exitCode: 1 })).checkToolchain();
    assert.equal(tc.ok, false);
  });

  it('caches the probe until invalidateCache', async () => {
    let calls = 0;
    const counting: CMakeExec = () => {
      calls += 1;
      return Promise.resolve({ stdout: 'cmake version 3.28.1', stderr: '', exitCode: 0 });
    };
    const bridge = new CMakeBridge(counting);
    await bridge.checkToolchain();
    await bridge.checkToolchain();
    assert.equal(calls, 1); // second read served from cache
    bridge.invalidateCache();
    await bridge.checkToolchain();
    assert.equal(calls, 2); // re-probed after invalidation
  });
});
