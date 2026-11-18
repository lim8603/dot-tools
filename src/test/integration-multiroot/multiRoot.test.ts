import { strict as assert } from 'node:assert';
import * as vscode from 'vscode';
import { nodeAdapter } from '../../adapters/node/nodeAdapter';
import { folderRelative, projectRelPath } from '../../core/projectPath';
import { excludeGlob } from '../../core/workspaceExclude';

/**
 * Multi-root host (fixtures/multiroot: folders `alpha` and `beta`, each with a root
 * package.json). Covers what the single-root suite cannot: project-id identity across
 * folders (R-3, ADR-025) and a folder-level `devSwitcher.scan.exclude` (v1.3.1, D-27).
 */
describe('multi-root workspace', () => {
  let alpha: vscode.WorkspaceFolder;
  let beta: vscode.WorkspaceFolder;

  before(() => {
    const folders = vscode.workspace.workspaceFolders ?? [];
    assert.equal(folders.length, 2, 'the multi-root fixture opens two folders');
    [alpha, beta] = folders;
  });

  it('gives each folder’s root manifest its own project id (ADR-025)', async () => {
    const projects = await nodeAdapter.listProjects([
      vscode.Uri.joinPath(alpha.uri, 'package.json'),
      vscode.Uri.joinPath(beta.uri, 'package.json'),
    ]);
    assert.deepEqual(projects.map((p) => p.id), ['node:alpha/package.json', 'node:beta/package.json']);
    assert.deepEqual(projects.map((p) => p.workspaceFolder.name), ['alpha', 'beta']);
  });

  it('maps a prefixed id path back inside its folder', () => {
    const rel = projectRelPath(vscode.Uri.joinPath(beta.uri, 'sub', 'CMakeLists.txt'));
    assert.equal(rel, 'beta/sub/CMakeLists.txt');
    assert.equal(folderRelative(rel, beta), 'sub/CMakeLists.txt');
  });

  it('honours scan.exclude set in one folder’s .vscode/settings.json (D-27)', async () => {
    const found = await vscode.workspace.findFiles('**/package.json', excludeGlob());
    const rels = found.map((uri) => projectRelPath(uri)).sort();
    assert.deepEqual(rels, ['alpha/package.json', 'beta/package.json']);
  });
});
