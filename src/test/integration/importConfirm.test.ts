import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as vscode from 'vscode';
import { AdapterRegistry } from '../../core/adapterRegistry';
import { Orchestrator } from '../../core/orchestrator';
import { StateStore } from '../../core/stateStore';
import { TaskRunner } from '../../core/taskRunner';
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
 * Capture this test host's window without touching input focus (PrintWindow renders an
 * occluded window too). Only when DS_SHOT_DIR is set — a manual look at the QuickPick.
 */
function captureHostWindow(name: string): void {
  const outDir = process.env.DS_SHOT_DIR;
  if (!outDir || process.platform !== 'win32') {
    return;
  }
  const script = `
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class Cap {
  public delegate bool P(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(P p, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint f);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  public struct RECT { public int L, T, R, B; }
  public static IntPtr Find(string part) {
    IntPtr found = IntPtr.Zero;
    EnumWindows((h, l) => { var s = new StringBuilder(512); GetWindowText(h, s, 512);
      if (IsWindowVisible(h) && s.ToString().Contains(part)) { found = h; return false; } return true; }, IntPtr.Zero);
    return found;
  }
}
'@
[Cap]::SetProcessDPIAware() | Out-Null
$h = [Cap]::Find('Extension Development Host')
if ($h -eq [IntPtr]::Zero) { 'no window'; exit 0 }
$r = New-Object Cap+RECT; [Cap]::GetWindowRect($h, [ref]$r) | Out-Null
$bmp = New-Object System.Drawing.Bitmap ($r.R - $r.L), ($r.B - $r.T)
$g = [System.Drawing.Graphics]::FromImage($bmp); $dc = $g.GetHdc()
[Cap]::PrintWindow($h, $dc, 2) | Out-Null
$g.ReleaseHdc($dc); $bmp.Save('${join(outDir, `${name}.png`).replace(/'/g, "''")}')
`;
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { timeout: 30000 });
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * R-5 / A9 — importing a profile that carries pre/post-build commands asks first, in a
 * QuickPick: import with them, import without them, or cancel (Escape, or picking a
 * listed command). The real QuickPick is shown in this host and answered through VS Code
 * commands, as a keyboard would — no OS input involved.
 */
describe('Profile import asks before installing build commands (R-5, A9)', function () {
  this.timeout(120000);
  let dir: string;
  let profileUri: vscode.Uri;
  let cargoId: string;
  let orchestrator: Orchestrator;
  let store: StateStore;
  let originalOpenDialog: typeof vscode.window.showOpenDialog;

  before(async () => {
    const registry = new AdapterRegistry();
    const projects = await registry.scan();
    const cargo = projects.find((p) => p.adapterId === 'cargo');
    assert.ok(cargo, 'the cargo fixture is scanned');
    cargoId = cargo.id;

    dir = mkdtempSync(join(tmpdir(), 'ds-import-'));
    const file = join(dir, 'profile.json');
    writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        exportedAt: '2026-11-19T00:00:00.000Z',
        selections: { [cargoId]: { profile: 'dev' } },
        invocation: { [cargoId]: { dev: { preBuild: ['echo IMPORTED-PRE'], postBuild: ['echo IMPORTED-POST'], env: { FROM_PROFILE: '1' } } } },
      }),
    );
    profileUri = vscode.Uri.file(file);

    originalOpenDialog = vscode.window.showOpenDialog;
    (vscode.window as { showOpenDialog: typeof vscode.window.showOpenDialog }).showOpenDialog = async () => [profileUri];

    store = new StateStore(new MemoryMemento());
    orchestrator = new Orchestrator(registry, store, new StatusBarController(), new TaskRunner());
  });

  after(() => {
    (vscode.window as { showOpenDialog: typeof vscode.window.showOpenDialog }).showOpenDialog = originalOpenDialog;
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    await store.importState({ activeProjectId: cargoId, selections: {}, invocation: {}, groups: [] });
  });

  /** Start an import, let the QuickPick open, answer it with the given commands. */
  async function importAnswering(answer: string[], shot?: string): Promise<void> {
    const done = orchestrator.importProfile();
    await sleep(1500);
    if (shot) {
      captureHostWindow(shot);
    }
    for (const command of answer) {
      await vscode.commands.executeCommand(command);
      await sleep(200);
    }
    await done;
  }

  it('"Import with these commands" installs the commands', async () => {
    await importAnswering(['workbench.action.acceptSelectedQuickOpenItem'], 'import-confirm');
    const config = store.getInvocation(cargoId, 'dev');
    assert.deepEqual(config.preBuild, ['echo IMPORTED-PRE']);
    assert.deepEqual(config.postBuild, ['echo IMPORTED-POST']);
    assert.deepEqual(config.env, { FROM_PROFILE: '1' });
  });

  it('"Import without the build commands" keeps the rest of the profile', async () => {
    await importAnswering(['workbench.action.quickOpenSelectNext', 'workbench.action.acceptSelectedQuickOpenItem']);
    const config = store.getInvocation(cargoId, 'dev');
    assert.equal(config.preBuild, undefined);
    assert.equal(config.postBuild, undefined);
    assert.deepEqual(config.env, { FROM_PROFILE: '1' });
  });

  it('Escape imports nothing', async () => {
    await importAnswering(['workbench.action.closeQuickOpen']);
    assert.deepEqual(store.getInvocation(cargoId, 'dev'), {});
  });

  it('picking a listed command counts as cancel', async () => {
    await importAnswering([
      'workbench.action.quickOpenSelectNext',
      'workbench.action.quickOpenSelectNext',
      'workbench.action.acceptSelectedQuickOpenItem',
    ]);
    assert.deepEqual(store.getInvocation(cargoId, 'dev'), {});
  });
});
