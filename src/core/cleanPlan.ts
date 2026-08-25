/**
 * Build-tree deletion safety (B-4) — pure classification, no I/O.
 *
 * "Delete build tree" is the only destructive thing DevSwitcher does. Everything else it
 * runs is a build tool doing its own job; this removes directories directly, recursively,
 * on paths an adapter computed. An adapter bug, an overlay pointing `build-dir` somewhere
 * unexpected, or an in-source CMake configuration is enough to aim it at a source tree —
 * so the decision of what may be deleted lives here, in code that can be tested
 * exhaustively, rather than inline next to the `fs.delete` call.
 *
 * The rule is deliberately narrow: a directory must sit strictly *inside* the workspace
 * folder and must not be the project's own source directory. Anything else is refused
 * with a reason the caller can show, because silently skipping a path the user was told
 * would be deleted is worse than saying no.
 *
 * vscode-free so it can be unit tested (coding_convention §pure/IO split).
 */

/** One candidate directory: an absolute path plus what the adapter says it is. */
export interface CandidateDir {
  path: string;
  description: string;
}

/** A directory that will not be deleted, and the reason to show for it. */
export interface RefusedDeletion {
  dir: string;
  reason: string;
}

export interface DeletionPlan {
  /** Directories that passed every guard, de-duplicated, in the order given. */
  deletable: CandidateDir[];
  /** Directories the guards rejected, with a user-facing reason each. */
  refused: RefusedDeletion[];
}

export interface DeletionGuard {
  /** Absolute path of the workspace folder the project belongs to. */
  workspaceRoot: string;
  /** Absolute path of the project's source directory (never deletable). */
  sourceDir: string;
}

/** Normalise for comparison: forward slashes, no trailing separator, case-folded. */
function canonical(path: string): string {
  const slashed = path.replace(/\\/g, '/').replace(/\/+$/, '');
  // Windows paths are case-insensitive, and a mixed-case match here would be a hole in
  // the "not the source directory" guard. POSIX users lose nothing: a real pair of paths
  // differing only in case is not something an adapter produces for a build tree.
  return slashed.toLowerCase();
}

/** Whether `child` is strictly inside `parent` (equal paths are not "inside"). */
function isInside(child: string, parent: string): boolean {
  const c = canonical(child);
  const p = canonical(parent);
  return c.length > p.length && c.startsWith(`${p}/`);
}

/** Whether the path is absolute in either the POSIX or the Windows sense. */
function isAbsolute(path: string): boolean {
  return path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path);
}

/**
 * Decide which of an adapter's candidate build directories may actually be deleted.
 *
 * Order is preserved and duplicates are collapsed, so a caller can show `deletable`
 * verbatim in the confirmation prompt and then delete exactly that list.
 */
export function classifyDeletions(
  dirs: readonly CandidateDir[],
  guard: DeletionGuard,
): DeletionPlan {
  const deletable: CandidateDir[] = [];
  const refused: RefusedDeletion[] = [];
  const seen = new Set<string>();

  for (const candidate of dirs) {
    const trimmed = candidate.path.trim();
    if (trimmed.length === 0) {
      continue; // an adapter returning a blank entry means "nothing here", not an error
    }
    const key = canonical(trimmed);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    if (!isAbsolute(trimmed)) {
      refused.push({ dir: trimmed, reason: 'not an absolute path' });
      continue;
    }
    if (canonical(trimmed) === canonical(guard.workspaceRoot)) {
      refused.push({ dir: trimmed, reason: 'this is the workspace folder itself' });
      continue;
    }
    if (!isInside(trimmed, guard.workspaceRoot)) {
      refused.push({ dir: trimmed, reason: 'outside the workspace folder' });
      continue;
    }
    if (canonical(trimmed) === canonical(guard.sourceDir)) {
      refused.push({ dir: trimmed, reason: 'this is the project source directory' });
      continue;
    }
    deletable.push({ path: trimmed, description: candidate.description });
  }

  return { deletable, refused };
}

/**
 * A path as the prompt should show it: relative to the workspace folder when it is inside
 * one, which every deletable path is by the time it gets here.
 *
 * Absolute paths get elided in the middle by the modal ("d:\\GitHub\\...\\target"), and an
 * elided path defeats the entire point of listing them — you cannot tell a workspace's
 * target directory from a package's. Relative paths are short enough to survive intact and
 * read better besides.
 */
export function displayPath(path: string, workspaceRoot: string): string {
  const p = path.replace(/\\/g, '/').replace(/\/+$/, '');
  const root = workspaceRoot.replace(/\\/g, '/').replace(/\/+$/, '');
  if (p.toLowerCase().startsWith(`${root.toLowerCase()}/`)) {
    return p.slice(root.length + 1);
  }
  return path; // outside the workspace — the guards refuse these, but never shorten one
}

/**
 * The confirmation prompt. Every path is listed and unabbreviated — this is the user's
 * last chance to notice that a directory they care about is on the list, and a summary
 * like "3 directories" would defeat that.
 */
export function describeDeletionPrompt(
  projectName: string,
  deletable: readonly CandidateDir[],
  workspaceRoot: string,
): string {
  const heading =
    deletable.length === 1
      ? `Delete this build directory for ${projectName}?`
      : `Delete these ${deletable.length} build directories for ${projectName}?`;
  // Path first, then what it is. A bare path does not tell you that a sub-project's CMake
  // tree belongs to its root and takes its siblings with it.
  const lines = deletable.map((d) => `${displayPath(d.path, workspaceRoot)}\n    ${d.description}`);
  return `${heading}\n\n${lines.join('\n\n')}`;
}

/** One-line summary of what was refused, for a follow-up warning. Empty when nothing was. */
export function describeRefusals(refused: readonly RefusedDeletion[]): string {
  if (refused.length === 0) {
    return '';
  }
  return refused.map((r) => `${r.dir} (${r.reason})`).join('; ');
}
