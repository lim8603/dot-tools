import * as vscode from 'vscode';

/**
 * Core type definitions — the single source of truth for the extension's types.
 *
 * Adapters, UI, and the orchestrator import from here only (coding_convention:
 * "types.ts 단일 지점"). Dependency direction is UI -> Orchestrator -> Adapter;
 * never the reverse (INV-2).
 *
 * Source of truth: interface_contract.md §2~§7 and data_model.md §2.
 */

// ─────────────────────────────────────────────────────────────────────────────
// §2. Chip framework (ADR-003)
// The status bar, QuickPick, and settings page act on descriptors only — they
// never know which language an adapter speaks (BR-003).
// ─────────────────────────────────────────────────────────────────────────────

/** A chip value. multiSelect chips (e.g. Cargo features) carry string[]. */
export type ChipValue = string | string[];

/** One selectable item shown in a chip's QuickPick. */
export interface ChipItem {
  id: string;
  label: string;
  description?: string; // QuickPick right-side description
  detail?: string; // QuickPick bottom detail line
  /** Hidden until the secondary toggle is on (e.g. not-installed targets, §13.4). */
  secondary?: boolean;
}

/**
 * One status-bar chip declared by an adapter. The status bar, QuickPick, and
 * settings page operate purely on this descriptor.
 */
