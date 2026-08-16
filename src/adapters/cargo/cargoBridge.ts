import { execFile } from 'node:child_process';
import { dirname } from 'node:path';
import { DevSwitcherError } from '../../core/errors';
import type { ChipItem, ChipValue, InvocationConfig, OptionValue, Selection } from '../../core/types';

/**
 * CargoBridge — the cargo/rustup boundary layer.
 *
 * Two halves live here (interface_contract §8, 상세설계서 §8.1~§8.5):
 *  - Pure functions (TASK-004): argument assembly and JSON parsing.
 *  - The CLI I/O layer (TASK-005): execCapture + the CargoBridge class
 *    (fetchMetadata with caching, listInstalledTargets, checkToolchain).
 *
 * The module stays `vscode`-free — I/O methods take plain `manifestPath` strings,
 * not ProjectInfo, and DevSwitcherError comes from `core/errors` (also vscode-free)
 * — so the whole file is unit-testable in plain Node (mocha). The child_process
 * call is injected (CargoExec) so tests run without a real cargo/rustup toolchain.
 * The adapter (TASK-006) translates ProjectInfo into these string arguments.
 *
 * All `../../core/types` imports are type-only and erased at compile time.
 */

// ─────────────────────────────────────────────────────────────────────────────
// cargo JSON shapes (subset we consume)
// ─────────────────────────────────────────────────────────────────────────────

/** A `cargo metadata` target entry. */
export interface CargoTarget {
  name: string;
  kind: string[]; // e.g. ['bin'], ['lib'], ['example']
}

/** A `cargo metadata` package entry (subset). */
export interface CargoPackage {
  id: string;
  name: string;
  manifest_path: string;
  targets: CargoTarget[];
  features: Record<string, string[]>;
}

/** `cargo metadata --format-version=1 --no-deps` output (subset). */
export interface CargoMetadata {
  packages: CargoPackage[];
  workspace_members: string[]; // package ids that belong to the workspace
  workspace_root: string;
}

/** One `cargo build --message-format=json` line we care about (subset). */
interface CompilerArtifactMsg {
  reason?: string;
  executable?: string | null;
  target?: { name?: string; kind?: string[] };
}

