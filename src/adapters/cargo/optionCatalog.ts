import { OptionSpec } from '../../core/types';

/**
 * Cargo option catalog (ADR-012). Representative stub — the full set and the
 * real injection wiring land in M2/M5. Injection maps to `cargo --config` /
 * RUSTFLAGS / env per interface_contract §8. Covers the option-style categories
 * (compiler/linker/output/env); runArgs and buildEvent use free-form editors.
 */
export const CARGO_OPTION_CATALOG: OptionSpec[] = [
  {
    id: 'opt-level',
    category: 'compiler',
    label: 'Optimization level',
    description:
      'How much the compiler optimizes. Higher levels produce faster code but slower builds.',
    example: 'cargo build --config profile.dev.opt-level=3',
    type: 'enum',
    allowedValues: ['0', '1', '2', '3', 's', 'z'],
    defaultValue: '0',
    injection: 'config',
  },
  {
    id: 'lto',
    category: 'compiler',
    label: 'Link-time optimization (LTO)',
    description:
      'Optimizes across crate boundaries at link time. Faster runtime, longer link times.',
    example: 'cargo build --config profile.release.lto="thin"',
    type: 'enum',
    allowedValues: ['false', 'thin', 'fat'],
    defaultValue: 'false',
    injection: 'config',
  },
  {
    id: 'codegen-units',
    category: 'compiler',
    label: 'Codegen units',
    description:
      'Parallel code-generation units. Fewer units allow more optimization; more units build faster.',
    example: 'cargo build --config profile.release.codegen-units=1',
    type: 'int',
    defaultValue: 16,
    injection: 'config',
  },
  {
    id: 'linker',
    category: 'linker',
    label: 'Linker program',
    description: 'Overrides the linker for the active target (injected via RUSTFLAGS).',
    example: 'RUSTFLAGS="-C linker=lld"',
    type: 'string',
    injection: 'flag',
  },
  {
    id: 'target-dir',
    category: 'output',
    label: 'Target directory',
    description:
      'Directory where build artifacts are written. Keeps separate output trees per configuration.',
    example: 'CARGO_TARGET_DIR=target/release-custom',
    type: 'string',
    injection: 'env',
  },
  {
    id: 'rust-log',
    category: 'env',
    label: 'RUST_LOG',
    description: 'Log filter passed to the program via environment.',
    example: 'RUST_LOG=debug',
    type: 'string',
    injection: 'env',
  },
];
