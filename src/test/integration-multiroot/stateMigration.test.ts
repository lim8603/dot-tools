import { strict as assert } from 'node:assert';
import * as vscode from 'vscode';
import { nodeAdapter } from '../../adapters/node/nodeAdapter';
import { StateStore } from '../../core/stateStore';
import { PERSISTED_STATE_KEY, type PersistedState } from '../../core/types';

/** In-memory workspaceState stand-in: what StateStore persists is readable afterwards. */
class MemoryMemento implements vscode.Memento {
  private readonly data = new Map<string, unknown>();
  keys(): readonly string[] {
    return [...this.data.keys()];
  }
  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.data.has(key) ? (this.data.get(key) as T) : defaultValue;
  }
  async update(key: string, value: unknown): Promise<void> {
    this.data.set(key, JSON.parse(JSON.stringify(value)));
  }
}

/**
 * R-3 / ADR-025 in the real multi-root host: state saved by v1.3.x, where both folders'
 * root package.json had the id `node:package.json`, moves to the id that pointed there
 * then (the first folder, `alpha`) when the scan runs — in the order the orchestrator's
 * refresh uses: migrate, then reconcile (which would drop ids it cannot find).
 */
describe('multi-root: stored state follows the new project ids (R-3, ADR-025)', () => {
  it('moves selections, overlay, active project and run-group members of an old id', async () => {
    const [alpha, beta] = vscode.workspace.workspaceFolders ?? [];
    const old = 'node:package.json';
    const memento = new MemoryMemento();
    const saved: PersistedState = {
      activeProjectId: old,
      selections: { [old]: { script: 'start' } },
      invocation: { [old]: { default: { env: { PORT: '3001' } } } },
      groups: [{ id: 'group:web', name: 'web', members: [{ projectId: old, dependsOn: [] }] }],
    };
    await memento.update(PERSISTED_STATE_KEY, saved);
    const store = new StateStore(memento);

    // The real scan of this host, mapped exactly as Orchestrator.refresh maps it.
    const projects = await nodeAdapter.listProjects([
      vscode.Uri.joinPath(alpha.uri, 'package.json'),
      vscode.Uri.joinPath(beta.uri, 'package.json'),
    ]);
    const moved = await store.migrateProjectIds(
      projects.map((p) => ({ id: p.id, folderName: p.workspaceFolder.name, folderIndex: p.workspaceFolder.index })),
    );
    await store.reconcile(projects.map((p) => p.id), {});

    const target = 'node:alpha/package.json';
    assert.equal(moved, 1);
    assert.equal(store.activeProjectId, target);
    assert.equal(store.getValue(target, 'script'), 'start');
    assert.deepEqual(store.getInvocation(target, 'default').env, { PORT: '3001' });
    assert.deepEqual(store.getGroups()[0].members.map((m) => m.projectId), [target]);

    // What was written back to workspaceState no longer mentions the old id anywhere.
    const persisted = JSON.stringify(memento.get(PERSISTED_STATE_KEY));
    assert.ok(!persisted.includes(`"${old}"`), persisted);
    assert.ok(!persisted.includes('node:beta/package.json'), 'beta did not inherit alpha’s state');
  });
});
