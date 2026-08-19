/**
 * Language enable filter (B-3 / MS-022) — pure, vscode-free.
 *
 * `devSwitcher.languages.enabled` narrows which adapters scan and show projects.
 * This is a noise/preference control, not a performance one (an unused language
 * only costs an empty findFiles): mono-language teams can hide the other chips'
 * languages entirely. The filter is deliberately **fail-open**: a missing, invalid,
 * or empty setting (or one naming only unknown adapters) enables everything —
 * a bad settings value must never brick the whole switcher.
 */

/** The adapter ids enabled by the setting value; all of `allIds` when the value
 *  is absent/invalid/empty after dropping unknown ids (fail-open). */
export function enabledAdapterIds(setting: unknown, allIds: string[]): Set<string> {
  if (!Array.isArray(setting)) {
    return new Set(allIds);
  }
  const valid = setting.filter((v): v is string => typeof v === 'string' && allIds.includes(v));
  return valid.length === 0 ? new Set(allIds) : new Set(valid);
}
