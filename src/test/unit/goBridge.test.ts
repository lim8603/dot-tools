import { strict as assert } from 'node:assert';
import {
  assembleGoArgs,
  buildDelveConfig,
  goBuildFlags,
  goProjectName,
  parseMainPackages,
  parseModulePath,
} from '../../adapters/go/goBridge';

describe('parseModulePath', () => {
  it('reads the module path from the module directive', () => {
    assert.equal(parseModulePath('module github.com/user/hello\n\ngo 1.21\n'), 'github.com/user/hello');
  });

  it('ignores // comments and leading blank lines', () => {
    assert.equal(parseModulePath('// a comment\n\nmodule example.com/app // inline\n'), 'example.com/app');
  });

  it('returns undefined when there is no module directive', () => {
    assert.equal(parseModulePath('go 1.21\n'), undefined);
  });
});

describe('goProjectName', () => {
  it('uses the last segment of the module path', () => {
    assert.equal(goProjectName('github.com/user/my-service', '/w/svc/go.mod'), 'my-service');
    assert.equal(goProjectName('hello', '/w/hello/go.mod'), 'hello');
  });

  it('falls back to the go.mod folder name (Windows or POSIX separators)', () => {
    assert.equal(goProjectName(undefined, 'C:\\src\\widget\\go.mod'), 'widget');
    assert.equal(goProjectName('   ', '/home/u/app/go.mod'), 'app');
  });
});

describe('parseMainPackages', () => {
  it('parses importPath|dir lines, skipping blanks (non-main packages)', () => {
    const stdout = [
      'example.com/hello|/w/hello',
      '', // a non-main package printed a blank line
      'example.com/hello/cmd/cli|/w/hello/cmd/cli',
      '',
    ].join('\n');
    assert.deepEqual(parseMainPackages(stdout), [
      { importPath: 'example.com/hello', dir: '/w/hello' },
      { importPath: 'example.com/hello/cmd/cli', dir: '/w/hello/cmd/cli' },
    ]);
  });

  it('keeps dirs that contain spaces (Windows paths) — | is the separator', () => {
    assert.deepEqual(parseMainPackages('example.com/app|C:\\Users\\a b\\app'), [
      { importPath: 'example.com/app', dir: 'C:\\Users\\a b\\app' },
    ]);
  });

  it('returns [] for empty output', () => {
    assert.deepEqual(parseMainPackages('   \n\n'), []);
  });
});

describe('goBuildFlags', () => {
  it('maps value flags and boolean switches in a stable order', () => {
    assert.deepEqual(
      goBuildFlags({ ldflags: '-s -w', gcflags: 'all=-N -l', tags: 'dev', race: true, trimpath: true }),
      ['-ldflags', '-s -w', '-gcflags', 'all=-N -l', '-tags', 'dev', '-race', '-trimpath'],
    );
  });

  it('drops blank strings and false/omitted booleans', () => {
    assert.deepEqual(goBuildFlags({ ldflags: '   ', race: false }), []);
    assert.deepEqual(goBuildFlags({}), []);
  });
});

describe('assembleGoArgs', () => {
  // `go clean` removes files; it does not compile, so build flags are not just useless
  // here — go rejects the command outright when they are passed.
  it('clean drops the build flags (B-4)', () => {
    assert.deepEqual(
      assembleGoArgs('clean', './cmd/api', { compiler: { race: true, trimpath: true } }),
      ['clean', './cmd/api'],
    );
  });

  it('clean ignores runArgs (B-4)', () => {
    assert.deepEqual(assembleGoArgs('clean', './cmd/api', { runArgs: ['-x'] }), [
      'clean', './cmd/api',
    ]);
  });

  it('build puts flags before the target package', () => {
    assert.deepEqual(assembleGoArgs('build', './cmd/api', { compiler: { race: true } }), [
      'build', '-race', './cmd/api',
    ]);
  });

  it('run puts runArgs after the package (go run has no --)', () => {
    assert.deepEqual(
      assembleGoArgs('run', 'example.com/app', { compiler: { tags: 'dev' }, runArgs: ['--verbose', 'x'] }),
      ['run', '-tags', 'dev', 'example.com/app', '--verbose', 'x'],
    );
  });

  it('build with an empty overlay is just build + target', () => {
    assert.deepEqual(assembleGoArgs('build', '.', {}), ['build', '.']);
  });
});

describe('buildDelveConfig', () => {
  it('builds a go delve launch config (mode debug, program = package dir)', () => {
    assert.deepEqual(
      buildDelveConfig('hello', '/w/hello', ['--flag'], '/w/hello', { CGO_ENABLED: '1' }, '-tags dev'),
      {
        type: 'go',
        request: 'launch',
        name: 'Debug hello',
        mode: 'debug',
        program: '/w/hello',
        args: ['--flag'],
        cwd: '/w/hello',
        env: { CGO_ENABLED: '1' },
        buildFlags: '-tags dev',
      },
    );
  });

  it('omits env/buildFlags when not provided and falls back to a generic name', () => {
    assert.deepEqual(buildDelveConfig(undefined, '/x', [], '/x'), {
      type: 'go',
      request: 'launch',
      name: 'Debug',
      mode: 'debug',
      program: '/x',
      args: [],
      cwd: '/x',
    });
  });
});
