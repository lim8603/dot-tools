import { OptionSpec } from '../../core/types';

/**
 * Cargo option catalog (ADR-012). Representative stub — the full set and the
 * real injection wiring land in M2/M5. Injection maps to `cargo --config` /
 * RUSTFLAGS / env per interface_contract §8. Covers the option-style categories
 * (compiler/linker/output/env); runArgs and buildEvent use free-form editors.
 *
 * `example` is the bare value to enter in the field (shown as the placeholder);
 * `injectsAs` teaches how that value is injected (`<value>` = what you enter).
 * They are kept separate so users never paste the injected form (e.g.
 * `RUSTFLAGS="-C linker=lld"`) into the field and double the prefix.
 */
export const CARGO_OPTION_CATALOG: OptionSpec[] = [
  {
    id: 'opt-level',
    category: 'compiler',
    label: 'Optimization level',
    description:
      'How much the compiler optimizes. Higher levels produce faster code but slower builds.',
    example: '3',
    injectsAs: 'cargo --config profile.<profile>.opt-level=<value>',
    docUrl: 'https://doc.rust-lang.org/cargo/reference/profiles.html#opt-level',
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
    example: 'thin',
    injectsAs: 'cargo --config profile.<profile>.lto="<value>"',
    docUrl: 'https://doc.rust-lang.org/cargo/reference/profiles.html#lto',
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
    example: '1',
    injectsAs: 'cargo --config profile.<profile>.codegen-units=<value>',
    docUrl: 'https://doc.rust-lang.org/cargo/reference/profiles.html#codegen-units',
    type: 'int',
    defaultValue: 16,
    injection: 'config',
  },
  {
    id: 'rustflags',
    category: 'compiler',
    label: 'Extra rustflags',
    description:
      'Free-form escape hatch (L-1): raw rustc codegen flags passed through RUSTFLAGS, one ' +
      'flag (with its value) per line — e.g. -C target-cpu=native. Do NOT put these in the ' +
      '"Linker program" field (that field takes only a program name like lld). Applies to the ' +
      'whole build and forces a full rebuild when changed.',
    example: '-C target-cpu=native',
    injectsAs: 'RUSTFLAGS=… <flags>',
    docUrl: 'https://doc.rust-lang.org/rustc/codegen-options/index.html',
    type: 'stringList',
    injection: 'flag',
  },
  {
    id: 'linker',
    category: 'linker',
    label: 'Linker program',
    description: 'Overrides the linker for the active target.',
    example: 'lld',
    injectsAs: 'RUSTFLAGS=-C linker=<value>',
    docUrl: 'https://doc.rust-lang.org/rustc/codegen-options/index.html#linker',
    type: 'string',
    injection: 'flag',
  },
  {
    id: 'target-dir',
    category: 'output',
    label: 'Target directory',
    description:
      'Directory where build artifacts are written. Keeps separate output trees per configuration.',
    example: 'target/release-custom',
    injectsAs: 'CARGO_TARGET_DIR=<value>',
    docUrl: 'https://doc.rust-lang.org/cargo/reference/config.html#buildtarget-dir',
    type: 'string',
    injection: 'env',
  },
  {
    id: 'rust-log',
    category: 'env',
    label: 'RUST_LOG',
    description: 'Log filter passed to the program via environment.',
    example: 'debug',
    injectsAs: 'RUST_LOG=<value>',
    // RUST_LOG is an env_logger/tracing convention, not a Cargo/rustc setting.
    docUrl: 'https://docs.rs/env_logger/latest/env_logger/#enabling-logging',
    type: 'string',
    injection: 'env',
  },
];
