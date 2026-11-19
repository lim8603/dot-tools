import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as vscode from 'vscode';
import { AdapterRegistry } from '../../core/adapterRegistry';
import { GroupOrchestrator } from '../../core/groupOrchestrator';
import { StateStore } from '../../core/stateStore';
import { TaskRunner } from '../../core/taskRunner';
import { getSettingsHtml } from '../../ui/settingsPanel/html';
import { SettingsPanel } from '../../ui/settingsPanel/settingsPanel';

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

/** Chrome for a headless page run — no window, no focus taken. (msedge.exe --dump-dom
 *  prints nothing on Windows: its launcher does not hand stdout through, measured.) */
function findBrowser(): string | undefined {
  const candidates = [
    join(process.env['ProgramFiles'] ?? 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  return candidates.find((p) => existsSync(p));
}

/**
 * Drives the page after its own script: paint the state, open the Invocation tab, type
 * into Run args, deliver a background state mid-typing, keep typing, then leave the field
 * the way a browser does (change, then blur). Writes what it saw into <pre id="result">.
 */
const SCENARIO = String.raw`
const posts = window.__posts;
const tick = () => new Promise((r) => setTimeout(r, 20));
(async () => {
  const out = {};
  try {
    window.postMessage(Object.assign({ type: 'state' }, window.__state), '*');
    await tick();
    document.querySelector('[data-tab="invocation"]').click();
    await tick();
    const input = document.getElementById('runargs-input');
    input.focus();
    input.value = '--port 30';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    out.focusedBefore = document.activeElement === input;

    // A watcher refresh / group change arrives while typing.
    const background = Object.assign({ type: 'state' }, window.__state, { displayName: 'BACKGROUND-REFRESH' });
    window.postMessage(background, '*');
    await tick();
    const after = document.getElementById('runargs-input');
    out.sameElement = after === input;
    out.valueKept = after ? after.value : null;
    out.stillFocused = document.activeElement === after;
    out.backgroundPaintedWhileTyping = document.body.innerText.includes('BACKGROUND-REFRESH');

    after.value = after.value + '01';
    after.dispatchEvent(new Event('change', { bubbles: true }));
    after.blur();
    await tick(); await tick();
    out.posts = posts.filter((m) => m.type === 'setRunArgs');
    out.backgroundPaintedAfterBlur = document.body.innerText.includes('BACKGROUND-REFRESH');
  } catch (e) {
    out.error = String(e && e.stack || e);
  }
  const pre = document.createElement('pre');
  pre.id = 'result';
  pre.textContent = JSON.stringify(out);
  document.body.appendChild(pre);
})();
`;

/**
 * R-5 / A10 — the settings page keeps what you are typing when a state arrives
 * mid-edit, and applies that state once the field is left. The real panel builds the
 * state for the cargo fixture and the real webview document runs in a headless browser.
 */
describe('Settings page keeps typed text across a background update (R-5, A10)', function () {
  this.timeout(120000);
  let dir: string;
  let browser: string;
  let state: unknown;

  before(async function () {
    const found = findBrowser();
    if (!found) {
      this.skip();
    }
    browser = found!;
    dir = mkdtempSync(join(tmpdir(), 'ds-webview-'));
    const registry = new AdapterRegistry();
    const projects = await registry.scan();
    const cargo = projects.find((p) => p.adapterId === 'cargo');
    assert.ok(cargo, 'the cargo fixture is scanned');
    const store = new StateStore(new MemoryMemento());
    await store.setActiveProject(cargo.id);
    const panel = new SettingsPanel(registry, store, new GroupOrchestrator(registry, store, new TaskRunner()), () => {});
    state = await (panel as unknown as { buildState(quick: boolean): Promise<unknown> }).buildState(false);
  });

  after(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /** Render the page with the scenario in the headless browser; returns the scenario's findings. */
  function runPage(transform: (html: string) => string = (h) => h): Record<string, unknown> {
    const nonce = 'n0nce';
    const page = transform(getSettingsHtml({ cspSource: "'self'" } as vscode.Webview, nonce));
    const harness =
      `<script nonce="${nonce}">window.__posts = []; window.__state = ${JSON.stringify(state)};` +
      `window.acquireVsCodeApi = () => ({ postMessage: (m) => window.__posts.push(m), getState: () => undefined, setState: () => {} });</script>`;
    const html = page
      .replace('<script nonce="' + nonce + '">', harness + '<script nonce="' + nonce + '">')
      .replace('</body>', `<script nonce="${nonce}">${SCENARIO}</script></body>`);
    const file = join(dir, `page-${Date.now()}.html`);
    writeFileSync(file, html);
    const dom = execFileSync(
      browser,
      ['--headless=new', '--disable-gpu', `--user-data-dir=${join(dir, 'profile')}`, '--virtual-time-budget=5000', '--dump-dom', pathToFileURL(file).href],
      { encoding: 'utf8', timeout: 60000 },
    );
    const match = /<pre id="result">([\s\S]*?)<\/pre>/.exec(dom);
    assert.ok(match, `the scenario reported back; page ends: ${dom.slice(-600)}`);
    const text = match[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    return JSON.parse(text) as Record<string, unknown>;
  }

  it('holds the state while typing, then commits the field and paints the held state', () => {
    const r = runPage();
    assert.equal(r.error, undefined, String(r.error));
    assert.equal(r.focusedBefore, true);
    assert.equal(r.sameElement, true, 'the field was not rebuilt under the cursor');
    assert.equal(r.valueKept, '--port 30');
    assert.equal(r.stillFocused, true);
    assert.equal(r.backgroundPaintedWhileTyping, false);
    assert.deepEqual(r.posts, [{ type: 'setRunArgs', line: '--port 3001' }]);
    assert.equal(r.backgroundPaintedAfterBlur, true, 'the held state is applied once the field is left');
  });

  it('control: without the hold, the same scenario loses the typed text (the v1.3.3 behaviour)', () => {
    const hold = 'if (editingText()) { pendingState = e.data; return; }';
    const r = runPage((html) => {
      assert.ok(html.includes(hold), 'the page still has the hold this control removes');
      return html.replace(hold, '');
    });
    assert.equal(r.sameElement, false, 'the field is rebuilt under the cursor');
    assert.notEqual(r.valueKept, '--port 30');
  });
});
