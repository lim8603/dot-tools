import type { ProjectFile } from '../../core/types';

/**
 * Minimal Node.js starter template (F20). `npm init` scaffolds only a package.json (no
 * runnable entry), so — like CMake/Python/Go (D-13) — the extension writes both a
 * package.json (with a `start` and a `build` script, so both the Run and Build buttons
 * work out of the box) and a runnable index.js via workspace.fs. A plain-JS template runs
 * immediately with no `npm install`; a TypeScript template would need the typescript
 * dependency installed first, which F20's "instantly runnable" contract rules out. Pure /
 * vscode-free so it is unit-testable. `name` is already validated (validateProjectName).
 */
export function nodeProjectFiles(name: string): ProjectFile[] {
  const pkg =
    JSON.stringify(
      {
        name,
        version: '0.1.0',
        private: true,
        description: '',
        main: 'index.js',
        scripts: {
          start: 'node index.js',
          build: 'node -e "console.log(\'nothing to build\')"',
        },
      },
      null,
      2,
    ) + '\n';

  const indexJs = [`console.log('Hello from ${name}!');`, ''].join('\n');

  return [
    { relativePath: 'package.json', content: pkg },
    { relativePath: 'index.js', content: indexJs },
  ];
}
