import { buildDiagnostics } from '../../core/diagnostics';
import type { ChipValue, DiagnosticProbe, DiagnosticStatus } from '../../core/types';
import { defaultChipFormat } from '../statusBarFormat';

/**
 * Pure helpers for the Project-tab cards (B-2). Kept vscode-free (type-only imports) so
 * the reduction logic is unit-testable in plain Node, and adapter-agnostic — it reads
 * DiagnosticProbe / ChipDescriptor fields only, never a language (INV-2).
 */

/**
 * Format a chip value for a card summary: the adapter's own `format` (e.g. cargo's
 * abbreviated target triple / feature count), falling back to defaultChipFormat. Guarded
 * so a formatter that throws on an unexpected value degrades to the default rather than
 * breaking the whole card (buildProjectCards runs over every project).
 */
export function formatChipValue(chip: { format?: (value: ChipValue) => string }, value: ChipValue): string {
  if (chip.format) {
    try {
      return chip.format(value);
    } catch {
      // fall through to the default formatter
    }
  }
  return defaultChipFormat(value);
}

/** A project card's toolchain indicator — the primary Doctor probe reduced to ✅/❌. */
export interface ToolchainStatus {
  /** 'ok' | 'warn' | 'error' | 'info' from the primary check; 'unknown' when no probe ran. */
  status: DiagnosticStatus | 'unknown';
  /** Display label, e.g. 'cargo 1.83.0' or 'cargo not found'. */
  label: string;
}

/**
 * Reduce an adapter's Doctor probes to one toolchain indicator for a card. The primary
 * critical check (the compiler/runtime — cargo, node, dotnet, go, cmake, python) decides
 * ✅/❌, and its version detail becomes the label. With no probes (a stub adapter) the
 * status is 'unknown' and the label is the adapter's display name.
 */
export function deriveToolchain(
  adapter: { id: string; displayName: string },
  probes: DiagnosticProbe[],
): ToolchainStatus {
  if (probes.length === 0) {
    return { status: 'unknown', label: adapter.displayName };
  }
  const items = buildDiagnostics(probes);
  const primaryProbe = probes.find((p) => p.severity === 'critical') ?? probes[0];
  const item = items.find((i) => i.id === primaryProbe.id) ?? items[0];
  return { status: item.status, label: toolchainLabel(item.label, item.detail) };
}

/**
 * Compose the toolchain label from the probe's name + version detail, without doubling the
 * name when the detail already starts with it — cargo's detail is "cargo 1.96.0 …" and go's
 * is "go version go1.26.6 …", so a naive "<label> <detail>" would read "cargo cargo …".
 */
function toolchainLabel(label: string, detail: string | undefined): string {
  if (!detail) {
    return label;
  }
  return detail.toLowerCase().startsWith(label.toLowerCase()) ? detail : `${label} ${detail}`;
}
