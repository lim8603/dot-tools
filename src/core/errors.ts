/**
 * DevSwitcherError — the extension's machine-readable error wrapper.
 *
 * Kept in its own module, free of `vscode`, so the CLI-boundary and pure layers
 * (e.g. cargoBridge) can throw it while staying unit-testable in plain Node
 * (coding_convention: "순수 함수 분리 ... VSCode API 무의존"). `core/types.ts`
 * re-exports it, so existing `import { DevSwitcherError } from '../core/types'`
 * sites keep working unchanged.
 */
export class DevSwitcherError extends Error {
  readonly code: string;

  constructor(code: string, message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'DevSwitcherError';
    this.code = code;
  }
}
