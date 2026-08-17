import { strict as assert } from 'node:assert';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  CMakeBridge,
  type CMakeExec,
  buildArgs,
  cmakeProjectName,
  configureArgs,
  debuggerFor,
  detectCompilerId,
  executableArtifact,
  hasProjectCommand,
  overlayDefines,
  parseCMakeVersion,
  parseCodemodelConfigs,
  parseConfigurePresets,
  parseCxxCompilerId,
  parseProjectName,
  parseReplyIndexCodemodel,
  parseTargetInfo,
  readReplyDir,
  resolvePresetBinaryDir,
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

describe('configureArgs / buildArgs / overlayDefines', () => {
  it('configureArgs assembles -S/-B, platform, build type, and -D defines', () => {
    assert.deepEqual(configureArgs('/src', '/src/build'), ['-S', '/src', '-B', '/src/build']);
    assert.deepEqual(
      configureArgs('/src', '/src/build', {
        config: 'Release',
        platform: 'x64',
        defines: { CMAKE_CXX_FLAGS: '-O2' },
      }),
      ['-S', '/src', '-B', '/src/build', '-A', 'x64', '-D', 'CMAKE_BUILD_TYPE=Release', '-D', 'CMAKE_CXX_FLAGS=-O2'],
    );
  });

  it('buildArgs targets a config + target', () => {
    assert.deepEqual(buildArgs('/src/build', 'Debug', 'hello'), [
      '--build', '/src/build', '--config', 'Debug', '--target', 'hello',
    ]);
  });

  it('buildArgs omits --config for preset builds (undefined config)', () => {
    assert.deepEqual(buildArgs('/src/out/build/msvc', undefined, 'hello'), [
      '--build', '/src/out/build/msvc', '--target', 'hello',
    ]);
  });

  it('overlayDefines maps compiler/linker flags, ignoring empty values', () => {
    assert.deepEqual(overlayDefines({ 'cxx-flags': '-O2 -Wall' }, { 'exe-linker-flags': '/DEBUG' }), {
      CMAKE_CXX_FLAGS: '-O2 -Wall',
      CMAKE_EXE_LINKER_FLAGS: '/DEBUG',
    });
    assert.deepEqual(overlayDefines({ 'cxx-flags': '   ' }, {}), {}); // whitespace-only ignored
    assert.deepEqual(overlayDefines({}, {}), {});
  });
});

describe('CMakeBridge.configure (signature cache)', () => {
  it('reconfigures only when the options change or the cache is invalidated', async () => {
    const buildDir = mkdtempSync(join(tmpdir(), 'ds-cmake-'));
    try {
      let calls = 0;
      const counting: CMakeExec = () => {
        calls += 1;
        return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
      };
      const bridge = new CMakeBridge(counting);
      await bridge.configure('/src', buildDir, { config: 'Debug' });
      await bridge.configure('/src', buildDir, { config: 'Debug' }); // same options → served from cache
      assert.equal(calls, 1);
      await bridge.configure('/src', buildDir, { config: 'Release' }); // changed → reconfigure
      assert.equal(calls, 2);
      bridge.invalidateCache();
      await bridge.configure('/src', buildDir, { config: 'Release' }); // invalidated → reconfigure
      assert.equal(calls, 3);
    } finally {
      rmSync(buildDir, { recursive: true, force: true });
    }
  });
});

describe('parseCxxCompilerId / detectCompilerId', () => {
  it('reads the CXX compiler id from a toolchains reply', () => {
    const json = JSON.stringify({
      kind: 'toolchains',
      toolchains: [
        { language: 'CXX', compiler: { id: 'GNU', version: '13.2', path: '/usr/bin/g++' } },
        { language: 'RC', compiler: { id: null } },
      ],
    });
    assert.equal(parseCxxCompilerId(json), 'GNU');
  });

  it('returns undefined when no CXX toolchain / malformed json', () => {
    assert.equal(parseCxxCompilerId(JSON.stringify({ toolchains: [{ language: 'C' }] })), undefined);
    assert.equal(parseCxxCompilerId('{ not json'), undefined);
  });

  it('detectCompilerId resolves the compiler from the real reply fixture (MSVC)', async () => {
    assert.equal(await detectCompilerId(FIXTURE_REPLY), 'MSVC');
  });

  it('detectCompilerId returns undefined when the reply dir is missing', async () => {
    assert.equal(await detectCompilerId(join(FIXTURE_REPLY, 'nope')), undefined);
  });
});

