import { defineConfig } from '@vscode/test-cli';

// Integration tests (TASK-020, 상세설계서 §15.2) run in a real VSCode Extension
// Development Host. They load the extension (dist/extension.js) with a fixture opened as
// the workspace, so activation, command registration, and the status bar can be exercised
// against the actual API. Unit tests (plain mocha, out/test/unit) stay separate — this
// host download is heavy and needs a display.
//
// Two hosts: the single-root cargo fixture (most tests), and a two-folder workspace for
// what only multi-root can show — per-folder project ids (ADR-025) and folder-level
// settings (D-27).
export default defineConfig([
  {
    label: 'single-root',
    files: 'out/test/integration/**/*.test.js',
    workspaceFolder: 'src/test/fixtures/cargo/hello',
    mocha: { timeout: 60000, ui: 'bdd' },
  },
  {
    label: 'multi-root',
    files: 'out/test/integration-multiroot/**/*.test.js',
    workspaceFolder: 'src/test/fixtures/multiroot/multiroot.code-workspace',
    mocha: { timeout: 60000, ui: 'bdd' },
  },
]);
