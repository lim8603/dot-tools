import * as vscode from 'vscode';

/**
 * The path part of a project id (R-3, ADR-025): workspace-relative with `/` separators,
 * prefixed with the folder name only while the workspace has more than one folder —
 * VS Code's own `asRelativePath` default. Without the prefix, two folders that each hold
 * a root `Cargo.toml` / `package.json` / `CMakeLists.txt` produced the same id.
 */
export function projectRelPath(uri: vscode.Uri): string {
  return vscode.workspace.asRelativePath(uri).replace(/\\/g, '/');
}

/** A projectRelPath back to a path inside `folder` — drops the multi-root folder prefix. */
export function folderRelative(rel: string, folder: vscode.WorkspaceFolder): string {
  const multiRoot = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
  const prefix = `${folder.name}/`;
  return multiRoot && rel.startsWith(prefix) ? rel.slice(prefix.length) : rel;
}
