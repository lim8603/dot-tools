import * as vscode from 'vscode';

/**
 * ManifestWatcher — debounced rescan on manifest changes (TASK-009, F17 / 상세설계서 §9).
 *
 * Watches the union of every adapter's manifestGlobs and coalesces bursts (e.g. a
 * git branch switch touching many Cargo.toml files) into a single `onChange` after
 * a quiet period. Build-output manifests (target/, node_modules/) still fire here,
 * but the rescan's findFiles excludes them, so a stray event only costs one refresh.
 */
export class ManifestWatcher {
  private readonly watchers: vscode.FileSystemWatcher[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly globs: string[],
    private readonly onChange: () => void,
    private readonly debounceMs = 500,
  ) {}

  start(): void {
    for (const glob of this.globs) {
      const watcher = vscode.workspace.createFileSystemWatcher(glob);
      watcher.onDidCreate(() => this.schedule());
      watcher.onDidChange(() => this.schedule());
      watcher.onDidDelete(() => this.schedule());
      this.watchers.push(watcher);
    }
  }

  dispose(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers.length = 0;
  }

  private schedule(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.onChange();
    }, this.debounceMs);
  }
}
