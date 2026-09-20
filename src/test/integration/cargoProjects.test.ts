import { strict as assert } from 'node:assert';
import * as vscode from 'vscode';
import { cargoAdapter } from '../../adapters/cargo/cargoAdapter';
import { CargoBridge, type CargoMetadata } from '../../adapters/cargo/cargoBridge';
import { orderByHierarchy } from '../../core/projectTree';

describe('Cargo project discovery — manifest identity', () => {
  const originalFetch = CargoBridge.prototype.fetchMetadata;
  let root: vscode.Uri;

  before(() => {
    root = vscode.workspace.workspaceFolders![0].uri;
  });

  afterEach(() => {
    CargoBridge.prototype.fetchMetadata = originalFetch;
    cargoAdapter.invalidateCache();
  });

  function metadata(paths: string[]): CargoMetadata {
    return {
      workspace_root: root.fsPath,
      target_directory: vscode.Uri.joinPath(root, 'target').fsPath,
      workspace_members: paths.map((_, i) => `member-${i}`),
      packages: paths.map((manifest_path, i) => ({
        id: `member-${i}`, name: `app-${i}`, manifest_path, targets: [], features: {},
      })),
    };
  }

  it('skips members already discovered with an uppercase Windows drive letter', async function () {
    if (process.platform !== 'win32') { this.skip(); }
    const workspace = vscode.Uri.joinPath(root, 'Cargo.toml');
    const member = vscode.Uri.joinPath(root, 'servers', 'order-sim', 'Cargo.toml');
    const upperDrive = member.fsPath.replace(/^[a-z]:/i, (drive) => drive.toUpperCase());
    const calls: string[] = [];
    CargoBridge.prototype.fetchMetadata = async (path) => {
      calls.push(path);
      return metadata([path === workspace.fsPath ? upperDrive : member.fsPath]);
    };

    const projects = await cargoAdapter.listProjects([member, workspace]);
    assert.equal(projects.length, 1, 'one manifest must yield exactly one project');
    assert.deepEqual(calls, [workspace.fsPath], 'workspace discovery should cover its member');
    assert.equal(orderByHierarchy(projects).length, 1, 'both UI consumers see one entry');
    assert.equal(projects[0].id, `cargo:${vscode.workspace.asRelativePath(member, false)}`);
    assert.equal(projects[0].manifestPath, upperDrive, 'keep the original execution path');
  });

  it('deduplicates members returned by separate metadata calls with mixed drive casing', async function () {
    if (process.platform !== 'win32') { this.skip(); }
    const member = vscode.Uri.joinPath(root, 'servers', 'agent', 'Cargo.toml');
    const upperDrive = member.fsPath.replace(/^[a-z]:/i, (drive) => drive.toUpperCase());
    let calls = 0;
    CargoBridge.prototype.fetchMetadata = async () => metadata([calls++ === 0 ? upperDrive : member.fsPath]);

    const projects = await cargoAdapter.listProjects([
      vscode.Uri.joinPath(root, 'first', 'Cargo.toml'),
      vscode.Uri.joinPath(root, 'second', 'Cargo.toml'),
    ]);
    assert.equal(calls, 2, 'both independent manifest discoveries are exercised');
    assert.equal(projects.length, 1);
    assert.equal(new Set(projects.map((p) => p.id)).size, projects.length);
  });

  it('keeps distinct manifests even when their package names are identical', async () => {
    const paths = ['first', 'second'].map((dir) => vscode.Uri.joinPath(root, dir, 'Cargo.toml').fsPath);
    const data = metadata(paths);
    data.packages.forEach((pkg) => { pkg.name = 'same-name'; });
    CargoBridge.prototype.fetchMetadata = async () => data;
    const projects = await cargoAdapter.listProjects([vscode.Uri.joinPath(root, 'Cargo.toml')]);
    assert.equal(projects.length, 2);
    assert.equal(new Set(projects.map((p) => p.id)).size, 2);
  });

  it('preserves case-distinct POSIX manifests', async function () {
    if (process.platform === 'win32') { this.skip(); }
    const paths = ['App', 'app'].map((dir) => vscode.Uri.joinPath(root, dir, 'Cargo.toml').fsPath);
    CargoBridge.prototype.fetchMetadata = async () => metadata(paths);
    const projects = await cargoAdapter.listProjects([vscode.Uri.joinPath(root, 'Cargo.toml')]);
    assert.equal(projects.length, 2);
  });
});
