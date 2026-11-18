import { strict as assert } from 'node:assert';
import { applyIdMigrations, idMigrations, storedProjectIds, type MigrationTarget } from '../../core/projectIdMigration';
import type { PersistedState } from '../../core/types';

const twoFolders: MigrationTarget[] = [
  { id: 'node:api/package.json', folderName: 'api', folderIndex: 0 },
  { id: 'node:web/package.json', folderName: 'web', folderIndex: 1 },
  { id: 'cargo:web/tools/Cargo.toml', folderName: 'web', folderIndex: 1 },
];

describe('idMigrations (R-3, ADR-025)', () => {
  it('moves an old unprefixed multi-root id to the first folder, where it used to resolve', () => {
    assert.deepEqual([...idMigrations(['node:package.json'], twoFolders)], [['node:package.json', 'node:api/package.json']]);
  });

  it('moves a nested path to the folder that has it', () => {
    assert.deepEqual([...idMigrations(['cargo:tools/Cargo.toml'], twoFolders)], [['cargo:tools/Cargo.toml', 'cargo:web/tools/Cargo.toml']]);
  });

  it('drops the prefix when the workspace goes back to one folder', () => {
    const single: MigrationTarget[] = [{ id: 'node:package.json', folderName: 'web', folderIndex: 0 }];
    assert.deepEqual([...idMigrations(['node:web/package.json'], single)], [['node:web/package.json', 'node:package.json']]);
  });

  it('leaves ids that still match, and never overwrites a target with its own state', () => {
    assert.equal(idMigrations(['node:api/package.json'], twoFolders).size, 0);
    assert.equal(idMigrations(['node:package.json', 'node:api/package.json'], twoFolders).size, 0);
    assert.equal(idMigrations(['go:go.mod'], twoFolders).size, 0, 'no project of that kind');
  });
});

describe('applyIdMigrations', () => {
  it('renames selections, overlays, the active project and run-group members', () => {
    const state: PersistedState = {
      activeProjectId: 'node:package.json',
      selections: { 'node:package.json': { script: 'start' } },
      invocation: { 'node:package.json': { dev: { runArgs: ['-v'] } } },
      groups: [
        {
          id: 'group:1',
          name: 'stack',
          members: [
            { projectId: 'node:package.json', dependsOn: [] },
            { projectId: 'cargo:tools/Cargo.toml', dependsOn: ['node:package.json'] },
          ],
        },
      ],
    };
    const migrations = idMigrations(storedProjectIds(state), twoFolders);
    const next = applyIdMigrations(state, migrations);
    assert.equal(next.activeProjectId, 'node:api/package.json');
    assert.deepEqual(Object.keys(next.selections), ['node:api/package.json']);
    assert.deepEqual(Object.keys(next.invocation), ['node:api/package.json']);
    assert.deepEqual(next.groups![0].members, [
      { projectId: 'node:api/package.json', dependsOn: [] },
      { projectId: 'cargo:web/tools/Cargo.toml', dependsOn: ['node:api/package.json'] },
    ]);
  });
});
