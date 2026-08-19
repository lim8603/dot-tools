import { strict as assert } from 'node:assert';
import {
  VsBridge,
  type VsExec,
  classifyVsManifests,
  describeVcxprojType,
  filterGeneratedManifests,
  isLibraryVcxproj,
  manifestStem,
  msbuildBuildArgs,
  normalizeRelPath,
  parseMsbuildVersion,
  parseSlnProjects,
  parseSlnxProjects,
  parseSolutionConfigurations,
  parseTargetPathOutput,
  parseVcxprojConfigurations,
  resolveSlnRef,
  solutionDirProperty,
  targetPathArgs,
} from '../../adapters/vs/vsBridge';

const SLN = `Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
Project("{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942}") = "app", "app\\app.vcxproj", "{11111111-1111-1111-1111-111111111111}"
EndProject
Project("{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942}") = "mathlib", "mathlib\\mathlib.vcxproj", "{22222222-2222-2222-2222-222222222222}"
EndProject
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "tool", "tool\\tool.csproj", "{33333333-3333-3333-3333-333333333333}"
EndProject
Global
	GlobalSection(SolutionConfigurationPlatforms) = preSolution
		Debug|x64 = Debug|x64
		Release|x64 = Release|x64
		Debug|Win32 = Debug|Win32
	EndGlobalSection
EndGlobal
`;

const SLNX = `<Solution>
  <Configurations>
    <BuildType Name="Debug" />
    <BuildType Name="Release" />
    <Platform Name="x64" />
  </Configurations>
  <Project Path="app/app.vcxproj" />
  <Folder Name="/libs/">
    <Project Path="mathlib/mathlib.vcxproj" />
  </Folder>
  <Project Path="tool/tool.csproj" />
</Solution>
`;

const VCXPROJ_EXE = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup Label="ProjectConfigurations">
    <ProjectConfiguration Include="Debug|x64">
      <Configuration>Debug</Configuration>
      <Platform>x64</Platform>
    </ProjectConfiguration>
    <ProjectConfiguration Include="Release|x64">
      <Configuration>Release</Configuration>
      <Platform>x64</Platform>
    </ProjectConfiguration>
  </ItemGroup>
  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Debug|x64'" Label="Configuration">
    <ConfigurationType>Application</ConfigurationType>
  </PropertyGroup>
  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Release|x64'" Label="Configuration">
    <ConfigurationType>Application</ConfigurationType>
  </PropertyGroup>
