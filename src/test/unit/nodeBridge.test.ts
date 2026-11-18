import { strict as assert } from 'node:assert';
import {
  assembleNodeArgs,
  buildNodeDebugConfig,
  escapeCmdShimArg,
  escapePosixArg,
  nodeShellCommand,
  nodeProjectName,
  packageManagerFromLockfile,
  parseScripts,
} from '../../adapters/node/nodeBridge';

describe('parseScripts', () => {
  it('reads the scripts map, preserving file order and commands', () => {
    const pkg = JSON.stringify({ name: 'x', scripts: { build: 'tsc', start: 'node .', dev: 'tsx watch' } });
    assert.deepEqual(parseScripts(pkg), [
      { name: 'build', command: 'tsc' },
      { name: 'start', command: 'node .' },
      { name: 'dev', command: 'tsx watch' },
    ]);
  });

  it('returns [] for invalid JSON or a missing/non-object scripts field', () => {
    assert.deepEqual(parseScripts('{ not json'), []);
    assert.deepEqual(parseScripts('{}'), []);
    assert.deepEqual(parseScripts(JSON.stringify({ scripts: ['a', 'b'] })), []);
    assert.deepEqual(parseScripts(JSON.stringify({ scripts: 'nope' })), []);
  });

  it('drops non-string script values', () => {
    const pkg = JSON.stringify({ scripts: { ok: 'node .', bad: 123, nested: { x: 1 } } });
    assert.deepEqual(parseScripts(pkg), [{ name: 'ok', command: 'node .' }]);
  });
});

describe('nodeProjectName', () => {
  it('uses the package.json name field when present', () => {
    assert.equal(nodeProjectName(JSON.stringify({ name: '@scope/my-app' }), '/w/app/package.json'), '@scope/my-app');
    assert.equal(nodeProjectName(JSON.stringify({ name: '  trimmed  ' }), '/w/app/package.json'), 'trimmed');
  });

  it('falls back to the folder name for a missing/blank name or bad JSON (Windows or POSIX)', () => {
    assert.equal(nodeProjectName(JSON.stringify({ version: '1.0.0' }), '/home/u/widget/package.json'), 'widget');
    assert.equal(nodeProjectName('{ broken', 'C:\\src\\gadget\\package.json'), 'gadget');
    assert.equal(nodeProjectName(JSON.stringify({ name: '   ' }), '/w/svc/package.json'), 'svc');
  });
});

describe('packageManagerFromLockfile', () => {
  it('maps each known lockfile to its package manager', () => {
    assert.equal(packageManagerFromLockfile('pnpm-lock.yaml'), 'pnpm');
    assert.equal(packageManagerFromLockfile('yarn.lock'), 'yarn');
    assert.equal(packageManagerFromLockfile('package-lock.json'), 'npm');
  });

  it('returns undefined for an unknown lockfile name', () => {
    assert.equal(packageManagerFromLockfile('bun.lockb'), undefined);
    assert.equal(packageManagerFromLockfile('package.json'), undefined);
  });
});

describe('assembleNodeArgs', () => {
  it('runs a script with no args as just `run <script>`', () => {
    assert.deepEqual(assembleNodeArgs('start', []), ['run', 'start']);
    assert.deepEqual(assembleNodeArgs('build', []), ['run', 'build']);
  });

  it('forwards runArgs after a `--` separator (portable across npm/pnpm/yarn)', () => {
    assert.deepEqual(assembleNodeArgs('start', ['--port', '3000']), ['run', 'start', '--', '--port', '3000']);
  });
});

describe('buildNodeDebugConfig', () => {
  it('builds a js-debug node config that runs the script via the package manager', () => {
    assert.deepEqual(
      buildNodeDebugConfig('example-hello', 'pnpm', 'dev', ['--watch'], '/w/hello', { NODE_ENV: 'development' }),
      {
        type: 'node',
        request: 'launch',
        name: 'Debug example-hello',
        cwd: '/w/hello',
        runtimeExecutable: 'pnpm',
        runtimeArgs: ['run', 'dev', '--', '--watch'],
        console: 'integratedTerminal',
        skipFiles: ['<node_internals>/**'],
        sourceMaps: true,
        env: { NODE_ENV: 'development' },
      },
    );
  });

  it('omits env when not provided and falls back to a generic name', () => {
    assert.deepEqual(buildNodeDebugConfig(undefined, 'npm', 'start', [], '/x'), {
      type: 'node',
      request: 'launch',
      name: 'Debug',
      cwd: '/x',
      runtimeExecutable: 'npm',
      runtimeArgs: ['run', 'start'],
      console: 'integratedTerminal',
      skipFiles: ['<node_internals>/**'],
      sourceMaps: true,
    });
  });
});

describe('nodeShellCommand (R-1, ADR-023)', () => {
  it('pins cmd.exe on Windows and double-escapes for the .cmd shim', () => {
    const { executable, shellArgs, commandLine } = nodeShellCommand('npm', ['run', 'start', '--', 'a|b'], 'win32', 'C:\\Windows\\system32\\cmd.exe');
    assert.equal(executable, 'C:\\Windows\\system32\\cmd.exe');
    assert.deepEqual(shellArgs, ['/d', '/s', '/c']);
    assert.equal(commandLine, '"npm ^^^"run^^^" ^^^"start^^^" ^^^"--^^^" ^^^"a^^^|b^^^""');
  });

  it('falls back to cmd.exe when ComSpec is unset', () => {
    assert.equal(nodeShellCommand('npm', [], 'win32').executable, 'cmd.exe');
  });

  it('pins /bin/sh elsewhere and single-quotes every token', () => {
    const { executable, shellArgs, commandLine } = nodeShellCommand('pnpm', ['run', "it's", ''], 'linux');
    assert.equal(executable, '/bin/sh');
    assert.deepEqual(shellArgs, ['-c']);
    assert.equal(commandLine, `'pnpm' 'run' 'it'\\''s' ''`);
  });

  it('escapeCmdShimArg applies MSVCRT quoting before the caret escapes', () => {
    // backslashes before a quote double and the quote is escaped; a trailing backslash doubles
    assert.equal(escapeCmdShimArg('a\\"b'), '^^^"a\\\\\\^^^"b^^^"'); // 1 backslash → 2, plus the quote's own escape
    assert.equal(escapeCmdShimArg('dir\\'), '^^^"dir\\\\^^^"');
    assert.equal(escapeCmdShimArg('%PATH%'), '^^^"^^^%PATH^^^%^^^"');
  });

  it('escapePosixArg survives embedded single quotes', () => {
    assert.equal(escapePosixArg("a'b"), `'a'\\''b'`);
  });
});
