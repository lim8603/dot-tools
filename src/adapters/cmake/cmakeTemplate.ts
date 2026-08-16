import type { ProjectFile } from '../../core/types';

/**
 * Minimal C++ (CMake) starter template (F20, TASK-023). CMake has no native project
 * scaffolder, so the extension writes these files itself (D-13). Pure/vscode-free so
 * it is unit-testable. `name` is already validated (validateProjectName) — safe as a
 * CMake target name (letters/digits/hyphen/underscore).
 */
export function cmakeProjectFiles(name: string): ProjectFile[] {
  const cmakeLists = [
    'cmake_minimum_required(VERSION 3.15)',
    `project(${name} CXX)`,
    '',
    'set(CMAKE_CXX_STANDARD 17)',
    'set(CMAKE_CXX_STANDARD_REQUIRED ON)',
    '',
    `add_executable(${name} main.cpp)`,
    '',
  ].join('\n');

  const mainCpp = [
    '#include <iostream>',
    '',
    'int main() {',
    `    std::cout << "Hello from ${name}!" << std::endl;`,
    '    return 0;',
    '}',
    '',
  ].join('\n');

  return [
    { relativePath: 'CMakeLists.txt', content: cmakeLists },
    { relativePath: 'main.cpp', content: mainCpp },
  ];
}
