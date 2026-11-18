import { strict as assert } from 'node:assert';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  type CMakeConfigurePreset,
  CMakeBridge,
  type CMakeExec,
  type PresetFileReader,
  type PresetHost,
  buildArgs,
  classifyManifests,
  cmakeProjectName,
  configureArgs,
  debuggerFor,
  describeTargetType,
  detectCompilerId,
  executableArtifact,
  hasExecutableCommand,
  hasLibraryCommand,
  hasProjectCommand,
  loadPresetFiles,
  overlayDefines,
  parseCMakeVersion,
  parseCodemodelConfigs,
  parseCxxCompilerId,
  parseProjectName,
  parseReplyIndexCodemodel,
  parseTargetInfo,
  readReplyDir,
  resolveConfigurePresets,
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

  it('reads the declaring source dir (paths.source) for sub-project scoping', () => {
    const info = parseTargetInfo(JSON.stringify({
      name: 'mathlib',
      type: 'STATIC_LIBRARY',
      nameOnDisk: 'mathlib.lib',
      artifacts: [{ path: 'libs/mathlib/Debug/mathlib.lib' }],
      paths: { build: 'libs/mathlib', source: 'libs/mathlib' },
    }));
    assert.equal(info.sourceDir, 'libs/mathlib');
    // A static library's primary artifact IS the .lib (nameOnDisk match wins over the skip list).
    assert.equal(executableArtifact(info), 'libs/mathlib/Debug/mathlib.lib');
  });
});

describe('describeTargetType', () => {
  it('labels library kinds and stays silent for executables', () => {
    assert.equal(describeTargetType('EXECUTABLE'), undefined);
    assert.equal(describeTargetType('STATIC_LIBRARY'), 'static library');
    assert.equal(describeTargetType('SHARED_LIBRARY'), 'shared library');
    assert.equal(describeTargetType('MODULE_LIBRARY'), 'module library');
  });
});

describe('hasExecutableCommand / hasLibraryCommand', () => {
  it('detects target declarations, ignoring comments', () => {
    assert.equal(hasExecutableCommand('add_executable(app main.cpp)'), true);
    assert.equal(hasExecutableCommand('# add_executable(app main.cpp)'), false);
    assert.equal(hasLibraryCommand('add_library(mathlib STATIC a.cpp)'), true);
    assert.equal(hasLibraryCommand('add_executable(app main.cpp)'), false);
    assert.equal(hasExecutableCommand('ADD_EXECUTABLE(app main.cpp)'), true); // case-insensitive
  });
});

