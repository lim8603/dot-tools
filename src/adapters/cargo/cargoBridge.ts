import type { ChipItem, ChipValue, InvocationConfig, Selection } from '../../core/types';

/**
 * CargoBridge — pure core (TASK-004).
 *
 * Pure, side-effect-free logic for the cargo boundary: argument assembly and
 * JSON parsing (interface_contract §8, 상세설계서 §8.1/§8.3~§8.5). Deliberately
 * free of `vscode` and `child_process` so it can be unit-tested in plain Node.
 * The cargo CLI I/O layer (execCapture, fetchMetadata, caching) is added in
 * TASK-005; the adapter wiring is TASK-006.
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
): string[] {
  const profile = asString(sel.values.profile) ?? 'dev';
  const architecture = asString(sel.values.architecture);
  const features = featuresToArgs(asStringArray(sel.values.features), hasDefaultFeature);
  const targetArgs = architecture ? ['--target', architecture] : [];

  if (action === 'build') {
    return ['build', '-p', projectName, '--profile', profile, ...targetArgs, ...features];
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
    ...(runArgs.length > 0 ? ['--', ...runArgs] : []),
  ];
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

/** Status-bar summary for the features chip. */
export function formatFeatureCount(features: string[]): string {
  const nonDefault = features.filter((f) => f !== 'default');
  if (nonDefault.length === 0) {
    return 'default';
  }
  if (nonDefault.length === 1) {
    return nonDefault[0];
  }
  return `${nonDefault.length} features`;
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
