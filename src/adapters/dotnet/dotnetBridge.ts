import { execFile } from 'node:child_process';
import { dirname } from 'node:path';
import { DevSwitcherError } from '../../core/errors';
import type { ChipItem, ChipValue, InvocationConfig, OptionValue, Selection } from '../../core/types';

/**
 * DotnetBridge — the `dotnet` CLI boundary layer for the C# adapter (MS-010, C-7).
 *
 * Mirrors CargoBridge (interface_contract §6): pure parsing/formatting helpers plus a
 * process-I/O class with a cached metadata read. Stays `vscode`-free — methods take a
 * plain `.csproj` path (not ProjectInfo) and DevSwitcherError comes from `core/errors`
 * — so the whole file unit-tests in plain Node without a real .NET SDK. The child_process
 * call is injected (DotnetExec) for hermetic tests.
 *
 * Project metadata comes from `dotnet msbuild <proj> -getProperty:<name>` — the MSBuild
 * evaluation API (SDK 8.0.100+) that prints property values without a full build; the
 * dotnet analogue of `cargo metadata`. Multiple `-getProperty` flags print a JSON
 * `{ "Properties": { name: value } }`; a single flag prints the bare value.
 *
 * v1 scope (MS-010): one `.csproj` = one switcher entry (`.sln` is out of scope);
 * multi-target projects (`<TargetFrameworks>`) expose each TFM on the Target chip.
 */

/** `dotnet msbuild -getProperty` JSON shape (subset) when multiple properties are asked. */
interface GetPropertyResult {
  Properties?: Record<string, string>;
}

/** A detected .NET project, before the adapter attaches workspace context. */
export interface DotnetProject {
  name: string;
  manifestPath: string;
}

/** Config-independent project metadata, read once per manifest and cached. */
export interface DotnetMetadata {
  assemblyName: string;
  targetFrameworks: string[]; // one entry for single-TFM; many for <TargetFrameworks>
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (parsing / formatting) — unit-testable without a real dotnet SDK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse `dotnet msbuild -getProperty:A -getProperty:B` output. With multiple flags the
 * CLI prints `{ "Properties": { name: value } }`; missing/blank output or a bare
 * single value (non-JSON) yields `{}` so the caller falls back to defaults.
 */
export function parseGetProperty(stdout: string): Record<string, string> {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return {};
  }
  try {
    const parsed = JSON.parse(trimmed) as GetPropertyResult;
    return parsed.Properties ?? {};
  } catch {
    return {}; // non-JSON (single bare value, or MSBuild noise) — caller falls back
  }
}

/**
 * The TFM list for a project: `<TargetFrameworks>` (semicolon-separated, plural) when
 * present, else the single `<TargetFramework>`. Blank entries are dropped.
 */
