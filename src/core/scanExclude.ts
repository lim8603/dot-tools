/**
 * Workspace-scan exclusions (`devSwitcher.scan.exclude`) — pure glob assembly.
 *
 * The scan looks for manifests everywhere in the workspace, which is the right default
 * until part of the tree is something the user does not want listed at all: vendored
 * dependencies, git submodules, a `third_party/` checkout. Those are not build artifacts,
 * so the built-in exclusions never covered them, and the switcher filled with projects
 * nobody wanted to switch to.
 *
 * Design notes (session #018, kept when the first implementation was rolled back):
 *
 * - **Not a gitignore parser.** Entries are folder paths or globs, and matching is done by
 *   VS Code's own glob engine via `findFiles`. `!` re-inclusion is deliberately *not*
 *   supported: it drags in order dependence, precedence and nested inheritance, and none
 *   of that was actually wanted. A `!` entry is dropped rather than half-honoured.
 * - **User and Workspace settings are unioned, not overridden.** Exclusions are additive
 *   by nature — a workspace that excludes `vendor` must not silently discard a personal
 *   "never scan my scratch folder" rule. `getConfiguration().get()` has override
 *   semantics, so the caller must read `inspect()` and pass the levels in separately.
 * - The combined pattern is a **top-level** brace list — whole patterns as alternatives,
 *   as in `{ dir-a-pattern, dir-b-pattern }` — rather than a brace nested inside a single
 *   path, which is all the built-in exclusion ever needed. Only the top-level form was
 *   verified against a real VS Code host, so that is the one this builds.
 *
 * vscode-free so it can be unit tested (coding_convention §pure/IO split).
 */

/**
 * Normalise one user entry to a glob that matches the folder anywhere in the workspace
 * and everything under it. Returns undefined for entries that carry no meaning.
 *
 * `vendor`, `vendor/` and a hand-written glob for the same folder all mean the same
 * thing, because "exclude this folder" is what people actually write. An entry that
 * already contains a wildcard is trusted as written.
 */
export function normalizeExcludeEntry(entry: string): string | undefined {
  const trimmed = entry.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.startsWith('!')) {
    return undefined; // re-inclusion is not supported — see the module comment
  }
  if (trimmed.includes('*')) {
    return trimmed; // already a glob — the user knows what they are asking for
  }
  const path = trimmed.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+|\/+$/g, '');
  if (path.length === 0) {
    return undefined; // '/' or './' — excluding the whole workspace is not a request we honour
  }
  return `**/${path}/**`;
}

/**
 * Union the configured exclusions across setting levels, in the order VS Code lists them
 * (User → Workspace → Workspace Folder), de-duplicated and normalised.
 *
 * A union rather than an override: see the module comment.
 */
export function mergeExcludePatterns(
  ...levels: (readonly string[] | undefined)[]
): string[] {
  const seen = new Set<string>();
  for (const level of levels) {
    if (!Array.isArray(level)) {
      continue; // absent, or a malformed setting — ignore that level rather than failing
    }
    for (const entry of level) {
      if (typeof entry !== 'string') {
        continue;
      }
      const glob = normalizeExcludeEntry(entry);
      if (glob) {
        seen.add(glob);
      }
    }
  }
  return [...seen];
}

/**
 * Combine the built-in excluded directories with the user's patterns into one
 * `findFiles` exclude pattern.
 *
 * Two shapes, deliberately:
 *
 * - Nothing configured → the single built-in pattern, byte-identical to what shipped
 *   before this setting existed. The overwhelmingly common case stays on the proven path.
 * - Something configured → a **flat, top-level** list of alternatives. The builtin is
 *   expanded into one pattern per directory rather than nested inside another brace
 *   expression: top-level braces are the form verified against a real VS Code host,
 *   nested braces were not, and there is no reason to bet the whole scan on the
 *   untested one.
 */
export function toExcludeGlob(builtinDirs: readonly string[], patterns: readonly string[]): string {
  if (patterns.length === 0) {
    return `**/{${builtinDirs.join(',')}}/**`;
  }
  return `{${[...builtinDirs.map((dir) => `**/${dir}/**`), ...patterns].join(',')}}`;
}
