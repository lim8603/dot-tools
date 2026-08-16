import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  CMakeBridge,
  type CMakeExec,
  cmakeProjectName,
  executableArtifact,
  hasProjectCommand,
  parseCMakeVersion,
  parseCodemodelConfigs,
  parseProjectName,
  parseReplyIndexCodemodel,
  parseTargetInfo,
  readReplyDir,
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

describe('hasProjectCommand / parseProjectName', () => {
  it('detects a project() root and reads its name', () => {
    const src = 'cmake_minimum_required(VERSION 3.20)\nproject(hello CXX)\nadd_executable(hello main.cpp)\n';
    assert.equal(hasProjectCommand(src), true);
    assert.equal(parseProjectName(src), 'hello');
  });

  it('treats an add_subdirectory leaf (no project()) as not a root', () => {
    const src = 'add_library(util STATIC util.cpp)\ntarget_include_directories(util PUBLIC .)\n';
    assert.equal(hasProjectCommand(src), false);
    assert.equal(parseProjectName(src), undefined);
  });

  it('ignores commented-out project() and reads quoted names', () => {
    assert.equal(hasProjectCommand('# project(ghost)\nadd_library(x x.c)'), false);
    assert.equal(parseProjectName('project("my-app" VERSION 1.2 LANGUAGES CXX)'), 'my-app');
  });

  it('returns undefined for a variable name so the caller falls back to the folder', () => {
    assert.equal(hasProjectCommand('project(${APP_NAME})'), true); // still a root
    assert.equal(parseProjectName('project(${APP_NAME})'), undefined); // name not literal
  });
});

// Real File API reply captured from cmake 4.4.2 + Visual Studio 18 2026 (multi-config).
const FIXTURE_REPLY = join(process.cwd(), 'src', 'test', 'fixtures', 'cmake', 'file-api-reply');
const readReply = (prefix: string): string => {
  const file = readdirSync(FIXTURE_REPLY).find((f) => f.startsWith(prefix) && f.endsWith('.json'));
  assert.ok(file, `fixture ${prefix}* missing`);
  return readFileSync(join(FIXTURE_REPLY, file), 'utf8');
};

describe('CMake File API parsers (real reply fixture)', () => {
  it('parseReplyIndexCodemodel returns the codemodel reply filename', () => {
    assert.match(parseReplyIndexCodemodel(readReply('index-')) ?? '', /^codemodel-v2-.*\.json$/);
  });

  it('parseCodemodelConfigs yields the four build types with target refs', () => {
    const configs = parseCodemodelConfigs(readReply('codemodel-v2-'));
    assert.deepEqual(
      configs.map((c) => c.name).sort(),
      ['Debug', 'MinSizeRel', 'RelWithDebInfo', 'Release'],
    );
    const debug = configs.find((c) => c.name === 'Debug');
    assert.ok(debug);
    assert.ok(debug.targets.some((t) => t.name === 'hello'));
  });

  it('parsers degrade to undefined/[] on malformed json', () => {
    assert.equal(parseReplyIndexCodemodel('{ not json'), undefined);
    assert.deepEqual(parseCodemodelConfigs('nope'), []);
  });
});

describe('parseTargetInfo / executableArtifact', () => {
  it('reads an EXECUTABLE and picks the binary artifact, not the .pdb', () => {
    const info = parseTargetInfo(JSON.stringify({
      name: 'hello',
      type: 'EXECUTABLE',
      nameOnDisk: 'hello.exe',
      artifacts: [{ path: 'Debug/hello.exe' }, { path: 'Debug/hello.pdb' }],
    }));
    assert.equal(info.type, 'EXECUTABLE');
    assert.equal(executableArtifact(info), 'Debug/hello.exe');
  });

  it('a UTILITY target carries no artifacts', () => {
    const info = parseTargetInfo(JSON.stringify({ name: 'ALL_BUILD', type: 'UTILITY' }));
    assert.deepEqual(info.artifacts, []);
    assert.equal(executableArtifact(info), undefined);
  });
});

describe('readReplyDir (real reply fixture)', () => {
  it('returns only the executable target, filtering ALL_BUILD/ZERO_CHECK', async () => {
    assert.deepEqual(await readReplyDir(FIXTURE_REPLY, 'Debug'), [
      { name: 'hello', artifactPath: 'Debug/hello.exe' },
    ]);
  });

  it('falls back to the first configuration for an undefined/unknown config', async () => {
    const undef = await readReplyDir(FIXTURE_REPLY);
    assert.equal(undef[0]?.name, 'hello');
    assert.deepEqual(await readReplyDir(FIXTURE_REPLY, 'Nope'), undef);
  });

  it('returns [] when the reply dir does not exist', async () => {
    assert.deepEqual(await readReplyDir(join(FIXTURE_REPLY, 'nonexistent')), []);
  });
});
