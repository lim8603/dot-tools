import { parseArgsLine } from './argsLine';
import type { InvocationConfig, OptionSpec, OptionValue } from './types';

/**
 * Invocation-overlay editing (TASK-014, ADR-011). Pure, vscode-free helpers that map a
 * catalog option (OptionSpec) onto the right InvocationConfig field so the settings page
 * can stay language-agnostic and the mapping stays unit-testable:
 *   compiler → compiler[id] · linker → linker[id] · output → outputDir · env → env[label]
 * Setting a value back to its default (or empty) removes it, keeping the stored overlay
 * minimal. `buildEvent`/`runArgs` categories use the free-form editors, not this path.
 */
export function applyOption(
  config: InvocationConfig,
  spec: OptionSpec,
  value: OptionValue | undefined,
): InvocationConfig {
  const next: InvocationConfig = {
    ...config,
    compiler: { ...config.compiler },
    linker: { ...config.linker },
    env: { ...config.env },
  };
  const remove = value === undefined || value === '' || value === spec.defaultValue;

  switch (spec.category) {
    case 'compiler':
      setOrDelete(next.compiler, spec.id, value, remove);
      break;
    case 'linker':
      setOrDelete(next.linker, spec.id, value, remove);
      break;
    case 'output':
      if (remove) {
        delete next.outputDir;
      } else {
        next.outputDir = String(value);
      }
      break;
    case 'env':
      // env vars are keyed by name; the catalog carries it in `label` (e.g. RUST_LOG).
      if (remove) {
        delete next.env![spec.label];
      } else {
        next.env![spec.label] = String(value);
      }
      break;
  }

  return pruneEmpty(next);
}

/** Set config.runArgs from one input line (shell-tokenized); empty line clears it. */
export function setRunArgsLine(config: InvocationConfig, line: string): InvocationConfig {
  const args = parseArgsLine(line);
  const next = { ...config };
  if (args.length === 0) {
    delete next.runArgs;
  } else {
    next.runArgs = args;
  }
  return next;
}

/**
 * Set config.preBuild / config.postBuild from a multi-line editor (one command per
 * line, F21). Blank lines are dropped and each command is kept verbatim (they run as
 * the user's shell, NFR-002a). Empty input clears the field so the overlay stays lean.
 */
export function setBuildEventLines(
  config: InvocationConfig,
  event: 'preBuild' | 'postBuild',
  text: string,
): InvocationConfig {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const next = { ...config };
  if (lines.length === 0) {
    delete next[event];
  } else {
    next[event] = lines;
  }
  return next;
}

function setOrDelete(
  record: Record<string, OptionValue> | undefined,
  id: string,
  value: OptionValue | undefined,
  remove: boolean,
): void {
  if (!record) {
    return;
  }
  if (remove) {
    delete record[id];
  } else {
    record[id] = value!;
  }
}

function pruneEmpty(config: InvocationConfig): InvocationConfig {
  if (config.compiler && Object.keys(config.compiler).length === 0) {
    delete config.compiler;
  }
  if (config.linker && Object.keys(config.linker).length === 0) {
    delete config.linker;
  }
  if (config.env && Object.keys(config.env).length === 0) {
    delete config.env;
  }
  return config;
}
