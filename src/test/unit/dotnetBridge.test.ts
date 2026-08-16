import { strict as assert } from 'node:assert';
import {
  buildConfigurationList,
  dotnetProjectName,
  parseGetProperty,
  splitTargetFrameworks,
  targetFrameworkItems,
} from '../../adapters/dotnet/dotnetBridge';

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
