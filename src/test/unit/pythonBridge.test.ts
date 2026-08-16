import { strict as assert } from 'node:assert';
import {
  assemblePythonArgs,
  pythonProjectName,
  venvInterpreter,
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