export interface ChipDescriptor {
  id: string; // 'profile' | 'architecture' | 'features' | 'target' | 'environment'
  icon: string; // codicon name
  label: string; // QuickPick placeholder / settings tab name
  multiSelect?: boolean; // when true the value is string[] (features)
  required?: boolean; // when unset, block the action (e.g. target)
  /**
   * When set, the QuickPick hides `secondary` items behind a toggle button whose
   * tooltip is this string (e.g. 'Show installable targets'), so a long tail of
   * not-installed options stays collapsed by default (§13.4). Single-select only.
   */
  secondaryToggle?: string;
  /** Read the available items from the canonical source (e.g. Cargo.toml). */
  listItems(project: ProjectInfo): Promise<ChipItem[]>;
  /** Abbreviated rendering for the status bar. */
  format?(value: ChipValue): string;
  /**
   * Status-bar text when no value is stored, shown value-style instead of the
   * '(Label)' prompt (e.g. 'default' for the optional architecture chip = host
   * target). Leave unset for chips whose blank state should read as "pick me".
   */
  unsetText?: string;
  /**
   * Item id that means "clear this chip" — picking it removes the stored value so the
   * chip returns to its unset (`unsetText`) state. Lets an optional chip offer a way
   * back to default (e.g. the architecture chip's 'Host default' entry).
   */
  clearValueId?: string;
  /**
   * For `statusBar.selectedOnly`: does this (defined) value read as "no active
   * selection"? A stored value can still be the default (e.g. features holding only
   * 'default'), which should hide like an unset chip. Defaults to "empty array".
   */
  isBlank?(value: ChipValue): boolean;
  defaultValue?(project: ProjectInfo): Promise<ChipValue | undefined>;
  /**
   * Optional post-pick hook (F19 §13.4). Runs after the user picks a value, before it
   * is stored; return false to abort the selection. The Architecture chip uses it to
   * `rustup target add` a not-installed target (declined/failed install → not stored).
   */
  onPick?(project: ProjectInfo, value: ChipValue): Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// §3. Project & selection state
// ─────────────────────────────────────────────────────────────────────────────

/** A detected project. */
export interface ProjectInfo {
  /** `${adapterId}:${manifestPath relative to workspace}` — machine-independent (ADR-006). */
  id: string;
  name: string; // display name (package name, etc.)
  adapterId: string;
  manifestPath: string; // absolute manifest path
  workspaceFolder: vscode.WorkspaceFolder; // multi-root aware
}

/**
 * The user's chip selections for a project. Holds chip picks only — the
 * invocation overlay travels separately (see InvocationConfig, OQ-002).
 */
export interface Selection {
  projectId: string;
  values: Record<string, ChipValue>; // chipId -> value (includes the profile chip)
}
// NOTE: runArgs was promoted to InvocationConfig.runArgs and is stored per
// (project × profile) (ADR-011). Selection carries chip picks only.

/** What action buttons an adapter supports. */
export interface ActionCapabilities {
  /** Whether a "build" concept exists. false hides the build button (Python). */
  build: boolean;
  /**
   * Whether `run` must build first. True when the adapter's run task executes a pre-built
   * artifact rather than a self-building command — CMake (`cmake --build` then run the exe).
   * Omitted (false) for single-command runs (cargo run / dotnet run / python script).
   */
  runRequiresBuild?: boolean;
  // run/debug are common to every language and need no declaration.
}

/** Result of running a task, surfaced by the TaskRunner (ADR-002). */
export interface TaskResult {
  exitCode: number | undefined;
  succeeded: boolean; // exitCode === 0
}

// ─────────────────────────────────────────────────────────────────────────────
// §5. Project creation (F20 / ADR-010)
// File creation is delegated to the native tool; the extension only orchestrates.
// ─────────────────────────────────────────────────────────────────────────────

/** Where and what to create for the start wizard (F20). */
export interface NewProjectTarget {
  folderUri: vscode.Uri; // target folder (empty workspace folder or user-chosen)
  projectName: string;
}

/** Task type used by native create tasks (cargo/dotnet, F20) — registered in
 *  package.json contributes.taskDefinitions so it raises no "unknown task type" warning. */
export const NEW_PROJECT_TASK_TYPE = 'devswitcher-newproject';

/** One template file written for scaffold-by-files creation (path relative to the
 *  new project folder `<folder>/<name>/`). */
export interface ProjectFile {
  relativePath: string;
  content: string;
}

/**
 * How an adapter scaffolds a new project (F20). Native tools return a `task` the
 * TaskRunner executes (cargo new / dotnet new); languages with no native scaffolder
 * return `files` the Orchestrator writes via workspace.fs (cmake / python, D-13 —
 * a documented exception to ADR-010 since no native tool exists for them).
 */
export type ProjectCreation =
  | { kind: 'task'; task: vscode.Task }
  | { kind: 'files'; files: ProjectFile[] };

// ─────────────────────────────────────────────────────────────────────────────
// §7. Invocation config overlay (ADR-011)
// Layer ③ config is stored per (projectId × profile) and injected at invocation
// time via language-specific mechanisms — the canonical file is never edited (v1).
// ─────────────────────────────────────────────────────────────────────────────

export type OptionValue = string | number | boolean | string[];

/**
 * The invocation overlay applied to one (project × profile). Never written to
 * the canonical file; folded into build/run tasks at invocation time.
 */
export interface InvocationConfig {
  compiler?: Record<string, OptionValue>; // catalog option id -> value (e.g. opt-level)
  linker?: Record<string, OptionValue>;
  outputDir?: string; // output location (e.g. CARGO_TARGET_DIR)
  env?: Record<string, string>; // environment variables (e.g. PYTHONPATH)
  runArgs?: string[]; // program run args (F16, promoted here)
  preBuild?: string[]; // commands to run before build/run (ShellExecution)
  postBuild?: string[]; // commands to run after build/run
}

/**
 * One catalog entry the settings page renders (ADR-012). An adapter declares
 * these; the UI knows only this shape (language-agnostic).
 */
export interface OptionSpec {
  id: string; // e.g. 'opt-level'
  category: string; // known: 'compiler' | 'linker' | 'output' | 'env' | 'buildEvent' | 'runArgs'
  label: string;
  description: string; // teaching text for developers unfamiliar with the option
  /** The bare value to enter in the field (e.g. 'lld') — shown as the input placeholder. */
  example: string;
  /**
   * Optional teaching hint showing how that value is injected, with `<value>` as a
   * placeholder (e.g. 'RUSTFLAGS=-C linker=<value>'). Kept separate from `example`
   * so users enter the bare value and never paste the injected form (which would
   * double the prefix). Shown in the muted help line, not the field.
   */
  injectsAs?: string;
  /** Optional link to the official docs for this option, shown in the help line. */
  docUrl?: string;
  type: 'enum' | 'bool' | 'int' | 'string' | 'stringList';
  allowedValues?: string[]; // dropdown values when type is 'enum'
  defaultValue?: OptionValue;
  injection: 'config' | 'env' | 'flag' | 'preTask' | 'postTask'; // how it is injected
}

// ─────────────────────────────────────────────────────────────────────────────
// §13. Diagnostics (F19 / DD-09) — Doctor's adapter-agnostic check model
// Adapters emit raw DiagnosticProbe[] (they own the vscode/exec calls); the pure
// core (core/diagnostics.ts) derives status + ordering into DiagnosticItem[], so
// Doctor itself stays adapter-agnostic (상세설계서 §13.5). The 3 automation tiers
// map to §13.2: 1 full-auto (install ext / rustup target), 2 semi (run OS install
// command), 3 guide-only (WSL/Docker).
// ─────────────────────────────────────────────────────────────────────────────

export type DiagnosticStatus = 'ok' | 'warn' | 'error' | 'info'; // ✅ / ⚠️ / ❌ / ℹ️
export type DiagnosticTier = 1 | 2 | 3;

/** How important a check is — drives status when the check is not satisfied. */
export type DiagnosticSeverity = 'critical' | 'optional' | 'info';

/** A resolution action the Doctor UI (TASK-017) can carry out. Adapter-agnostic. */
export type DiagnosticResolution =
  | { kind: 'installExtension'; extensionId: string } // tier 1
  | { kind: 'installTarget'; triple: string } // tier 1 (rustup target add, TASK-018)
  | { kind: 'runCommand'; command: string; args: string[] } // tier 2
  | { kind: 'openUrl'; url: string }; // tier 2/3 guide

/** A raw check emitted by an adapter (pure data — no vscode). */
export interface DiagnosticProbe {
  id: string; // stable id, e.g. 'cargo' | 'vadimcn.vscode-lldb'
  label: string; // display name, e.g. 'cargo', 'CodeLLDB'
  severity: DiagnosticSeverity;
  present: boolean; // installed / available?
  detail?: string; // version string or note
  tier: DiagnosticTier;
  resolution?: DiagnosticResolution; // how to fix when not present
}

/** A classified check the Doctor UI renders (status derived from the probe). */
export interface DiagnosticItem {
  id: string;
  label: string;
  status: DiagnosticStatus;
  detail?: string;
  tier: DiagnosticTier;
  resolution?: DiagnosticResolution; // dropped when status is 'ok' (nothing to fix)
}

// ─────────────────────────────────────────────────────────────────────────────
// §4 + §5 + §7. LanguageAdapter — the core contract
// All per-language differences hide behind this interface (ADR-003). Adding or
// changing an adapter never touches UI/orchestrator code.
// ─────────────────────────────────────────────────────────────────────────────

export interface LanguageAdapter {
  readonly id: string; // 'cargo' | 'cmake' | 'dotnet' | 'python'
  readonly displayName: string; // e.g. 'Rust (Cargo)'
  readonly actions: ActionCapabilities;
  readonly chips: ChipDescriptor[]; // status-bar chips; order = display order (ADR-003)
  readonly manifestGlobs: string[]; // detect/watch globs, e.g. ['**/Cargo.toml'] (F1·F17)
  readonly requiredExtensions: string[]; // required extension IDs (F14)

