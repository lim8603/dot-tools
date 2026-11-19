import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { vsAdapter } from '../../adapters/vs/vsAdapter';
import { defaultVswherePath } from '../../adapters/vs/vsBridge';
import type { ProjectInfo, Selection } from '../../core/types';

const SLN = `
Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
VisualStudioVersion = 17.0.31903.59
MinimumVisualStudioVersion = 10.0.40219.1
Project("{8BC9CEB8-8B4A-11D0-8D11-00A0C91BC942}") = "app", "app\\app.vcxproj", "{C1000000-0000-0000-0000-000000000001}"
EndProject
Global
\tGlobalSection(SolutionConfigurationPlatforms) = preSolution
\t\tDebug|x64 = Debug|x64
\t\tDebug|x86 = Debug|x86
\tEndGlobalSection
\tGlobalSection(ProjectConfigurationPlatforms) = postSolution
\t\t{C1000000-0000-0000-0000-000000000001}.Debug|x64.ActiveCfg = Debug|x64
\t\t{C1000000-0000-0000-0000-000000000001}.Debug|x64.Build.0 = Debug|x64
\t\t{C1000000-0000-0000-0000-000000000001}.Debug|x86.ActiveCfg = Debug|Win32
\t\t{C1000000-0000-0000-0000-000000000001}.Debug|x86.Build.0 = Debug|Win32
\tEndGlobalSection
EndGlobal
`;

const VCXPROJ = `<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <ItemGroup Label="ProjectConfigurations">
    <ProjectConfiguration Include="Debug|Win32"><Configuration>Debug</Configuration><Platform>Win32</Platform></ProjectConfiguration>
    <ProjectConfiguration Include="Debug|x64"><Configuration>Debug</Configuration><Platform>x64</Platform></ProjectConfiguration>
  </ItemGroup>
  <PropertyGroup Label="Globals"><ProjectGuid>{C1000000-0000-0000-0000-000000000001}</ProjectGuid><RootNamespace>app</RootNamespace></PropertyGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.Default.props" />
  <PropertyGroup Label="Configuration"><ConfigurationType>Application</ConfigurationType><PlatformToolset>$(DefaultPlatformToolset)</PlatformToolset></PropertyGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.props" />
  <ItemGroup><ClCompile Include="main.cpp" /></ItemGroup>
  <Import Project="$(VCTargetsPath)\\Microsoft.Cpp.targets" />
</Project>
`;

/** MSBuild via vswhere, the way VsBridge finds it; undefined when VS / C++ tools are absent. */
function findMsbuild(): string | undefined {
  try {
    const out = execFileSync(
      defaultVswherePath(),
      ['-latest', '-products', '*', '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64', '-find', 'MSBuild\\**\\Bin\\MSBuild.exe'],
      { encoding: 'utf8' },
    );
    const path = out.split(/\r?\n/).find((l) => l.trim().length > 0)?.trim();
    return path && existsSync(path) ? path : undefined;
  } catch {
    return undefined;
  }
}

/**
 * R-4 / B11 — "Clean the whole solution" from a Win32 member project. A solution names
 * that platform x86, and real MSBuild rejects `w32.sln /p:Platform=Win32` with MSB4126
 * (measured 2026-11-19, VS 18). The task the adapter builds must pass the solution's own
 * name and, run through real MSBuild, remove what the x86 solution build produced.
 */
describe('VS whole-solution Clean from a Win32 member (R-4, B11)', function () {
  this.timeout(300000);
  let dir: string;
  let msbuild: string;
  let project: ProjectInfo;

  before(function () {
    if (process.platform !== 'win32') {
      this.skip();
    }
    const found = findMsbuild();
    if (!found) {
      this.skip();
    }
    msbuild = found!;
    dir = mkdtempSync(join(tmpdir(), 'ds-vs-w32-'));
    mkdirSync(join(dir, 'app'));
    writeFileSync(join(dir, 'w32.sln'), SLN);
    writeFileSync(join(dir, 'app', 'app.vcxproj'), VCXPROJ);
    writeFileSync(join(dir, 'app', 'main.cpp'), 'int main() { return 0; }\n');
    execFileSync(msbuild, ['w32.sln', '/p:Configuration=Debug', '/p:Platform=x86', '/m', '/nologo', '-v:q'], { cwd: dir });
    assert.ok(existsSync(join(dir, 'Debug', 'app.exe')), 'the x86 solution build produced app.exe');

    const folder: vscode.WorkspaceFolder = { uri: vscode.Uri.file(dir), name: 'w32', index: 0 };
    project = {
      id: 'vs:app/app.vcxproj',
      name: 'app',
      adapterId: 'vs',
      manifestPath: join(dir, 'app', 'app.vcxproj'),
      workspaceFolder: folder,
      parentId: 'vs:w32.sln',
    };
  });

  after(() => {
    vsAdapter.invalidateCache?.();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('offers and runs the whole-solution Clean with the solution platform x86', async () => {
    const sel: Selection = { projectId: project.id, values: { profile: 'Debug', architecture: 'Win32' } };

    const scopes = await vsAdapter.cleanScopes!(project, sel, {});
    const all = scopes.find((s) => s.id === 'all');
    assert.ok(all, 'a member project offers the whole-solution scope');
    assert.match(all.description ?? '', /Debug\|x86/);

    const task = await vsAdapter.createCleanTask!(project, sel, {}, 'all');
    assert.ok(task, 'the adapter builds a Clean task');
    const exec = task.execution as vscode.ProcessExecution;
    assert.ok(exec.args.includes('/p:Platform=x86'), `args: ${exec.args.join(' ')}`);
    assert.ok(!exec.args.includes('/p:Platform=Win32'));

    // Run the exact args through real MSBuild (throws on MSB4126 / non-zero exit).
    execFileSync(msbuild, exec.args, { cwd: exec.options?.cwd ?? dir });
    assert.equal(existsSync(join(dir, 'Debug', 'app.exe')), false, 'Clean removed the solution output');
  });
});