export function splitTargetFrameworks(
  single: string | undefined,
  plural: string | undefined,
): string[] {
  const many = (plural ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (many.length > 0) {
    return many;
  }
  const one = (single ?? '').trim();
  return one ? [one] : [];
}

/** Project display name: `AssemblyName` when set, else the `.csproj` filename stem. */
export function dotnetProjectName(csprojPath: string, assemblyName?: string): string {
  const name = (assemblyName ?? '').trim();
  if (name) {
    return name;
  }
  const base = csprojPath.replace(/\\/g, '/').split('/').pop() ?? csprojPath;
  return base.replace(/\.csproj$/i, '');
}

/** Configuration chip items — the built-in Debug/Release (custom configs are rare; v1 fixed). */
export function buildConfigurationList(): ChipItem[] {
  return [
    { id: 'Debug', label: 'Debug', description: 'Debug' },
    { id: 'Release', label: 'Release', description: 'Release' },
  ];
}

/** Target-framework chip items (multi-TFM → one item per framework; confirmed MS-010 scope). */
export function targetFrameworkItems(frameworks: string[]): ChipItem[] {
  return frameworks.map((tfm) => ({ id: tfm, label: tfm }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Argument assembly + overlay injection (interface_contract §8: dotnet injects every
// overlay option as an MSBuild `-p:` property). Pure and testable.
// ─────────────────────────────────────────────────────────────────────────────

function asString(v: ChipValue | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** Render an option value as an MSBuild property value (for `-p:Key=Value`). */
export function msbuildValue(value: OptionValue): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (Array.isArray(value)) {
    return value.join(';'); // MSBuild item lists are semicolon-separated
  }
  return String(value);
}

/**
 * Compiler/linker overlay options → `-p:Prop=Value` args. dotnet injects every catalog
 * option as an MSBuild property (§8), so the catalog id IS the property name
 * (e.g. Optimize, AssemblyName, PublishTrimmed).
 */
export function buildMsbuildProps(
  compiler: Record<string, OptionValue>,
  linker: Record<string, OptionValue>,
): string[] {
  const args: string[] = [];
  for (const record of [compiler, linker]) {
    for (const [prop, value] of Object.entries(record)) {
      args.push(`-p:${prop}=${msbuildValue(value)}`);
    }
  }
  return args;
}

/**
 * Assemble `dotnet` CLI args for a build or run. Configuration comes from the profile
 * chip (default Debug), TargetFramework from the target chip (`-f`; present for
 * single-TFM projects via defaultValue), RID from the architecture chip (`-r`, optional).
 * `props` are the `-p:` overlay properties; runArgs follow `--` for run (F16).
 */
export function assembleDotnetArgs(
  action: 'build' | 'run',
  projectPath: string,
  sel: Selection,
  config: InvocationConfig,
  props: string[] = [],
): string[] {
  const configuration = asString(sel.values.profile) ?? 'Debug';
  const framework = asString(sel.values.target);
  const rid = asString(sel.values.architecture);
  const common = [
    '-c',
    configuration,
    ...(framework ? ['-f', framework] : []),
    ...(rid ? ['-r', rid] : []),
    ...props,
  ];
  if (action === 'build') {
    return ['build', projectPath, ...common];
  }
  const runArgs = config.runArgs ?? [];
  return [
    'run',
    '--project',
    projectPath,
    ...common,
    ...(runArgs.length > 0 ? ['--', ...runArgs] : []),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// dotnet CLI I/O boundary — the only part that touches the process boundary.
// vscode-free (plain cwd/manifestPath) and exec-injected (DotnetExec) so tests run
// hermetically without a real .NET SDK. Mirrors CargoBridge's I/O half (TASK-005).
// ─────────────────────────────────────────────────────────────────────────────

/** msbuild output can be large on big projects; lift the buffer cap. */
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

/** Captured result of one CLI invocation. */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number; // 0 on success
}

/**
 * Injectable process-exec primitive. Resolves with the captured result for any normal
 * exit (including non-zero) and rejects only when the process cannot be spawned at all
 * (missing binary → ENOENT, signal, buffer overflow).
 */
export type DotnetExec = (
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string> },
) => Promise<ExecResult>;

/** Default DotnetExec: `child_process.execFile` with no shell (NFR-002, array args). */
export const defaultExec: DotnetExec = (command, args, options) =>
  new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        env: options.env ? { ...process.env, ...options.env } : undefined,
        encoding: 'utf8',
        maxBuffer: MAX_OUTPUT_BYTES,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        const code: unknown = error ? (error as { code?: unknown }).code : 0;
        if (error && typeof code !== 'number') {
          reject(new DevSwitcherError('DOTNET_EXEC_FAILED', `Failed to run "${command}".`, error));
          return;
        }
        resolve({ stdout, stderr, exitCode: typeof code === 'number' ? code : 0 });
      },
    );
  });

/** Capture the output of a single dotnet invocation; the caller interprets the exit code. */
export function execCapture(
  command: string,
  args: string[],
  cwd: string | undefined,
  exec: DotnetExec = defaultExec,
  env?: Record<string, string>,
): Promise<ExecResult> {
  return exec(command, args, { cwd, env });
}

/** Result of checkToolchain — version string when present; ok when the SDK exists (E1). */
export interface DotnetToolchainStatus {
  dotnet?: string;
  ok: boolean;
}

/**
 * Stateful dotnet boundary: owns the metadata cache and the injected exec primitive.
 * The adapter holds one instance and translates ProjectInfo into the manifestPath
 * strings these methods take. Cache is config-independent (AssemblyName / TFMs) and
 * invalidated only by ManifestWatcher (F17) / explicit refresh, like CargoBridge.
 */
export class DotnetBridge {
  private readonly exec: DotnetExec;
  private readonly metadataCache = new Map<string, DotnetMetadata>();

  constructor(exec: DotnetExec = defaultExec) {
    this.exec = exec;
  }

  /**
   * Config-independent metadata for a `.csproj`, cached. Runs
   * `dotnet msbuild -getProperty:AssemblyName,TargetFramework,TargetFrameworks` and
   * parses the JSON; a non-zero exit raises DOTNET_METADATA_FAILED (the adapter keeps
   * its last good cache and surfaces stderr).
   */
  async fetchMetadata(manifestPath: string): Promise<DotnetMetadata> {
    const cached = this.metadataCache.get(manifestPath);
    if (cached) {
      return cached;
    }
    const args = [
      'msbuild',
      manifestPath,
      '-getProperty:AssemblyName',
      '-getProperty:TargetFramework',
      '-getProperty:TargetFrameworks',
    ];
    const result = await execCapture('dotnet', args, dirname(manifestPath), this.exec);
    if (result.exitCode !== 0) {
      throw new DevSwitcherError(
        'DOTNET_METADATA_FAILED',
        `dotnet msbuild -getProperty failed for ${manifestPath} (exit ${result.exitCode}).`,
        result.stderr,
      );
    }
    const props = parseGetProperty(result.stdout);
    const metadata: DotnetMetadata = {
      assemblyName: dotnetProjectName(manifestPath, props['AssemblyName']),
      targetFrameworks: splitTargetFrameworks(props['TargetFramework'], props['TargetFrameworks']),
    };
    this.metadataCache.set(manifestPath, metadata);
    return metadata;
  }

  /** Cached metadata without fetching — undefined on a miss (for synchronous callers). */
  peekMetadata(manifestPath: string): DotnetMetadata | undefined {
    return this.metadataCache.get(manifestPath);
  }

  /**
   * Resolve the built assembly path (TargetPath) for a (project × configuration × TFM)
   * via `dotnet msbuild -getProperty:TargetPath` — no path guessing (the dotnet analogue
   * of DD-05). Includes the same `-p:` overlay props so an AssemblyName override resolves
   * to the right DLL. A single -getProperty prints the bare value. Undefined on failure (E6).
   */
  async resolveTargetPath(
    manifestPath: string,
    configuration: string,
    framework: string | undefined,
    props: string[] = [],
  ): Promise<string | undefined> {
    const args = ['msbuild', manifestPath, '-getProperty:TargetPath', `-p:Configuration=${configuration}`];
    if (framework) {
      args.push(`-p:TargetFramework=${framework}`);
    }
    args.push(...props);
    const result = await execCapture('dotnet', args, dirname(manifestPath), this.exec);
    if (result.exitCode !== 0) {
      return undefined;
    }
    const value = result.stdout.trim();
    return value.length > 0 ? value : undefined;
  }

  /**
   * Whether the .NET SDK is available (E1). Never throws — a missing binary yields
   * `undefined`; `ok` reflects `dotnet`, which is required.
   */
  async checkToolchain(): Promise<DotnetToolchainStatus> {
    const dotnet = await this.probeVersion('dotnet');
    return { dotnet, ok: dotnet !== undefined };
  }

  /** Drop cached metadata for one manifest, or all when omitted (F17 invalidation). */
  invalidateCache(manifestPath?: string): void {
    if (manifestPath === undefined) {
      this.metadataCache.clear();
    } else {
      this.metadataCache.delete(manifestPath);
    }
  }

  /** `dotnet --version` → trimmed version string, or undefined when absent. */
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
