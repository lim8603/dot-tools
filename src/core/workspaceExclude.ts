import * as vscode from 'vscode';
import { mergeExcludePatterns, toExcludeGlob } from './scanExclude';

// The workspace scan's exclusion glob, read from settings. Its own module so adapters
// (VS's CMakeCache marker search) can share it without importing the registry, which
// imports every adapter.

/**
 * Build artifacts / VCS / tooling dirs never hold a source manifest we care about
 * (상세설계서 §8.2/§9). `.vscode-test` is the extension-test runner's downloaded VS Code —
 * a huge tree of bundled `package.json` files (built-in extensions, resources/app) that
 * would otherwise flood the Node switcher; it only exists in extension-dev workspaces but
 * is always non-project.
 */
const BUILTIN_EXCLUDE_DIRS = ['target', 'node_modules', '.git', '.vscode-test'];

/**
 * The exclude pattern for one scan pass: the built-in directories plus whatever
 * `devSwitcher.scan.exclude` adds (vendored trees, submodules, anything the user does not
 * want listed at all).
 *
 * `inspect()` rather than `get()` on purpose — exclusions are additive, so every level is
 * unioned. With `get()`, a workspace setting would override and silently discard the
 * user's personal rules (see core/scanExclude.ts).
 *
 * Folder levels are read **per workspace folder**, with the folder's uri as the resource
 * scope. `inspect()` without a resource leaves `workspaceFolderValue` undefined in a
 * multi-root workspace, so until 1.3.1 a folder's `.vscode/settings.json` did nothing at
 * all — VS Code only said so on hover. The setting also has to be declared
 * `scope: "resource"` in package.json, or VS Code refuses the folder level outright.
 *
 * The patterns are still unioned into one workspace-wide glob rather than confined to the
 * folder that declared them: the scan is a single `findFiles` across the workspace, so a
 * folder's exclusion applies everywhere. Stated in the setting description.
 *
 * Computed once per scan, not per glob: the setting cannot change mid-pass, and a scan
 * asks once per adapter manifest glob.
 */
export function excludeGlob(): string {
  const inspected = vscode.workspace
    .getConfiguration('devSwitcher')
    .inspect<string[]>('scan.exclude');
  const folderLevels = (vscode.workspace.workspaceFolders ?? []).map(
    (folder) =>
      vscode.workspace
        .getConfiguration('devSwitcher', folder.uri)
        .inspect<string[]>('scan.exclude')?.workspaceFolderValue,
  );
  const patterns = mergeExcludePatterns(
    inspected?.globalValue,
    inspected?.workspaceValue,
    ...folderLevels,
  );
  return toExcludeGlob(BUILTIN_EXCLUDE_DIRS, patterns);
}
