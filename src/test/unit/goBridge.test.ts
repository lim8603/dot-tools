import { strict as assert } from 'node:assert';
import { goProjectName, parseMainPackages, parseModulePath } from '../../adapters/go/goBridge';

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
