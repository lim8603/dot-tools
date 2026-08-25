import { strict as assert } from 'node:assert';
import {
  assembleDotnetArgs,
  buildConfigurationList,
  buildCoreclrConfig,
  buildMsbuildProps,
  dotnetProjectName,
  msbuildValue,
  parseGetProperty,
  splitTargetFrameworks,
  targetFrameworkItems,
} from '../../adapters/dotnet/dotnetBridge';
import type { ChipValue, Selection } from '../../core/types';

function sel(values: Record<string, ChipValue>): Selection {
  return { projectId: 'dotnet:App.csproj', values };
}

describe('parseGetProperty', () => {
  it('reads the Properties map from multi -getProperty JSON', () => {
    const stdout = '{\n  "Properties": {\n    "TargetFramework": "net10.0",\n    "AssemblyName": "hello"\n  }\n}';
    assert.deepEqual(parseGetProperty(stdout), { TargetFramework: 'net10.0', AssemblyName: 'hello' });
  });

  it('returns {} for empty output', () => {
    assert.deepEqual(parseGetProperty('   '), {});
  });

  it('returns {} for a bare (single-property) value that is not JSON', () => {
    assert.deepEqual(parseGetProperty('net10.0'), {});
  });
});

describe('splitTargetFrameworks', () => {
  it('splits <TargetFrameworks> on semicolons, trimming blanks', () => {
    assert.deepEqual(splitTargetFrameworks('', 'net8.0;net10.0 ; '), ['net8.0', 'net10.0']);
  });

  it('falls back to the single <TargetFramework> when plural is empty', () => {
    assert.deepEqual(splitTargetFrameworks('net10.0', ''), ['net10.0']);
  });

  it('prefers the plural list when both are present', () => {
    assert.deepEqual(splitTargetFrameworks('net10.0', 'net8.0;net10.0'), ['net8.0', 'net10.0']);
  });

  it('returns [] when neither is set', () => {
    assert.deepEqual(splitTargetFrameworks(undefined, undefined), []);
  });
});

describe('dotnetProjectName', () => {
  it('uses AssemblyName when set', () => {
    assert.equal(dotnetProjectName('C:/src/App/App.csproj', 'MyApp'), 'MyApp');
  });

  it('falls back to the .csproj filename stem (Windows or POSIX separators)', () => {
    assert.equal(dotnetProjectName('C:\\src\\App\\Web.Api.csproj'), 'Web.Api');
    assert.equal(dotnetProjectName('/home/u/svc/Svc.csproj', '  '), 'Svc');
  });
});

describe('buildConfigurationList / targetFrameworkItems', () => {
  it('offers Debug and Release configurations', () => {
    assert.deepEqual(
      buildConfigurationList().map((c) => c.id),
      ['Debug', 'Release'],
    );
  });

  it('maps frameworks to chip items', () => {
    assert.deepEqual(targetFrameworkItems(['net8.0', 'net10.0']), [
      { id: 'net8.0', label: 'net8.0' },
      { id: 'net10.0', label: 'net10.0' },
    ]);
  });
});

describe('msbuildValue', () => {
  it('renders bool / number / string / list', () => {
    assert.equal(msbuildValue(true), 'true');
    assert.equal(msbuildValue(false), 'false');
    assert.equal(msbuildValue(12), '12');
    assert.equal(msbuildValue('latest'), 'latest');
    assert.equal(msbuildValue(['a', 'b']), 'a;b');
  });
});

describe('buildMsbuildProps', () => {
  it('emits -p:Prop=Value from the compiler and linker records', () => {
    assert.deepEqual(
      buildMsbuildProps({ Optimize: true, AssemblyName: 'MyApp' }, { PublishTrimmed: true }),
      ['-p:Optimize=true', '-p:AssemblyName=MyApp', '-p:PublishTrimmed=true'],
    );
  });

  it('returns [] for empty overlays', () => {
    assert.deepEqual(buildMsbuildProps({}, {}), []);
  });
});

describe('assembleDotnetArgs', () => {
  it('builds with configuration, framework, rid, and props', () => {
    const args = assembleDotnetArgs(
      'build',
      'App.csproj',
      sel({ profile: 'Release', target: 'net10.0', architecture: 'win-x64' }),
      {},
      ['-p:Optimize=true'],
    );
    assert.deepEqual(args, [
      'build', 'App.csproj', '-c', 'Release', '-f', 'net10.0', '-r', 'win-x64', '-p:Optimize=true',
    ]);
  });

  // Clean must target the same output the build produced. If it dropped -c/-f/-r it
  // would clean the default configuration and leave the artifacts the user meant to drop.
  it('cleans with the same axes the build used (B-4)', () => {
    const args = assembleDotnetArgs(
      'clean',
      'App.csproj',
      sel({ profile: 'Release', target: 'net10.0', architecture: 'win-x64' }),
      {},
      ['-p:Optimize=true'],
    );
    assert.deepEqual(args, [
      'clean', 'App.csproj', '-c', 'Release', '-f', 'net10.0', '-r', 'win-x64', '-p:Optimize=true',
    ]);
  });

  it('clean ignores runArgs, which belong to run alone (B-4)', () => {
    const args = assembleDotnetArgs('clean', 'App.csproj', sel({}), { runArgs: ['--verbose'] });
    assert.deepEqual(args, ['clean', 'App.csproj', '-c', 'Debug']);
  });

  it('defaults configuration to Debug and omits optional -f/-r', () => {
    assert.deepEqual(assembleDotnetArgs('build', 'App.csproj', sel({}), {}), [
      'build', 'App.csproj', '-c', 'Debug',
    ]);
  });

  it('run puts runArgs after --', () => {
    const args = assembleDotnetArgs(
      'run',
      'App.csproj',
      sel({ profile: 'Debug', target: 'net10.0' }),
      { runArgs: ['--verbose', 'a b'] },
    );
    assert.deepEqual(args, [
      'run', '--project', 'App.csproj', '-c', 'Debug', '-f', 'net10.0', '--', '--verbose', 'a b',
    ]);
  });
});

describe('buildCoreclrConfig', () => {
  it('builds a coreclr launch config from a resolved assembly', () => {
    const cfg = buildCoreclrConfig('App', '/w/App/bin/Debug/net10.0/App.dll', ['--flag'], '/w/App');
    assert.deepEqual(cfg, {
      type: 'coreclr',
      request: 'launch',
      name: 'Debug App',
      program: '/w/App/bin/Debug/net10.0/App.dll',
      args: ['--flag'],
      cwd: '/w/App',
      stopAtEntry: false,
      console: 'internalConsole',
    });
  });

  it('falls back to a generic name when the project name is missing', () => {
    assert.equal(buildCoreclrConfig(undefined, '/x/A.dll', [], '/x').name, 'Debug');
  });
});