describe('classifyManifests (nested sub-projects, ADR-019)', () => {
  const ROOT = 'nested/CMakeLists.txt';
  const entries = [
    { rel: ROOT, content: 'project(nested-demo CXX)\nadd_subdirectory(app)' },
    { rel: 'nested/app/CMakeLists.txt', content: 'add_executable(nested-app main.cpp)' },
    { rel: 'nested/libs/mathlib/CMakeLists.txt', content: 'add_library(mathlib STATIC mathlib.cpp)' },
    { rel: 'nested/tools/cli/CMakeLists.txt', content: 'add_executable(nested-cli main.cpp)' },
  ];

  it('classifies the project() root and its target-declaring dirs as subs', () => {
    const roles = classifyManifests(entries);
    assert.deepEqual(roles.find((r) => r.rel === ROOT), {
      rel: ROOT, role: 'root', name: 'nested-demo', library: false,
    });
    assert.deepEqual(roles.find((r) => r.rel === 'nested/app/CMakeLists.txt'), {
      rel: 'nested/app/CMakeLists.txt', role: 'sub', parentRel: ROOT, name: undefined, library: false,
    });
    assert.deepEqual(roles.find((r) => r.rel === 'nested/libs/mathlib/CMakeLists.txt'), {
      rel: 'nested/libs/mathlib/CMakeLists.txt', role: 'sub', parentRel: ROOT, name: undefined, library: true,
    });
  });

  it('a nested project() still nests under the outermost root (VS solution view)', () => {
    const roles = classifyManifests([
      ...entries,
      { rel: 'nested/inner/CMakeLists.txt', content: 'project(inner)\nadd_executable(inner main.cpp)' },
    ]);
    const inner = roles.find((r) => r.rel === 'nested/inner/CMakeLists.txt');
    assert.deepEqual(inner, {
      rel: 'nested/inner/CMakeLists.txt', role: 'sub', parentRel: ROOT, name: 'inner', library: false,
    });
  });

  it('drops target-less include leaves and standalone leaves with no ancestor root', () => {
    const roles = classifyManifests([
      ...entries,
      { rel: 'nested/cmake/CMakeLists.txt', content: 'include(helpers.cmake)' }, // grouping leaf
      { rel: 'stray/CMakeLists.txt', content: 'add_executable(stray main.cpp)' }, // no root above
    ]);
    assert.equal(roles.some((r) => r.rel === 'nested/cmake/CMakeLists.txt'), false);
    assert.equal(roles.some((r) => r.rel === 'stray/CMakeLists.txt'), false);
  });

  it('keeps two independent roots independent (nearest-ancestor only)', () => {
    const roles = classifyManifests([
      { rel: 'a/CMakeLists.txt', content: 'project(a)\nadd_executable(a main.cpp)' },
      { rel: 'b/CMakeLists.txt', content: 'project(b)\nadd_executable(b main.cpp)' },
    ]);
    assert.deepEqual(roles.map((r) => r.role), ['root', 'root']);
  });
});