  /** F20 — whether this adapter can create a new project. v1: all four are true. */
  readonly canCreateProject: boolean;

  /** ADR-012 — option catalog this adapter contributes to the settings page. */
  readonly optionCatalog: OptionSpec[];

  /**
   * ADR-012 — settings-page categories this adapter supports (variable). Python
   * has no compiler/linker/output (the settings-page litmus, INV-2).
   */
  readonly configCategories: string[];

  /** Build ProjectInfo from glob matches (ADR-006). */
  listProjects(manifests: vscode.Uri[]): Promise<ProjectInfo[]>;

  // `config` is the active (project × profile) invocation overlay (§7). Passed
  // as an explicit argument (OQ-002, resolved 2026-08-15); the orchestrator
  // resolves it from PersistedState and hands it in.
  createBuildTask(project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task; // not called when actions.build === false (ADR-002)
  createRunTask(project: ProjectInfo, sel: Selection, config: InvocationConfig): vscode.Task; // injects config.runArgs (F16)
  createDebugConfig(project: ProjectInfo, sel: Selection, config: InvocationConfig): Promise<vscode.DebugConfiguration>;
  resolveExecutable(project: ProjectInfo, sel: Selection, config: InvocationConfig): Promise<string>; // resolve path before debug (ADR-005)

  /**
   * Optional async pre-step run before the (synchronous) build/run task and before the
   * debug build. Lets a two-stage toolchain do work the single-command build model can't
   * express — CMake configures here (`cmake -S -B -D…`, ADR-014) so the overlay -D flags
   * are injected before `cmake --build`. Adapters whose build is a single command
   * (cargo/dotnet/python) omit it. Throws (DevSwitcherError) on failure → the orchestrator
   * aborts the invocation. (interface_contract §4)
   */
  prepareInvocation?(project: ProjectInfo, sel: Selection, config: InvocationConfig): Promise<void>;

  /**
   * F20 — scaffold a default-template project. Native tools return a `task`
   * (cargo new / dotnet new console) the TaskRunner runs; languages without a
   * scaffolder return `files` the Orchestrator writes (cmake / python, D-13).
   * Either way ManifestWatcher (F17) picks up the new manifest.
   */
  createProject(target: NewProjectTarget): ProjectCreation;

  // Note: no canonical-file edit method. The extension never edits the user's build
  // files — that is a permanent invariant (ADR-013 / D-15, C-3 dropped). Persisting or
  // sharing settings goes through profile export/import (F12), and invocation overlays
  // are injected at call time (ADR-011), never written back to Cargo.toml et al.

  /** Invalidate cache on manifest change (F17). */
  invalidateCache(project?: ProjectInfo): void;

  /**
   * F19 — the diagnostic checks Doctor runs for this adapter (§13.5). The adapter
   * owns the vscode/exec probing (toolchain versions, extension presence); the pure
   * core classifies and orders the result. Stub adapters return [].
   */
  collectDiagnostics(): Promise<DiagnosticProbe[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Persisted state — workspaceState (Memento), no DB (data_model §2 / ADR-001)
// ─────────────────────────────────────────────────────────────────────────────

/** workspaceState key for the persisted selection + invocation overlay. */
export const PERSISTED_STATE_KEY = 'devSwitcher.state.v1';

/**
 * Persisted per-workspace state. Stores selections and invocation overlays only
 * — never the values themselves, which live in canonical files (ADR-007).
 */
export interface PersistedState {
  activeProjectId?: string;
  /** projectId -> (chipId -> value); includes the profile chip. */
  selections: Record<string, Record<string, ChipValue>>;
  /**
   * Layer ③ invocation overlay, keyed per (project × profile) (ADR-011).
   * projectId -> profileName -> overlay. profileName comes from
   * selections[projectId]['profile'].
   */
  invocation: Record<string, Record<string, InvocationConfig>>;
}

/** Schema version stamped into every exported profile file (F12). */
export const PROFILE_EXPORT_VERSION = 1;

/**
 * The `devswitcher.profile.json` export/import payload (F12, 상세설계서 §6.3).
 *
 * Deliberately mirrors PersistedState's two maps so a round-trip needs no shape
 * translation (C-4, resolved 2026-08-15). runArgs rides in its promoted home,
 * invocation[projectId][profile].runArgs (ADR-011) — not at the selection level
 * as the pre-ADR-011 design example showed. `activeProjectId` is intentionally
 * excluded: it is machine/session-specific and never shared across clones.
 */
export interface ProfileExport {
  version: number;
  exportedAt: string; // ISO 8601 timestamp
  /** projectId -> (chipId -> value); machine-independent projectIds (ADR-006). */
  selections: Record<string, Record<string, ChipValue>>;
  /** projectId -> profileName -> invocation overlay (ADR-011). */
  invocation: Record<string, Record<string, InvocationConfig>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors — defined in ./errors (vscode-free) and re-exported here so existing
// `import { DevSwitcherError } from '../core/types'` sites keep working. Boundary
// layers (cargoBridge) import from ./errors directly to stay unit-testable in
// plain Node — importing this file would pull in `vscode` at runtime.
// ─────────────────────────────────────────────────────────────────────────────

export { DevSwitcherError } from './errors';
