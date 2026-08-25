import { strict as assert } from 'node:assert';
import {
  assemblePythonArgs,
  buildDebugpyConfig,
  interpreterKey,
  PythonBridge,
  pythonProjectName,
  resolveInterpreter,
  venvInterpreter,
  type ExecResult,
  type PythonExec,
} from '../../adapters/python/pythonBridge';

describe('pythonProjectName', () => {
  it('uses the folder that holds pyproject.toml', () => {
    assert.equal(pythonProjectName('/home/u/svc/pyproject.toml'), 'svc');
    assert.equal(pythonProjectName('C:\\src\\my-app\\pyproject.toml'), 'my-app');
  });
});

describe('venvInterpreter', () => {
  it('builds the Windows interpreter path', () => {
    assert.equal(venvInterpreter('C:\\p\\.venv', 'win32'), 'C:\\p\\.venv\\Scripts\\python.exe');
  });

  it('builds the POSIX interpreter path', () => {
    assert.equal(venvInterpreter('/p/.venv', 'linux'), '/p/.venv/bin/python');
  });
});

describe('assemblePythonArgs', () => {
  it('puts the script first, then run args', () => {
    assert.deepEqual(assemblePythonArgs('main.py', ['--verbose', 'x']), ['main.py', '--verbose', 'x']);
  });

  it('handles no run args', () => {
    assert.deepEqual(assemblePythonArgs('app.py'), ['app.py']);
  });
});

describe('interpreterKey', () => {
  it('collapses Windows alias paths that resolve to one interpreter (case/slash-insensitive)', () => {
    // python and python3 both report the same sys.executable → same key → deduped.
    const a = interpreterKey('C:\\Python312\\python.exe', 'win32');
    const b = interpreterKey('c:/Python312/PYTHON.EXE', 'win32');
    assert.equal(a, b);
  });

  it('keeps POSIX paths distinct and case-sensitive', () => {
    assert.equal(interpreterKey('/usr/bin/python3.12', 'linux'), '/usr/bin/python3.12');
    assert.notEqual(interpreterKey('/usr/bin/python3', 'linux'), interpreterKey('/usr/local/bin/python3', 'linux'));
  });
});

describe('resolveInterpreter', () => {
  it('uses the selected environment (venv path or system command)', () => {
    assert.equal(resolveInterpreter('C:\\p\\.venv\\Scripts\\python.exe'), 'C:\\p\\.venv\\Scripts\\python.exe');
    assert.equal(resolveInterpreter('python3'), 'python3');
  });

  it('falls back to `python` when the environment chip is unset', () => {
    assert.equal(resolveInterpreter(undefined), 'python');
    assert.equal(resolveInterpreter(''), 'python');
  });

  it('falls back to `python` for a non-string (multi-select) value', () => {
    assert.equal(resolveInterpreter(['a', 'b']), 'python');
  });
});

describe('buildDebugpyConfig', () => {
  it('builds a debugpy launch config from a script + interpreter', () => {
    const cfg = buildDebugpyConfig('svc', '/w/svc/main.py', '/w/svc/.venv/bin/python', ['-v'], '/w/svc', {
      PYTHONPATH: './libs',
    });
    assert.deepEqual(cfg, {
      type: 'debugpy',
      request: 'launch',
      name: 'Debug svc',
      program: '/w/svc/main.py',
      python: '/w/svc/.venv/bin/python',
      args: ['-v'],
      cwd: '/w/svc',
      console: 'integratedTerminal',
      justMyCode: true,
      env: { PYTHONPATH: './libs' },
    });
  });

  it('omits env when empty and falls back to a generic name', () => {
    const cfg = buildDebugpyConfig(undefined, '/x/app.py', 'python', [], '/x');
    assert.equal(cfg.name, 'Debug');
    assert.equal(cfg.python, 'python');
    assert.ok(!('env' in cfg));
  });
});

// ── PythonBridge probe cache (v1.2.1 `probe: false` contract) ─────────────────
// Listing interpreters costs one process per candidate — every venv dir plus every
// system interpreter — and the chip is asked on activation, on every rescan and on
// every settings-page render. peekInterpreter is what makes those asks free.

function fakePython(script: (command: string) => Partial<ExecResult>): {
  exec: PythonExec;
  calls: string[];
} {
  const calls: string[] = [];
  const exec: PythonExec = (command) => {
    calls.push(command);
    return Promise.resolve({ stdout: '', stderr: '', exitCode: 0, ...script(command) });
  };
  return { exec, calls };
}

describe('PythonBridge.peekInterpreter', () => {
  it('never spawns, and answers undefined until the interpreter has been probed', async () => {
    const { exec, calls } = fakePython(() => ({ stdout: '3.12.1\n/usr/bin/python3\n' }));
    const bridge = new PythonBridge(exec);

    assert.equal(bridge.peekInterpreter('python3'), undefined);
    assert.equal(calls.length, 0, 'peek must not run an interpreter');

    await bridge.detectInterpreter('python3');
    assert.deepEqual(bridge.peekInterpreter('python3'), {
      version: 'Python 3.12.1',
      executable: '/usr/bin/python3',
    });
    assert.equal(calls.length, 1);
  });

  it('reports a probed-but-absent interpreter as null, distinct from never-probed', async () => {
    const { exec } = fakePython(() => ({ exitCode: 1 }));
    const bridge = new PythonBridge(exec);
    await bridge.detectInterpreter('nope');
    assert.equal(bridge.peekInterpreter('nope'), null);
    assert.equal(bridge.peekInterpreter('other'), undefined);
  });

  it('forgets everything after invalidateCache so a re-probe is possible', async () => {
    const { exec } = fakePython(() => ({ stdout: '3.12.1\n/usr/bin/python3\n' }));
    const bridge = new PythonBridge(exec);
    await bridge.detectInterpreter('python3');
    bridge.invalidateCache();
    assert.equal(bridge.peekInterpreter('python3'), undefined);
  });
});
