import type { ChipValue } from '../core/types';

/**
 * Fallback status-bar text for a chip value when the adapter declares no `format`
 * (상세설계서 §5.1). Kept vscode-free so it is unit-testable; adapter-specific
 * abbreviations (e.g. cargo's target triple / feature count) live in the adapter.
 * A multiSelect renders as: empty → `default`, 1–2 → names, 3+ → count.
 */
export function defaultChipFormat(value: ChipValue): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'default';
    }
    if (value.length <= 2) {
      return value.join(',');
    }
    return `${value.length} features`;
  }
  return value;
}
