import { defineConfig } from '@vscode/test-cli';

// Integration tests (TASK-020, 상세설계서 §15.2) run in a real VSCode Extension
// Development Host. They load the extension (dist/extension.js) with the cargo
// fixture opened as the workspace, so activation, command registration, and the
// status bar can be exercised against the actual API. Unit tests (plain mocha,
// out/test/unit) stay separate — this host download is heavy and needs a display.
export default defineConfig({
  files: 'out/test/integration/**/*.test.js',
  workspaceFolder: 'src/test/fixtures/cargo/hello',
  mocha: { timeout: 60000, ui: 'bdd' },
});
