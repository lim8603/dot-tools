import { strict as assert } from 'node:assert';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { nodeAdapter } from '../../adapters/node/nodeAdapter';
import type { InvocationConfig, ProjectInfo, Selection } from '../../core/types';

/**
 * R-1 (review C6, ADR-016) — Node scripts run through ShellExecution in array form, so two
 * shells sit between the user's run args and the program: the task shell VS Code picks and
 * the shell npm runs the script in. Run args must reach the program verbatim and never be
 * interpreted by either: no command chaining, no variable expansion, no lost quotes.
 *
 * Each payload below would create a `pwned*` file (or alter argv) if a shell interpreted it.
 */
const PAYLOADS = [
  'plain',
  'two words',
  'x&echo PWNED>pwned-amp.txt',
  'a|b',
  'x;echo PWNED>pwned-semi.txt',
  '$(echo PWNED>pwned-subst.txt)',
  '`echo PWNED>pwned-tick.txt`',
  '%PATH%',
  '$HOME',
  "it's",
  'q"uote',
  'back\\slash',
  '',
];

/** Task shells to exercise on this host: VS Code's automation profile per run. */
function shells(): { name: string; path: string }[] {
  if (process.platform !== 'win32') {
    return [{ name: 'sh', path: '/bin/sh' }];
  }
  const list = [
    { name: 'cmd', path: 'C:\\Windows\\System32\\cmd.exe' },
    { name: 'powershell', path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' },
    { name: 'git-bash', path: 'C:\\Program Files\\Git\\bin\\bash.exe' },
  ];
  return list.filter((s) => existsSync(s.path));
}

/** Run a task and resolve with its process exit code. */
async function runToEnd(task: vscode.Task): Promise<number | undefined> {
  const execution = await vscode.tasks.executeTask(task);
  return new Promise((resolve) => {
    const sub = vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.execution === execution) {
        sub.dispose();
        resolve(e.exitCode);
      }
    });
  });
}

describe('Node run args reach the script verbatim (R-1, ADR-016)', function () {
  this.timeout(120000);
  const automationKey = `automationProfile.${process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux'}`;
  let original: unknown;

  before(() => {
    original = vscode.workspace.getConfiguration('terminal.integrated').inspect(automationKey)?.globalValue;
  });

  after(async () => {
    await vscode.workspace.getConfiguration('terminal.integrated').update(automationKey, original, vscode.ConfigurationTarget.Global);
  });

  for (const shell of shells()) {
    it(`through ${shell.name}`, async () => {
      await vscode.workspace
        .getConfiguration('terminal.integrated')
        .update(automationKey, { path: shell.path }, vscode.ConfigurationTarget.Global);

      const dir = mkdtempSync(join(tmpdir(), `ds-node-args-${shell.name}-`));
      try {
        writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'args-probe', scripts: { start: 'node print.js' } }));
        writeFileSync(
          join(dir, 'print.js'),
          "require('fs').writeFileSync(require('path').join(__dirname, 'argv.json'), JSON.stringify(process.argv.slice(2)));\n",
        );
        const project: ProjectInfo = {
          id: 'node:args-probe',
          name: 'args-probe',
          adapterId: 'node',
          manifestPath: join(dir, 'package.json'),
          workspaceFolder: vscode.workspace.workspaceFolders![0],
        };
        const sel: Selection = { projectId: project.id, values: { script: 'start', packageManager: 'npm' } };
        const config: InvocationConfig = { runArgs: PAYLOADS };

        const exitCode = await runToEnd(nodeAdapter.createRunTask(project, sel, config));

        const pwned = readdirSync(dir).filter((f) => f.startsWith('pwned'));
        assert.deepEqual(pwned, [], `${shell.name} executed an argument as a command`);
        assert.equal(exitCode, 0, `${shell.name}: the script did not run cleanly`);
        const argv = JSON.parse(readFileSync(join(dir, 'argv.json'), 'utf8')) as string[];
        assert.deepEqual(argv, PAYLOADS, `${shell.name} altered the arguments`);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
