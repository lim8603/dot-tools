import * as vscode from 'vscode';
import { ALL_ADAPTERS } from '../adapters';
import { enabledAdapterIds } from './languageFilter';
import type { LanguageAdapter, ProjectInfo } from './types';

/**
 * Build artifacts / VCS / tooling dirs never hold a source manifest we care about
 * (상세설계서 §8.2/§9). `.vscode-test` is the extension-test runner's downloaded VS Code —
 * a huge tree of bundled `package.json` files (built-in extensions, resources/app) that
 * would otherwise flood the Node switcher; it only exists in extension-dev workspaces but
 * is always non-project.
 */
const EXCLUDE_GLOB = '**/{target,node_modules,.git,.vscode-test}/**';

/**
 * AdapterRegistry — workspace scan and project→adapter matching (TASK-007, ADR-006 /
 * 상세설계서 §3.3 / §8.2).
 *
 * Detection is file-list based, not root-marker based (DD-06): every registered
 * adapter's manifestGlobs are searched across the workspace, and the adapter builds
 * ProjectInfo from the matches. The project list is never persisted — a fresh scan
 * each activation is the single source of truth (§6.1).
 */
export class AdapterRegistry {
  private projects: ProjectInfo[] = [];
  private readonly byId = new Map<string, LanguageAdapter>();

  constructor(private readonly adapters: LanguageAdapter[] = ALL_ADAPTERS) {
    for (const adapter of adapters) {
      this.byId.set(adapter.id, adapter);
    }
  }

  /**
   * Adapters enabled by `devSwitcher.languages.enabled` (B-3) — the scan/detect/create
   * surface. Fail-open (an invalid or empty setting enables all); adapterFor/adapter
   * stay unfiltered so already-listed projects keep resolving mid-change.
   */
  private enabledAdapters(): LanguageAdapter[] {
    const setting = vscode.workspace.getConfiguration('devSwitcher').get<string[]>('languages.enabled');
    const enabled = enabledAdapterIds(setting, this.adapters.map((a) => a.id));
    return this.adapters.filter((a) => enabled.has(a.id));
  }

  /** Every registered adapter, independent of the enable filter — for the General-tab
   *  language checkboxes (B-3), which must list disabled languages too. */
  registeredAdapters(): LanguageAdapter[] {
    return this.adapters;
  }

  /** Rescan the workspace and refresh the project list. */
  async scan(): Promise<ProjectInfo[]> {
    const found: ProjectInfo[] = [];
    for (const adapter of this.enabledAdapters()) {
      const uris: vscode.Uri[] = [];
      for (const glob of adapter.manifestGlobs) {
        uris.push(...(await vscode.workspace.findFiles(glob, EXCLUDE_GLOB)));
      }
      if (uris.length === 0) {
        continue;
      }
      try {
        found.push(...(await adapter.listProjects(uris)));
      } catch {
        // Stub adapters (cmake/dotnet/python) throw NOT_IMPLEMENTED, and cargo can
        // fail on a broken manifest (E2) — skip; the watcher retries on the next change.
      }
    }
    this.projects = found;
    return found;
  }

  getProjects(): ProjectInfo[] {
    return this.projects;
  }

  /**
   * Drop every adapter's cached metadata (manual Rescan / force refresh, F17). Stub
   * adapters (cmake until MS-012) throw NOT_IMPLEMENTED from invalidateCache — ignored,
   * exactly as scan() tolerates their listProjects: they hold no cache to drop, so one
   * unimplemented adapter must never break a global rescan.
   */
  invalidateAll(): void {
    for (const adapter of this.adapters) {
      try {
        adapter.invalidateCache();
      } catch {
        // Stub adapter with nothing to invalidate — skip.
      }
    }
  }

  project(projectId: string): ProjectInfo | undefined {
    return this.projects.find((p) => p.id === projectId);
  }

  adapterFor(project: ProjectInfo): LanguageAdapter | undefined {
    return this.byId.get(project.adapterId);
  }

  /** Adapter by id (all registered, independent of scan) — for the start wizard (F20). */
  adapter(adapterId: string): LanguageAdapter | undefined {
    return this.byId.get(adapterId);
  }

  /** Adapters that support the start wizard (F20), narrowed by the enable filter (B-3). */
  creatableAdapters(): LanguageAdapter[] {
    return this.enabledAdapters().filter((a) => a.canCreateProject);
  }

  /**
   * Adapters whose manifest is present in the workspace — Doctor's check set (F19).
   * Independent of scan() so it still reports (e.g.) a present Cargo.toml when
   * `cargo metadata` failed and produced zero projects — that is exactly the E1 case.
   */
  async detectAdapters(): Promise<LanguageAdapter[]> {
    const present: LanguageAdapter[] = [];
    for (const adapter of this.enabledAdapters()) {
      for (const glob of adapter.manifestGlobs) {
        const hits = await vscode.workspace.findFiles(glob, EXCLUDE_GLOB, 1);
        if (hits.length > 0) {
          present.push(adapter);
          break;
        }
      }
    }
    return present;
  }
}