describe('debuggerFor', () => {
  it('auto-selects the debug type from the compiler', () => {
    assert.deepEqual(debuggerFor('MSVC', 'win32'), { type: 'cppvsdbg', extensionId: 'ms-vscode.cpptools' });
    assert.deepEqual(debuggerFor('GNU', 'linux'), { type: 'cppdbg', mimode: 'gdb', extensionId: 'ms-vscode.cpptools' });
    assert.deepEqual(debuggerFor('Clang', 'darwin'), { type: 'cppdbg', mimode: 'lldb', extensionId: 'ms-vscode.cpptools' });
  });

  it('falls back by platform for an unknown/undefined compiler', () => {
    assert.equal(debuggerFor(undefined, 'win32').type, 'cppvsdbg');
    assert.deepEqual(debuggerFor(undefined, 'linux'), { type: 'cppdbg', mimode: 'gdb', extensionId: 'ms-vscode.cpptools' });
  });

  it('the codelldb override forces CodeLLDB regardless of compiler', () => {
    assert.deepEqual(debuggerFor('MSVC', 'win32', 'codelldb'), { type: 'lldb', extensionId: 'vadimcn.vscode-lldb' });
  });
});

describe('parseConfigurePresets (TASK-041)', () => {
  it('reads the visible presets from the real CMakePresets.json fixture', () => {
    const json = readFileSync(
      join(process.cwd(), 'src', 'test', 'fixtures', 'cmake', 'presets', 'CMakePresets.json'),
      'utf8',
    );
    const presets = parseConfigurePresets(json);
    // The hidden `vs-base` template is excluded; the three concrete presets remain in order.
    assert.deepEqual(presets.map((p) => p.name), ['msvc-x64', 'msvc-x86', 'clangcl-x64']);
    assert.equal(presets[0].displayName, 'MSVC x64');
    // binaryDir is inherited from vs-base with its macros still intact (expanded later).
    assert.equal(presets[0].binaryDir, '${sourceDir}/out/build/${presetName}');
  });

  it('resolves binaryDir through the inherits chain and excludes hidden bases', () => {
    const main = JSON.stringify({
      version: 3,
      configurePresets: [
        { name: 'base', hidden: true, binaryDir: '${sourceDir}/b/${presetName}' },
        { name: 'debug', displayName: 'Debug', inherits: 'base' },
      ],
    });
    const user = JSON.stringify({ version: 3, configurePresets: [{ name: 'local', inherits: 'debug' }] });
    const presets = parseConfigurePresets(main, user);
    // hidden `base` excluded; user preset appended after project presets.
    assert.deepEqual(presets.map((p) => p.name), ['debug', 'local']);
    assert.equal(presets.find((p) => p.name === 'debug')?.binaryDir, '${sourceDir}/b/${presetName}');
    // transitive inherit: local → debug → base.
    assert.equal(presets.find((p) => p.name === 'local')?.binaryDir, '${sourceDir}/b/${presetName}');
  });

  it('supports an inherits array (first parent that declares binaryDir wins)', () => {
    const json = JSON.stringify({
      configurePresets: [
        { name: 'noBin', hidden: true },
        { name: 'withBin', hidden: true, binaryDir: '${sourceDir}/x' },
        { name: 'leaf', inherits: ['noBin', 'withBin'] },
      ],
    });
    assert.equal(parseConfigurePresets(json).find((p) => p.name === 'leaf')?.binaryDir, '${sourceDir}/x');
  });

  it('guards cyclic inherits and degrades to [] on missing/malformed input', () => {
    const cyclic = JSON.stringify({ configurePresets: [{ name: 'a', inherits: 'b' }, { name: 'b', inherits: 'a' }] });
    const presets = parseConfigurePresets(cyclic);
    assert.deepEqual(presets.map((p) => p.name), ['a', 'b']);
    assert.equal(presets[0].binaryDir, undefined); // cycle → no binaryDir, no hang
    assert.deepEqual(parseConfigurePresets(undefined), []);
    assert.deepEqual(parseConfigurePresets('{ not json'), []);
    assert.deepEqual(parseConfigurePresets(JSON.stringify({ version: 3 })), []); // no configurePresets key
  });
});

describe('resolvePresetBinaryDir (TASK-041)', () => {
  it('expands ${sourceDir} and ${presetName} and resolves against the source dir', () => {
    const preset = { name: 'msvc-x64', binaryDir: '${sourceDir}/out/build/${presetName}' };
    assert.equal(resolvePresetBinaryDir(preset, '/proj'), resolve('/proj', 'out/build/msvc-x64'));
  });

  it('falls back to <srcDir>/build/<name> when the preset declares no binaryDir', () => {
    assert.equal(resolvePresetBinaryDir({ name: 'ninja' }, '/proj'), resolve('/proj', 'build/ninja'));
  });
});
