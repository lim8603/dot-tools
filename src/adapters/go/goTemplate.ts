import type { ProjectFile } from '../../core/types';

/**
 * Minimal Go starter template (F20). `go mod init` alone scaffolds only a go.mod (no
 * runnable main), so — like CMake/Python (D-13) — the extension writes both go.mod and a
 * runnable main.go via workspace.fs. Pure/vscode-free so it is unit-testable. `name` is
 * already validated (validateProjectName), so it is a safe module path segment.
 */
export function goProjectFiles(name: string): ProjectFile[] {
  const gomod = [`module ${name}`, '', 'go 1.21', ''].join('\n');

  const mainGo = [
    'package main',
    '',
    'import "fmt"',
    '',
    'func main() {',
    `\tfmt.Println("Hello from ${name}!")`,
    '}',
    '',
  ].join('\n');

  return [
    { relativePath: 'go.mod', content: gomod },
    { relativePath: 'main.go', content: mainGo },
  ];
}