/** A detected cargo package, before the adapter attaches workspace context. */
export interface CargoProject {
  name: string;
  manifestPath: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Selection value helpers
// ─────────────────────────────────────────────────────────────────────────────

function asString(v: ChipValue | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asStringArray(v: ChipValue | undefined): string[] {
  return Array.isArray(v) ? v : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Argument assembly (상세설계서 §8.3 features, §8.4 build/run)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Translate selected features into cargo flags (상세설계서 §8.3).
 * - `default` deselected (when the package has one) → `--no-default-features`
 * - any non-default selection → `--features a,b,c`
 * - unchanged default state → no flags
 */
export function featuresToArgs(selected: string[], hasDefault: boolean): string[] {
  const nonDefault = selected.filter((f) => f !== 'default');
  const defaultDeselected = hasDefault && !selected.includes('default');
  const args: string[] = [];
  if (defaultDeselected) {
    args.push('--no-default-features');
  }
  if (nonDefault.length > 0) {
    args.push('--features', nonDefault.join(','));
  }
  return args;
}

/**
 * Assemble cargo CLI args for a build or run (상세설계서 §8.4). runArgs come from
 * the invocation overlay (F16 promoted to InvocationConfig, ADR-011); the `--`
 * separator marks program args for `run`.
 */
export function assembleCargoArgs(
  action: 'build' | 'run',
  projectName: string,
  sel: Selection,
  config: InvocationConfig,
  hasDefaultFeature: boolean,
  overlayArgs: string[] = [],
): string[] {
  const profile = asString(sel.values.profile) ?? 'dev';
  const architecture = asString(sel.values.architecture);
  const features = featuresToArgs(asStringArray(sel.values.features), hasDefaultFeature);
  const targetArgs = architecture ? ['--target', architecture] : [];

  if (action === 'build') {
    return ['build', '-p', projectName, '--profile', profile, ...targetArgs, ...features, ...overlayArgs];
  }

  const bin = asString(sel.values.target);
  const runArgs = config.runArgs ?? [];
  return [
    'run',
    '-p',
    projectName,
    '--profile',
    profile,
    ...(bin ? ['--bin', bin] : []),
    ...targetArgs,
    ...features,
    ...overlayArgs, // cargo flags stay before `--`; program args follow
    ...(runArgs.length > 0 ? ['--', ...runArgs] : []),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Invocation overlay injection (TASK-012, ADR-011 / 상세설계서 §10.4)
// Turn the InvocationConfig overlay into cargo args + env. Pure and testable; the
// adapter folds these into the build/run tasks.
// ─────────────────────────────────────────────────────────────────────────────

/** Render an option value as a TOML scalar for `cargo --config key=value`. */
export function tomlScalar(value: OptionValue): string {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => JSON.stringify(item)).join(', ')}]`;
  }
  // Strings that are really bools/numbers stay bare (e.g. lto="false" vs "thin").
  if (value === 'true' || value === 'false' || /^-?\d+(\.\d+)?$/.test(value)) {
    return value;
  }
  return JSON.stringify(value); // TOML basic string (quoted, escaped)
}

/**
 * Compiler-category options → `--config profile.<profile>.<id>=<value>` pairs
 * (e.g. opt-level, lto, codegen-units). Flat list ready to append to the args.
 */
export function buildConfigArgs(compiler: Record<string, OptionValue>, profile: string): string[] {
  const args: string[] = [];
  for (const [id, value] of Object.entries(compiler)) {
    args.push('--config', `profile.${profile}.${id}=${tomlScalar(value)}`);
  }
  return args;
}

/**
 * Linker-category options → a RUSTFLAGS string (space-joined). Only `linker` is
 * modelled today (`-C linker=<value>`); returns '' when nothing applies.
 */
export function buildRustflags(linker: Record<string, OptionValue>): string {
  const flags: string[] = [];
  const linkerValue = linker['linker'];
  if (typeof linkerValue === 'string' && linkerValue.length > 0) {
    flags.push(`-C linker=${linkerValue}`);
  }
  return flags.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Executable resolution (상세설계서 §8.5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * From `cargo build --message-format=json` lines, pick the built executable for
 * the given target. Prefers an exact target-name match, then any `bin`, then the
 * first executable. Returns undefined when none is found (the caller raises the
 * user-facing error). Non-JSON lines are ignored.
 */
export function pickExecutable(jsonLines: string[], targetName: string | undefined): string | undefined {
  const artifacts: CompilerArtifactMsg[] = [];
  for (const line of jsonLines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    let msg: CompilerArtifactMsg;
    try {
      msg = JSON.parse(trimmed) as CompilerArtifactMsg;
    } catch {
      continue; // tolerate interleaved non-JSON output
    }
    if (msg.reason === 'compiler-artifact' && typeof msg.executable === 'string') {
      artifacts.push(msg);
    }
  }

  if (targetName) {
    const match = artifacts.find((a) => a.target?.name === targetName);
    if (match?.executable) {
      return match.executable;
    }
  }
  const bin = artifacts.find((a) => a.target?.kind?.includes('bin'));
  return bin?.executable ?? artifacts[0]?.executable ?? undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Debug configuration (상세설계서 §8.6) — CodeLLDB launch config
// ─────────────────────────────────────────────────────────────────────────────

/** A CodeLLDB (`vadimcn.vscode-lldb`) launch config; structurally a DebugConfiguration. */
export interface LldbLaunchConfig {
  type: 'lldb';
  request: 'launch';
  name: string;
  program: string;
  args: string[];
  cwd: string;
  sourceLanguages: string[];
}

/**
 * Assemble a CodeLLDB launch config from a resolved executable (상세설계서 §8.6).
 * Pure so it is unit-testable; the adapter supplies `program` (from resolveExecutable)
 * and `cwd`.
 */
export function buildLldbConfig(
  targetName: string | undefined,
  program: string,
  args: string[],
  cwd: string,
): LldbLaunchConfig {
  return {
    type: 'lldb',
    request: 'launch',
    name: targetName ? `Debug ${targetName}` : 'Debug',
    program,
    args,
    cwd,
    sourceLanguages: ['rust'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Display formatting (상세설계서 §5.2)
// ─────────────────────────────────────────────────────────────────────────────

const ARCH_ABBREVIATIONS: Record<string, string> = {
  x86_64: 'x64',
  aarch64: 'arm64',
  i686: 'x86',
  armv7: 'arm',
};

/** Abbreviate a target triple for the status bar, e.g. x86_64-pc-windows-msvc → x64-msvc. */
export function abbreviateTriple(triple: string): string {
  const parts = triple.split('-');
  if (parts.length < 2) {
    return triple;
  }
  const arch = ARCH_ABBREVIATIONS[parts[0]] ?? parts[0];
  const suffix = parts[parts.length - 1];
  return `${arch}-${suffix}`;
}

/**
 * Status-bar summary for the features chip. Counts every checked box so the number
 * matches the selection (including `default`, a real entry in `[features]`):
 *   []            → 'none'   (nothing enabled — `--no-default-features`, or a package
 *                             with no features), distinct from the default-on state
 *   ['default']   → 'default' (the default feature set is on — a plain `cargo build`)
 *   ['gui']       → 'gui'    (single feature by name)
 *   2+            → 'N features'
 * The full list is always available in the chip tooltip.
 */
export function formatFeatureCount(features: string[]): string {
  if (features.length === 0) {
    return 'none';
  }
  if (features.length === 1) {
    return features[0];
  }
  return `${features.length} features`;
}

// ─────────────────────────────────────────────────────────────────────────────
// cargo metadata parsing (상세설계서 §8.2/§8.3)
// ─────────────────────────────────────────────────────────────────────────────

function findPackage(metadata: CargoMetadata, packageName?: string): CargoPackage | undefined {
  if (packageName) {
    return metadata.packages.find((p) => p.name === packageName);
  }
  return metadata.packages[0];
}

/** Workspace member packages (독립 매니페스트면 단일). Adapter attaches workspaceFolder later. */
export function parseWorkspacePackages(metadata: CargoMetadata): CargoProject[] {
  const memberIds = new Set(metadata.workspace_members);
  const members = metadata.packages.filter((p) => memberIds.has(p.id));
  const source = members.length > 0 ? members : metadata.packages;
  return source.map((p) => ({ name: p.name, manifestPath: p.manifest_path }));
}

/** Feature names of a package plus whether it declares a `default` feature. */
export function parseFeatures(
  metadata: CargoMetadata,
  packageName?: string,
): { names: string[]; hasDefault: boolean } {
  const pkg = findPackage(metadata, packageName);
  if (!pkg) {
    return { names: [], hasDefault: false };
  }
  const names = Object.keys(pkg.features);
  return { names, hasDefault: names.includes('default') };
}

/** Runnable targets (`bin` + `example`) as chip items (상세설계서 §8.3). */
export function parseBinTargets(metadata: CargoMetadata, packageName?: string): ChipItem[] {
  const pkg = findPackage(metadata, packageName);
  if (!pkg) {
    return [];
  }
  return pkg.targets
    .filter((t) => t.kind.includes('bin') || t.kind.includes('example'))
    .map((t) => ({
      id: t.name,
      label: t.name,
      description: t.kind.includes('example') ? 'example' : undefined,
    }));
}

/** If the package has exactly one bin target, return its name for auto-selection. */
export function defaultBinTarget(metadata: CargoMetadata, packageName?: string): string | undefined {
  const pkg = findPackage(metadata, packageName);
  if (!pkg) {
    return undefined;
  }
  const bins = pkg.targets.filter((t) => t.kind.includes('bin'));
  return bins.length === 1 ? bins[0].name : undefined;
}

/** Profile chip items: built-in dev/release plus custom `[profile.*]` names from Cargo.toml. */
export function buildProfileList(customProfiles: string[]): ChipItem[] {
  const builtins: ChipItem[] = [
    { id: 'dev', label: 'dev', description: 'Debug' },
    { id: 'release', label: 'release', description: 'Release' },
  ];
  const custom = customProfiles
    .filter((name) => name !== 'dev' && name !== 'release')
    .map((name) => ({ id: name, label: name, description: 'custom' }));
  return [...builtins, ...custom];
}

// ─────────────────────────────────────────────────────────────────────────────
// cargo/rustup CLI I/O boundary (TASK-005, 상세설계서 §8.1)
//
// The only part of the bridge that touches the process boundary. Still vscode-free
// (callers pass a plain `cwd`/`manifestPath`, not a ProjectInfo) and exec-injected
// (CargoExec) so tests run hermetically without a real toolchain.
// ─────────────────────────────────────────────────────────────────────────────

/** cargo/rustup JSON output can be large on big workspaces; lift the buffer cap. */
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

/** Captured result of one CLI invocation. */
export interface ExecResult {
  stdout: string;
  stderr: string;
  /** Process exit code (0 on success). */
  exitCode: number;
}

/**
 * The injectable process-exec primitive. Resolves with the captured result for
 * any normal exit — including a non-zero one — and rejects only when the process
 * cannot be spawned at all (missing binary → ENOENT, signal, buffer overflow).
 */
export type CargoExec = (
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string> },
) => Promise<ExecResult>;

/** Default CargoExec: `child_process.execFile` with no shell (NFR-002, array args). */
export const defaultExec: CargoExec = (command, args, options) =>
  new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        // Merge overlay env over the inherited environment so PATH etc. survive.
        env: options.env ? { ...process.env, ...options.env } : undefined,
        encoding: 'utf8',
        maxBuffer: MAX_OUTPUT_BYTES,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        // On a normal exit execFile reports the exit code as a numeric `error.code`
        // (0 → null error). A non-numeric code means the process never ran normally
        // (ENOENT, killed by signal, maxBuffer exceeded) — a spawn failure, not an
        // exit status the caller can interpret.
        const code: unknown = error ? (error as { code?: unknown }).code : 0;
        if (error && typeof code !== 'number') {
          reject(new DevSwitcherError('CARGO_EXEC_FAILED', `Failed to run "${command}".`, error));
          return;
        }
        resolve({ stdout, stderr, exitCode: typeof code === 'number' ? code : 0 });
      },
    );
  });

/**
 * Capture the output of a single cargo/rustup invocation. Thin wrapper over the
 * injected exec primitive; it does not interpret the exit code — callers decide
 * what a non-zero exit means (a failed `cargo metadata` is an error; a missing
 * binary during `checkToolchain` is not).
 */
export function execCapture(
  command: string,
  args: string[],
  cwd: string | undefined,
  exec: CargoExec = defaultExec,
  env?: Record<string, string>,
): Promise<ExecResult> {
  return exec(command, args, { cwd, env });
}

/** Result of checkToolchain — version strings when present; ok when cargo exists (E1). */
export interface ToolchainStatus {
  cargo?: string;
  rustup?: string;
  ok: boolean;
}

/** One rustup target and whether it is installed (F19 §13.4). */
export interface TargetInfo {
  triple: string;
  installed: boolean;
}

/**
 * Parse `rustup target list` output. Each line is a triple, optionally suffixed with
 * a parenthesised marker — `(installed)` on installed targets (rustup also uses no
 * suffix for the rest). Blank lines are dropped; unknown markers count as not
 * installed. Pure so it is unit-tested without a real rustup.
 */
export function parseTargetList(stdout: string): TargetInfo[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const marker = line.match(/\(([^)]*)\)\s*$/);
      return {
        triple: line.replace(/\s*\([^)]*\)\s*$/, '').trim(),
        installed: marker ? marker[1].includes('installed') : false,
      };
    });
}

/**
 * Stateful cargo/rustup boundary: owns the metadata cache and the injected exec
 * primitive. The adapter (TASK-006) holds one instance and translates ProjectInfo
 * into the `manifestPath` strings these methods take.
 */
export class CargoBridge {
  private readonly exec: CargoExec;

  /**
   * manifestPath -> parsed metadata. No time-based expiry — invalidation is driven
   * entirely by ManifestWatcher (F17) and explicit refresh (상세설계서 §8.1), so a
   * chip click resolves from cache instantly even on slow, large workspaces.
   */
  private readonly metadataCache = new Map<string, CargoMetadata>();

  constructor(exec: CargoExec = defaultExec) {
    this.exec = exec;
  }

  /**
   * `cargo metadata` for a manifest, cached. On a cache miss it runs cargo and
   * parses the JSON; a non-zero exit or unparseable output raises
   * CARGO_METADATA_FAILED (E2 — the adapter keeps its last good cache and surfaces
   * stderr to the Output channel).
   */
  async fetchMetadata(manifestPath: string): Promise<CargoMetadata> {
    const cached = this.metadataCache.get(manifestPath);
    if (cached) {
      return cached;
    }
    const args = ['metadata', '--format-version=1', '--no-deps', '--manifest-path', manifestPath];
    const result = await execCapture('cargo', args, dirname(manifestPath), this.exec);
    if (result.exitCode !== 0) {
      throw new DevSwitcherError(
        'CARGO_METADATA_FAILED',
        `cargo metadata failed for ${manifestPath} (exit ${result.exitCode}).`,
        result.stderr,
      );
    }
    let parsed: CargoMetadata;
    try {
      parsed = JSON.parse(result.stdout) as CargoMetadata;
    } catch (err) {
      throw new DevSwitcherError(
        'CARGO_METADATA_FAILED',
        `cargo metadata returned unparseable JSON for ${manifestPath}.`,
        err,
      );
    }
    this.metadataCache.set(manifestPath, parsed);
    return parsed;
  }

  /**
   * Cached metadata for a manifest without fetching — undefined on a miss. Lets the
   * synchronous Task builders (createBuildTask/createRunTask, which cannot await)
   * read hasDefaultFeature; by the time a build is triggered the cache is warm from
   * project listing / chip population.
   */
  peekMetadata(manifestPath: string): CargoMetadata | undefined {
    return this.metadataCache.get(manifestPath);
  }

  /** Installed target triples from `rustup target list --installed` (아키텍처 칩). */
  async listInstalledTargets(): Promise<string[]> {
    const result = await execCapture('rustup', ['target', 'list', '--installed'], undefined, this.exec);
    if (result.exitCode !== 0) {
      return [];
    }
    return result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * All rustup targets with their installed flag (F19 §13.4) — installed and
   * not-installed together so the Architecture chip can offer `rustup target add`.
   * Returns [] when rustup is absent (E1 handles the toolchain warning separately).
   */
  async listAllTargets(): Promise<TargetInfo[]> {
    const result = await execCapture('rustup', ['target', 'list'], undefined, this.exec);
    if (result.exitCode !== 0) {
      return [];
    }
    return parseTargetList(result.stdout);
  }

  /** Install a target via `rustup target add` (§13.4, tier 1 — no admin rights). */
  async addTarget(triple: string): Promise<{ ok: boolean; stderr: string }> {
    const result = await execCapture('rustup', ['target', 'add', triple], undefined, this.exec);
    return { ok: result.exitCode === 0, stderr: result.stderr };
  }

  /**
   * Whether the cargo/rustup toolchain is available (E1). Never throws — a missing
   * binary yields `undefined` for that tool; `ok` reflects cargo, which is required.
   */
  async checkToolchain(): Promise<ToolchainStatus> {
    const cargo = await this.probeVersion('cargo');
    const rustup = await this.probeVersion('rustup');
    return { cargo, rustup, ok: cargo !== undefined };
  }

  /** Drop cached metadata for one manifest, or all when omitted (F17 무효화). */
  invalidateCache(manifestPath?: string): void {
    if (manifestPath === undefined) {
      this.metadataCache.clear();
    } else {
      this.metadataCache.delete(manifestPath);
    }
  }

  /** `<tool> --version` → trimmed version string, or undefined when absent. */
  private async probeVersion(command: string): Promise<string | undefined> {
    try {
      const result = await execCapture(command, ['--version'], undefined, this.exec);
      if (result.exitCode !== 0) {
        return undefined;
      }
      return result.stdout.trim() || undefined;
    } catch {
      return undefined; // spawn failure = not installed
    }
  }
}