describe('readReplyDir (real reply fixture)', () => {
  it('returns the buildable target with its type/scope, filtering ALL_BUILD/ZERO_CHECK', async () => {
    assert.deepEqual(await readReplyDir(FIXTURE_REPLY, 'Debug'), [
      { name: 'hello', type: 'EXECUTABLE', artifactPath: 'Debug/hello.exe', sourceDir: '.' },
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

  it('buildArgs omits --target to build everything (All targets, MS-021)', () => {
    assert.deepEqual(buildArgs('/src/build', 'Debug'), ['--build', '/src/build', '--config', 'Debug']);
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

/** In-memory presets tree for loadPresetFiles: path → JSON document (or raw text). */
function memReader(files: Record<string, unknown>): PresetFileReader {
  const table = new Map(
    Object.entries(files).map(([path, doc]) => [resolve(path), typeof doc === 'string' ? doc : JSON.stringify(doc)]),
  );
  return async (path) => table.get(resolve(path));
}

const WIN: PresetHost = { platform: 'win32', env: {} };
const LINUX: PresetHost = { platform: 'linux', env: {} };

/** Load + resolve the presets of `/proj` from an in-memory tree. */
async function presetsOf(files: Record<string, unknown>, host: PresetHost = WIN): Promise<CMakeConfigurePreset[]> {
  return resolveConfigurePresets(await loadPresetFiles('/proj', memReader(files), host.platform), resolve('/proj'), host);
}

describe('configure presets (TASK-041)', () => {
  it('reads the visible presets from the real CMakePresets.json fixture', async () => {
    const dir = join(process.cwd(), 'src', 'test', 'fixtures', 'cmake', 'presets');
    const read: PresetFileReader = async (path) => (existsSync(path) ? readFileSync(path, 'utf8') : undefined);
    const presets = resolveConfigurePresets(await loadPresetFiles(dir, read), dir, WIN);
    // The hidden `vs-base` template is excluded; the three concrete presets remain in order.
    assert.deepEqual(presets.map((p) => p.name), ['msvc-x64', 'msvc-x86', 'clangcl-x64']);
    assert.equal(presets[0].displayName, 'MSVC x64');
    // binaryDir is inherited from vs-base and its macros expanded against the source dir.
    assert.equal(presets[0].binaryDir, resolve(dir, 'out/build/msvc-x64'));
  });

  it('resolves binaryDir through the inherits chain, excludes hidden bases, lists user presets first', async () => {
    const presets = await presetsOf({
      '/proj/CMakePresets.json': {
        version: 3,
        configurePresets: [
          { name: 'base', hidden: true, binaryDir: '${sourceDir}/b/${presetName}' },
          { name: 'debug', displayName: 'Debug', inherits: 'base' },
        ],
      },
      '/proj/CMakeUserPresets.json': { version: 3, configurePresets: [{ name: 'local', inherits: 'debug' }] },
    });
    // cmake --list-presets order: the user file (which implicitly includes the project file) first.
    assert.deepEqual(presets.map((p) => p.name), ['local', 'debug']);
    assert.equal(presets.find((p) => p.name === 'debug')?.binaryDir, resolve('/proj', 'b/debug'));
    // transitive inherit: local → debug → base, with ${presetName} = the preset being used.
    assert.equal(presets.find((p) => p.name === 'local')?.binaryDir, resolve('/proj', 'b/local'));
  });

  it('supports an inherits array (first parent that declares binaryDir wins)', async () => {
    const presets = await presetsOf({
      '/proj/CMakePresets.json': {
        configurePresets: [
          { name: 'noBin', hidden: true },
          { name: 'withBin', hidden: true, binaryDir: '${sourceDir}/x' },
          { name: 'leaf', inherits: ['noBin', 'withBin'] },
        ],
      },
    });
    assert.equal(presets.find((p) => p.name === 'leaf')?.binaryDir, resolve('/proj', 'x'));
  });

  it('guards cyclic inherits and degrades to [] on missing/malformed input', async () => {
    const presets = await presetsOf({
      '/proj/CMakePresets.json': { configurePresets: [{ name: 'a', inherits: 'b' }, { name: 'b', inherits: 'a' }] },
    });
    assert.deepEqual(presets.map((p) => p.name), ['a', 'b']);
    assert.equal(presets[0].binaryDir, undefined); // cycle → no binaryDir, no hang
    assert.deepEqual(await presetsOf({}), []);
    assert.deepEqual(await presetsOf({ '/proj/CMakePresets.json': '{ not json' }), []);
    assert.deepEqual(await presetsOf({ '/proj/CMakePresets.json': { version: 3 } }), []); // no configurePresets key
  });
});

describe('configure presets — include + condition (TASK-067)', () => {
  // The reported layout: a module's CMakePresets.json holds only an include of a shared file.
  const shared = {
    '/proj/CMakePresets.json': { version: 6, include: ['../tools/presets/shared.json'] },
    '/tools/presets/shared.json': {
      version: 6,
      configurePresets: [
        { name: 'base', hidden: true, binaryDir: '${sourceDir}/out/${presetName}' },
        {
          name: 'win-msvc',
          inherits: 'base',
          condition: { type: 'equals', lhs: '${hostSystemName}', rhs: 'Windows' },
        },
        {
          name: 'linux-gcc',
          inherits: 'base',
          condition: { type: 'equals', lhs: '${hostSystemName}', rhs: 'Linux' },
        },
      ],
    },
  };

  it('follows include relative to the including file and keeps only presets enabled on this host', async () => {
    const onWindows = await presetsOf(shared, WIN);
    assert.deepEqual(onWindows.map((p) => p.name), ['win-msvc']);
    // ${sourceDir} is the project, not the included file's dir.
    assert.equal(onWindows[0].binaryDir, resolve('/proj', 'out/win-msvc'));
    assert.deepEqual((await presetsOf(shared, LINUX)).map((p) => p.name), ['linux-gcc']);
  });

  it('matches `cmake --list-presets` order, null conditions and ${fileDir} (probed on cmake 4.4)', async () => {
    const presets = await presetsOf({
      '/proj/CMakePresets.json': {
        version: 6,
        include: ['../shared/inc.json'],
        configurePresets: [{ name: 'own', binaryDir: '${sourceDir}/out/${presetName}' }],
      },
      '/shared/inc.json': {
        version: 6,
        include: ['inc2.json'],
        configurePresets: [
          {
            name: 'base',
            hidden: true,
            binaryDir: '${sourceDir}/out/${presetName}',
            condition: { type: 'equals', lhs: '${hostSystemName}', rhs: 'Windows' },
          },
          { name: 'win', inherits: 'base' },
          { name: 'lin', binaryDir: 'x', condition: { type: 'equals', lhs: '${hostSystemName}', rhs: 'Linux' } },
          { name: 'nullc', inherits: 'base', condition: null },
        ],
      },
      '/shared/inc2.json': { version: 6, configurePresets: [{ name: 'deep', binaryDir: '${fileDir}/deepout' }] },
      '/proj/CMakeUserPresets.json': { version: 6, configurePresets: [{ name: 'mine', inherits: 'win' }] },
    });
    assert.deepEqual(presets.map((p) => p.name), ['mine', 'own', 'win', 'nullc', 'deep']);
    assert.equal(presets.find((p) => p.name === 'deep')?.binaryDir, resolve('/shared', 'deepout'));
    // A null condition enables the preset and is not inherited: nullc stays on Linux too.
    const onLinux = await presetsOf(
      {
        '/proj/CMakePresets.json': {
          version: 6,
          configurePresets: [
            { name: 'base', hidden: true, condition: { type: 'const', value: false } },
            { name: 'nullc', inherits: 'base', condition: null },
            { name: 'child', inherits: 'nullc' },
            { name: 'off', inherits: 'base' },
          ],
        },
      },
      LINUX,
    );
    assert.deepEqual(onLinux.map((p) => p.name), ['nullc', 'child']);
  });

  it('reads a file included twice once and stops at an include cycle', async () => {
    const presets = await presetsOf({
      '/proj/CMakePresets.json': { version: 6, include: ['a.json', 'b.json'] },
      '/proj/a.json': { version: 6, include: ['b.json'], configurePresets: [{ name: 'a' }] },
      '/proj/b.json': { version: 6, include: ['CMakePresets.json'], configurePresets: [{ name: 'b' }] },
    });
    assert.deepEqual(presets.map((p) => p.name), ['a', 'b']);
  });

  it('expands ${fileDir} per the version-12 rule', async () => {
    const tree = (subVersion: number) => ({
      '/proj/CMakePresets.json': { version: 6, include: ['sub/base.json'], configurePresets: [{ name: 'd', inherits: 'b' }] },
      '/proj/sub/base.json': { version: subVersion, configurePresets: [{ name: 'b', hidden: true, binaryDir: '${fileDir}/out' }] },
    });
    // < 12: the directory of the file defining the preset being used.
    assert.equal((await presetsOf(tree(6)))[0].binaryDir, resolve('/proj', 'out'));
    // ≥ 12: the directory of the file holding the macro.
    assert.equal((await presetsOf(tree(12)))[0].binaryDir, resolve('/proj/sub', 'out'));
  });

  it('evaluates every condition type', async () => {
    const host: PresetHost = { platform: 'linux', env: { CI: 'true', HOME: '/home/u' } };
    const presets = await presetsOf(
      {
        '/proj/CMakePresets.json': {
          version: 6,
          configurePresets: [
            { name: 'bool-off', condition: false },
            { name: 'in-list', condition: { type: 'inList', string: '${hostSystemName}', list: ['Darwin', 'Linux'] } },
            { name: 'not-in-list', condition: { type: 'notInList', string: '${hostSystemName}', list: ['Linux'] } },
            { name: 'matches', condition: { type: 'matches', string: '${sourceDirName}', regex: '^pr' } },
            { name: 'not-matches', condition: { type: 'notMatches', string: '${presetName}', regex: 'not' } },
            {
              name: 'any',
              condition: {
                type: 'anyOf',
                conditions: [{ type: 'const', value: false }, { type: 'equals', lhs: '$penv{CI}', rhs: 'true' }],
              },
            },
            {
              name: 'all-off',
              condition: { type: 'allOf', conditions: [true, { type: 'notEquals', lhs: '$env{HOME}', rhs: '/home/u' }] },
            },
            { name: 'not', condition: { type: 'not', condition: { type: 'const', value: false } } },
            {
              name: 'env-field',
              environment: { MODE: 'fast-${presetName}' },
              condition: { type: 'equals', lhs: '$env{MODE}', rhs: 'fast-env-field' },
            },
          ],
        },
      },
      host,
    );
    assert.deepEqual(presets.map((p) => p.name), ['in-list', 'matches', 'any', 'not', 'env-field']);
  });

  it('keeps a preset visible when its condition cannot be evaluated (cmake decides)', async () => {
    const presets = await presetsOf({
      '/proj/CMakePresets.json': {
        version: 6,
        configurePresets: [
          { name: 'vendor-macro', condition: { type: 'equals', lhs: '$vendor{x}', rhs: 'y' } },
          { name: 'bad-regex', condition: { type: 'matches', string: 'a', regex: '(' } },
          { name: 'unknown-type', condition: { type: 'someday' } },
        ],
      },
    });
    assert.deepEqual(presets.map((p) => p.name), ['vendor-macro', 'bad-regex', 'unknown-type']);
  });
});

describe('resolvePresetBinaryDir (TASK-041)', () => {
  it('returns the resolved binaryDir as is', () => {
    const binaryDir = resolve('/proj', 'out/build/msvc-x64');
    assert.equal(resolvePresetBinaryDir({ name: 'msvc-x64', binaryDir }, '/proj'), binaryDir);
  });

  it('falls back to <srcDir>/build/<name> when the preset declares no binaryDir', () => {
    assert.equal(resolvePresetBinaryDir({ name: 'ninja' }, '/proj'), resolve('/proj', 'build/ninja'));
  });
});

describe('CMakeBridge.targetsIfConfigured (no configure on project switch)', () => {
  /** An exec that fails the test if cmake is ever spawned. */
  const forbiddenExec: CMakeExec = () => {
    assert.fail('targetsIfConfigured must never run cmake');
  };

  it('returns [] for a tree that was never configured, without creating it', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'ds-peek-'));
    const buildDir = join(parent, 'build'); // deliberately absent
    try {
      const targets = await new CMakeBridge(forbiddenExec).targetsIfConfigured(buildDir);
      assert.deepEqual(targets, []);
      assert.equal(existsSync(buildDir), false, 'peeking must not create the build tree');
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('reads the targets of an already-configured tree from the File API reply', async () => {
    const buildDir = mkdtempSync(join(tmpdir(), 'ds-peek-'));
    try {
      // Stage the committed real-cmake reply (TASK-033) where a configured tree keeps it.
      const replyDir = join(buildDir, '.cmake', 'api', 'v1', 'reply');
      mkdirSync(replyDir, { recursive: true });
      for (const file of readdirSync(FIXTURE_REPLY)) {
        copyFileSync(join(FIXTURE_REPLY, file), join(replyDir, file));
      }
      const targets = await new CMakeBridge(forbiddenExec).targetsIfConfigured(buildDir, 'Debug');
      // The fixture's switcher-relevant target is `hello`; ALL_BUILD/ZERO_CHECK are noise.
      assert.deepEqual(targets.map((t) => t.name), ['hello']);
    } finally {
      rmSync(buildDir, { recursive: true, force: true });
    }
  });

  it('never populates the target cache, so a later targetsFor still configures', async () => {
    const buildDir = mkdtempSync(join(tmpdir(), 'ds-peek-'));
    try {
      let calls = 0;
      const counting: CMakeExec = () => {
        calls += 1;
        return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
      };
      const bridge = new CMakeBridge(counting);
      await bridge.targetsIfConfigured(buildDir); // empty peek — must not be cached
      assert.equal(calls, 0);
      await bridge.targetsFor('/src', buildDir, {}, 'Debug');
      assert.equal(calls, 1, 'an empty peek must not suppress the real configure');
    } finally {
      rmSync(buildDir, { recursive: true, force: true });
    }
  });
});
