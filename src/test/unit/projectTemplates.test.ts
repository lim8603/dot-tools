import { strict as assert } from 'node:assert';
import { cmakeProjectFiles } from '../../adapters/cmake/cmakeTemplate';
import { pythonProjectFiles } from '../../adapters/python/pythonTemplate';

describe('cmakeProjectFiles', () => {
  it('emits CMakeLists.txt and main.cpp with the project name embedded', () => {
    const files = cmakeProjectFiles('my-app');
    const paths = files.map((f) => f.relativePath).sort();
    assert.deepEqual(paths, ['CMakeLists.txt', 'main.cpp']);

    const cmake = files.find((f) => f.relativePath === 'CMakeLists.txt')!;
    assert.match(cmake.content, /project\(my-app CXX\)/);
    assert.match(cmake.content, /add_executable\(my-app main\.cpp\)/);

    const main = files.find((f) => f.relativePath === 'main.cpp')!;
    assert.match(main.content, /#include <iostream>/);
    assert.match(main.content, /Hello from my-app!/);
  });
});

describe('pythonProjectFiles', () => {
  it('emits pyproject.toml and main.py with the project name embedded', () => {
    const files = pythonProjectFiles('demo_pkg');
    const paths = files.map((f) => f.relativePath).sort();
    assert.deepEqual(paths, ['main.py', 'pyproject.toml']);

    const pyproject = files.find((f) => f.relativePath === 'pyproject.toml')!;
    assert.match(pyproject.content, /name = "demo_pkg"/);
    assert.match(pyproject.content, /\[build-system\]/);

    const main = files.find((f) => f.relativePath === 'main.py')!;
    assert.match(main.content, /Hello from demo_pkg!/);
    assert.match(main.content, /if __name__ == "__main__":/);
  });
});
