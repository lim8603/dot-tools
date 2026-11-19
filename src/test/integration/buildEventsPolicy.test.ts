import { strict as assert } from 'node:assert';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { AdapterRegistry } from '../../core/adapterRegistry';
import { GroupOrchestrator } from '../../core/groupOrchestrator';
import { Orchestrator } from '../../core/orchestrator';
import { StateStore } from '../../core/stateStore';
import { TaskRunner } from '../../core/taskRunner';
import type { ActionCapabilities, LanguageAdapter, ProjectInfo } from '../../core/types';
import { StatusBarController } from '../../ui/statusBar';

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
 * R-5 build-event policy, run for real in the extension host: pre-build before anything
 * builds or runs; post-build after the flow's build succeeded (Debug: before the debugger
 * starts; a run-group Run member: after it exits successfully). Every step — pre/post
 * commands (ShellExecution), the build and run tasks, and the debuggee (VS Code's built-in
 * js-debug) — appends `<project>:<step>` to one log, so the log is the observed order.
 * A minimal adapter keeps toolchains and debugger extensions out of the picture: the
 * policy lives in the orchestrators, not in the adapters.
 */
describe('Build events run around Debug and run-group members (R-5)', function () {
  this.timeout(120000);
  let dir: string;
  let log: string;
  let mark: string;
  let registry: AdapterRegistry;
  let store: StateStore;
  let taskRunner: TaskRunner;

  const lines = (): string[] => (existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean) : []);
  const stepsOf = (name: string): string[] => lines().filter((l) => l.startsWith(`${name}:`)).map((l) => l.slice(name.length + 1));
  const waitFor = async (done: () => boolean, ms = 60000): Promise<void> => {
    const until = Date.now() + ms;
    while (!done()) {
      if (Date.now() > until) {
        assert.fail(`timed out; log so far: ${lines().join(', ')}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  };

  before(async () => {
    dir = mkdtempSync(join(tmpdir(), 'ds-buildevents-'));
    log = join(dir, 'events.log');
    mark = join(dir, 'mark.js');
    writeFileSync(mark, `require('fs').appendFileSync(${JSON.stringify(log)}, process.argv[2] + '\\n');\n`);

    const folder = vscode.workspace.workspaceFolders![0];
    const manifestPath = join(folder.uri.fsPath, 'Cargo.toml'); // only a cwd for the tasks
    const projectNamed = (name: string): ProjectInfo => ({ id: `fake:${name}`, name, adapterId: 'fake', manifestPath, workspaceFolder: folder });
    const step = (project: ProjectInfo, what: string): vscode.Task =>
      new vscode.Task(
        { type: 'devswitcher-test', what, projectId: project.id },
        folder,
        `${project.name} ${what}`,
        'test',
        new vscode.ProcessExecution('node', [mark, `${project.name}:${what}`]),
      );
    const fake: LanguageAdapter = {
      id: 'fake',
      displayName: 'Fake',
      actions: { build: true } as ActionCapabilities,
      chips: [],
      manifestGlobs: ['**/Cargo.toml'],
      requiredExtensions: [],
      canCreateProject: false,
      optionCatalog: [],
      configCategories: [],
      listProjects: async () => ['solo', 'svc', 'dbg'].map(projectNamed),
      createBuildTask: (p) => step(p, 'build'),
      createRunTask: (p) => step(p, 'run'),
      createDebugConfig: async (p) => ({ type: 'node', request: 'launch', name: `${p.name} debug`, program: mark, args: [`${p.name}:debug`] }),
      resolveExecutable: async () => mark,
      createProject: () => ({ kind: 'files', files: [] }),
      invalidateCache: () => {},
      collectDiagnostics: async () => [],
    };

    registry = new AdapterRegistry([fake]);
    await registry.scan();
    store = new StateStore(new MemoryMemento());
    taskRunner = new TaskRunner();
    for (const name of ['solo', 'svc', 'dbg']) {
      await store.setInvocation(`fake:${name}`, 'dev', {
        preBuild: [`node "${mark}" ${name}:pre`],
        postBuild: [`node "${mark}" ${name}:post`],
      });
    }
  });

  after(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('Debug: pre-build → build → post-build → debugger', async () => {
    await store.setActiveProject('fake:solo');
    const orchestrator = new Orchestrator(registry, store, new StatusBarController(), taskRunner);
    await orchestrator.debug();
    await waitFor(() => stepsOf('solo').includes('debug'));
    assert.deepEqual(stepsOf('solo'), ['pre', 'build', 'post', 'debug']);
  });

  it('run group: a Run member gets pre-build first and post-build after it exits; a Debug member as Debug', async () => {
    await store.saveGroup({
      id: 'group:t',
      name: 't',
      members: [
        { projectId: 'fake:svc', dependsOn: [] },
        { projectId: 'fake:dbg', dependsOn: [], debug: true },
      ],
    });
    const groups = new GroupOrchestrator(registry, store, taskRunner);
    await groups.runGroup('group:t');
    await waitFor(() => stepsOf('svc').includes('post') && stepsOf('dbg').includes('debug'));
    assert.deepEqual(stepsOf('svc'), ['pre', 'run', 'post']);
    assert.deepEqual(stepsOf('dbg'), ['pre', 'build', 'post', 'debug']);
  });
});
