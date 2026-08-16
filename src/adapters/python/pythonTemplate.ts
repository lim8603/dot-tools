import type { ProjectFile } from '../../core/types';

/**
 * Minimal Python starter template (F20, TASK-023). Python has no single native
 * "new project" command, so the extension writes a basic pyproject.toml (the manifest
 * DevSwitcher detects) plus a runnable main.py (D-13). Pure/vscode-free so it is
 * unit-testable. `name` is already validated (validateProjectName), so it is a safe
 * PEP 508 project name.
 */
export function pythonProjectFiles(name: string): ProjectFile[] {
  const pyproject = [
    '[project]',
    `name = "${name}"`,
    'version = "0.1.0"',
    'description = "A new Python project."',
    'requires-python = ">=3.9"',
    '',
    '[build-system]',
    'requires = ["setuptools>=61"]',
    'build-backend = "setuptools.build_meta"',
    '',
  ].join('\n');

  const mainPy = [
    'def main() -> None:',
    `    print("Hello from ${name}!")`,
    '',
    '',
    'if __name__ == "__main__":',
    '    main()',
    '',
  ].join('\n');

  return [
    { relativePath: 'pyproject.toml', content: pyproject },
    { relativePath: 'main.py', content: mainPy },
  ];
}