</Project>
`;

const VCXPROJ_LIB = VCXPROJ_EXE.replace(/Application/g, 'StaticLibrary');

describe('manifestStem', () => {
  it('strips the directory and the VS manifest extension', () => {
    assert.equal(manifestStem('src/demo/demo.sln'), 'demo');
    assert.equal(manifestStem('C:\\src\\demo\\app.vcxproj'), 'app');
    assert.equal(manifestStem('demo.slnx'), 'demo');
  });
});

describe('normalizeRelPath / resolveSlnRef', () => {
  it('normalizes separators and dot segments', () => {
    assert.equal(normalizeRelPath('a\\b\\..\\c\\.\\d'), 'a/c/d');
    assert.equal(normalizeRelPath('./app/app.vcxproj'), 'app/app.vcxproj');
  });
  it('resolves a solution-relative reference to workspace-relative', () => {
    assert.equal(resolveSlnRef('demo/demo.sln', 'app\\app.vcxproj'), 'demo/app/app.vcxproj');
    assert.equal(resolveSlnRef('demo.sln', 'app/app.vcxproj'), 'app/app.vcxproj');
    assert.equal(resolveSlnRef('sub/demo.sln', '..\\shared\\core.vcxproj'), 'shared/core.vcxproj');
  });
});

describe('filterGeneratedManifests (CMakeCache marker, ADR-021)', () => {
  it('drops manifests at or below a marker dir and keeps the rest', () => {
    const rels = [
      'demo/demo.sln',
      'demo/app/app.vcxproj',
      'cmake/hello/build/hello.slnx',
      'cmake/hello/build/hello.vcxproj',
      'cmake/hello/build/sub/deeper.vcxproj',
    ];
    const kept = filterGeneratedManifests(rels, ['cmake/hello/build']);
    assert.deepEqual(kept, ['demo/demo.sln', 'demo/app/app.vcxproj']);
  });
  it('does not confuse sibling dirs sharing a prefix', () => {
    const kept = filterGeneratedManifests(['build2/a.vcxproj'], ['build']);
    assert.deepEqual(kept, ['build2/a.vcxproj']);
  });
  it('a workspace-root marker excludes everything', () => {
    assert.deepEqual(filterGeneratedManifests(['a.sln', 'x/y.vcxproj'], ['']), []);
  });
  it('no markers keeps everything', () => {
    assert.deepEqual(filterGeneratedManifests(['a.sln'], []), ['a.sln']);
  });
});

describe('parseSlnProjects / parseSlnxProjects', () => {
  it('reads every referenced project path from a classic .sln', () => {
    assert.deepEqual(parseSlnProjects(SLN), [
      'app\\app.vcxproj',
      'mathlib\\mathlib.vcxproj',
      'tool\\tool.csproj',
    ]);
  });
  it('reads Path attributes from an XML .slnx (folders included)', () => {
    assert.deepEqual(parseSlnxProjects(SLNX), [
      'app/app.vcxproj',
      'mathlib/mathlib.vcxproj',
      'tool/tool.csproj',
    ]);
  });
});

describe('parseSolutionConfigurations', () => {
  it('reads the SolutionConfigurationPlatforms section of a .sln', () => {
    const { configurations, platforms } = parseSolutionConfigurations(SLN, 'sln');
    assert.deepEqual(configurations, ['Debug', 'Release']);
    assert.deepEqual(platforms, ['x64', 'Win32']);
  });
  it('reads BuildType/Platform elements of a .slnx', () => {
    const { configurations, platforms } = parseSolutionConfigurations(SLNX, 'slnx');
    assert.deepEqual(configurations, ['Debug', 'Release']);
    assert.deepEqual(platforms, ['x64']);
  });
  it('degrades to empty lists on content without the sections', () => {
    assert.deepEqual(parseSolutionConfigurations('garbage', 'sln'), { configurations: [], platforms: [] });
  });
});

describe('parseVcxprojConfigurations / isLibraryVcxproj / describeVcxprojType', () => {
  it('reads ProjectConfigurations pairs, deduped', () => {
    const { configurations, platforms } = parseVcxprojConfigurations(VCXPROJ_EXE);
    assert.deepEqual(configurations, ['Debug', 'Release']);
    assert.deepEqual(platforms, ['x64']);
  });
  it('classifies Application as runnable and StaticLibrary as library', () => {
    assert.equal(isLibraryVcxproj(VCXPROJ_EXE), false);
    assert.equal(isLibraryVcxproj(VCXPROJ_LIB), true);
    assert.equal(describeVcxprojType(VCXPROJ_EXE), undefined);
    assert.equal(describeVcxprojType(VCXPROJ_LIB), 'static library');
  });
  it('no ConfigurationType reads as runnable (fail-open)', () => {
    assert.equal(isLibraryVcxproj('<Project></Project>'), false);
  });
});

describe('classifyVsManifests (A안: vcxproj only, solutions as roots)', () => {
  it('makes the solution a root, its detected vcxprojs subs, and ignores csproj refs', () => {
    const roles = classifyVsManifests([
      { rel: 'demo/demo.sln', kind: 'sln', content: SLN },
      { rel: 'demo/app/app.vcxproj', kind: 'vcxproj', content: VCXPROJ_EXE },
      { rel: 'demo/mathlib/mathlib.vcxproj', kind: 'vcxproj', content: VCXPROJ_LIB },
    ]);
    const byRel = new Map(roles.map((r) => [r.rel, r]));
    assert.equal(byRel.get('demo/demo.sln')?.role, 'root');
    assert.equal(byRel.get('demo/app/app.vcxproj')?.role, 'sub');
    assert.equal(byRel.get('demo/app/app.vcxproj')?.parentRel, 'demo/demo.sln');
    assert.equal(byRel.get('demo/app/app.vcxproj')?.library, false);
    assert.equal(byRel.get('demo/mathlib/mathlib.vcxproj')?.role, 'sub');
    assert.equal(byRel.get('demo/mathlib/mathlib.vcxproj')?.library, true);
    assert.equal(roles.length, 3); // the csproj reference produced no entry
  });
  it('a vcxproj referenced by no solution stands alone as a root', () => {
    const roles = classifyVsManifests([
      { rel: 'standalone/tool.vcxproj', kind: 'vcxproj', content: VCXPROJ_EXE },
    ]);
    assert.deepEqual(roles, [
      { rel: 'standalone/tool.vcxproj', kind: 'vcxproj', role: 'root', parentRel: undefined, library: false },
    ]);
  });
  it('drops a solution whose references match no detected vcxproj (C#-only)', () => {
    const csharpOnly = 'Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "tool", "tool\\tool.csproj", "{3}"';
    const roles = classifyVsManifests([{ rel: 'cs/cs.sln', kind: 'sln', content: csharpOnly }]);
    assert.deepEqual(roles, []);
  });
  it('a vcxproj referenced by two solutions belongs to the first in rel order', () => {
    const ref = 'Project("{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942}") = "app", "app\\app.vcxproj", "{1}"';
    const roles = classifyVsManifests([
      { rel: 'b.sln', kind: 'sln', content: ref },
      { rel: 'a.sln', kind: 'sln', content: ref },
      { rel: 'app/app.vcxproj', kind: 'vcxproj', content: VCXPROJ_EXE },
    ]);
    const sub = roles.find((r) => r.rel === 'app/app.vcxproj');
    assert.equal(sub?.parentRel, 'a.sln');
    // b.sln keeps no members → dropped; only a.sln + the sub remain.
    assert.deepEqual(roles.filter((r) => r.role === 'root').map((r) => r.rel), ['a.sln']);
  });
});

describe('msbuild argument assembly', () => {
  it('build args carry the manifest, configuration, platform, /m and /nologo', () => {
    assert.deepEqual(msbuildBuildArgs('C:\\src\\demo\\demo.sln', 'Debug', 'x64'), [
      'C:\\src\\demo\\demo.sln',
      '/p:Configuration=Debug',
      '/p:Platform=x64',
      '/m',
      '/nologo',
    ]);
  });
  it('targetPath args use -getProperty (evaluation only)', () => {
    assert.deepEqual(targetPathArgs('app.vcxproj', 'Release', 'Win32'), [
      'app.vcxproj',
      '-getProperty:TargetPath',
      '-p:Configuration=Release',
      '-p:Platform=Win32',
    ]);
  });
  it('member projects carry /p:SolutionDir with a trailing separator (build + eval agree)', () => {
    assert.equal(solutionDirProperty('C:\\src\\demo'), '/p:SolutionDir=C:\\src\\demo\\');
    assert.equal(solutionDirProperty('C:\\src\\demo\\'), '/p:SolutionDir=C:\\src\\demo\\');
    assert.deepEqual(msbuildBuildArgs('app\\app.vcxproj', 'Debug', 'x64', 'C:\\src\\demo'), [
      'app\\app.vcxproj',
      '/p:Configuration=Debug',
      '/p:Platform=x64',
      '/p:SolutionDir=C:\\src\\demo\\',
      '/m',
      '/nologo',
    ]);
    assert.deepEqual(targetPathArgs('app\\app.vcxproj', 'Debug', 'x64', 'C:\\src\\demo')[4], '-p:SolutionDir=C:\\src\\demo\\');
  });
});

describe('output parsing', () => {
  it('parseTargetPathOutput trims and maps empty to undefined', () => {
    assert.equal(parseTargetPathOutput('C:\\out\\x64\\Debug\\app.exe\r\n'), 'C:\\out\\x64\\Debug\\app.exe');
    assert.equal(parseTargetPathOutput('  \r\n'), undefined);
  });
  it('parseMsbuildVersion takes the last non-empty line', () => {
    assert.equal(parseMsbuildVersion('MSBuild version 17.14.10+8b8e13593 for .NET Framework\r\n17.14.10.28307\r\n'), '17.14.10.28307');
  });
});

describe('VsBridge (exec-injected)', () => {
  const exeAt = (msbuildPath: string, targetPath: string): VsExec => async (command, args) => {
    if (command.endsWith('vswhere.exe')) {
      return { stdout: `${msbuildPath}\r\n`, stderr: '', exitCode: 0 };
    }
    if (args.includes('-version')) {
      return { stdout: 'MSBuild version 17.14\r\n17.14.10\r\n', stderr: '', exitCode: 0 };
    }
    if (args.some((a) => a.startsWith('-getProperty'))) {
      return { stdout: `${targetPath}\r\n`, stderr: '', exitCode: 0 };
    }
    return { stdout: '', stderr: '', exitCode: 0 };
  };

  it('locates MSBuild via vswhere and caches TargetPath evals for the sync peek', async () => {
    const bridge = new VsBridge(exeAt('C:\\VS\\MSBuild\\Bin\\MSBuild.exe', 'C:\\out\\app.exe'), 'C:\\Installer\\vswhere.exe');
    const status = await bridge.checkToolchain();
    assert.equal(status.ok, true);
    assert.equal(status.msbuild, 'C:\\VS\\MSBuild\\Bin\\MSBuild.exe');
    assert.equal(status.version, '17.14.10');
    assert.equal(await bridge.evalTargetPath('C:\\src\\app.vcxproj', 'Debug', 'x64'), 'C:\\out\\app.exe');
    assert.equal(bridge.peekTargetPath('C:\\src\\app.vcxproj', 'Debug', 'x64'), 'C:\\out\\app.exe');
    assert.equal(bridge.peekTargetPath('C:\\src\\app.vcxproj', 'Release', 'x64'), undefined);
  });

  it('falls back to PATH msbuild when vswhere is absent, and reports absent when neither works', async () => {
    const pathOnly: VsExec = async (command, args) => {
      if (command.endsWith('vswhere.exe')) {
        throw new Error('spawn ENOENT');
      }
      if (command === 'msbuild' && args.includes('-version')) {
        return { stdout: '17.10.0\r\n', stderr: '', exitCode: 0 };
      }
      return { stdout: '', stderr: '', exitCode: 1 };
    };
    const bridge = new VsBridge(pathOnly, 'C:\\Installer\\vswhere.exe');
    const status = await bridge.checkToolchain();
    assert.equal(status.ok, true);
    assert.equal(status.msbuild, 'msbuild');

    const none: VsExec = async () => {
      throw new Error('spawn ENOENT');
    };
    const absent = new VsBridge(none, 'C:\\Installer\\vswhere.exe');
    assert.equal((await absent.checkToolchain()).ok, false);
    await assert.rejects(() => absent.evalTargetPath('a.vcxproj', 'Debug', 'x64'), /MSBuild was not found/);
  });

  it('surfaces a guidance error when the TargetPath evaluation fails (older MSBuild)', async () => {
    const evalFails: VsExec = async (command, args) => {
      if (command.endsWith('vswhere.exe')) {
        return { stdout: 'C:\\VS\\MSBuild.exe\r\n', stderr: '', exitCode: 0 };
      }
      if (args.some((a) => a.startsWith('-getProperty'))) {
        return { stdout: '', stderr: 'MSBUILD : error MSB1001: Unknown switch.', exitCode: 1 };
      }
      return { stdout: '17.0\r\n', stderr: '', exitCode: 0 };
    };
    const bridge = new VsBridge(evalFails, 'C:\\Installer\\vswhere.exe');
    await assert.rejects(() => bridge.evalTargetPath('a.vcxproj', 'Debug', 'x64'), /17\.8\+/);
  });

  it('invalidateCache drops the probe and eval caches', async () => {
    let probes = 0;
    const counting: VsExec = async (command, args) => {
      if (command.endsWith('vswhere.exe')) {
        probes += 1;
        return { stdout: 'C:\\VS\\MSBuild.exe\r\n', stderr: '', exitCode: 0 };
      }
      if (args.some((a) => a.startsWith('-getProperty'))) {
        return { stdout: 'C:\\out\\app.exe\r\n', stderr: '', exitCode: 0 };
      }
      return { stdout: '17.14\r\n', stderr: '', exitCode: 0 };
    };
    const bridge = new VsBridge(counting, 'C:\\Installer\\vswhere.exe');
    await bridge.checkToolchain();
    await bridge.checkToolchain();
    assert.equal(probes, 1); // cached
    await bridge.evalTargetPath('a.vcxproj', 'Debug', 'x64');
    bridge.invalidateCache();
    assert.equal(bridge.peekTargetPath('a.vcxproj', 'Debug', 'x64'), undefined);
    await bridge.checkToolchain();
    assert.equal(probes, 2); // re-probed after invalidation
  });
});
