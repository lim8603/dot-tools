import * as vscode from 'vscode';
import { ALL_ADAPTERS } from '../adapters';
import { enabledAdapterIds } from './languageFilter';
import { excludeGlob } from './workspaceExclude';
import type { LanguageAdapter, ProjectInfo } from './types';

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
  /** Increments per scan; a scan that finishes after a newer one started drops its result. */
  private scanGeneration = 0;
  /** Adapters whose manifest glob matched in the last scan (Doctor's set) — undefined before one. */
  private presentAdapterIds: Set<string> | undefined;
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

  /**
   * Rescan the workspace and refresh the project list.
   *
   * Adapters scan in parallel (their globs and `listProjects` processes are independent;
   * the result keeps adapter order). Scans can overlap — a watcher burst, a settings
   * change, a manual Rescan — and the one that STARTED last decides the list: an older
   * scan finishing later must not put back what a newer one (say, after disabling a
   * language) removed, so it returns the current list instead of writing its own.
   */
  async scan(): Promise<ProjectInfo[]> {
    const generation = ++this.scanGeneration;
    const exclude = excludeGlob();
    const results = await Promise.all(
      this.enabledAdapters().map(async (adapter) => {
        const uris: vscode.Uri[] = [];
        for (const glob of adapter.manifestGlobs) {
          uris.push(...(await vscode.workspace.findFiles(glob, exclude)));
        }
        // findFiles makes no ordering promise and its order does vary between runs, so the
        // project list would reshuffle on every rescan — entries jumping around the switcher
        // and the settings page while the user is reading them. Sort by path for a stable
        // list; orderByHierarchy preserves this order when it nests sub-projects.
        uris.sort((a, b) => a.path.localeCompare(b.path));
        if (uris.length === 0) {
          return { adapter, present: false, projects: [] as ProjectInfo[] };
        }
        try {
          return { adapter, present: true, projects: await adapter.listProjects(uris) };
        } catch {
          // cargo can fail on a broken manifest (E2) — skip; the watcher retries on the
          // next change. The manifest is still present, which is what Doctor needs (E1).
          return { adapter, present: true, projects: [] as ProjectInfo[] };
        }
      }),
    );
    if (generation !== this.scanGeneration) {
      return this.projects; // superseded by a scan that started later
    }
    this.projects = results.flatMap((r) => r.projects);
    this.presentAdapterIds = new Set(results.filter((r) => r.present).map((r) => r.adapter.id));
    return this.projects;
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
    // The last scan already searched every manifest glob; its answer is as fresh as the
    // project list itself (the watcher re-scans on change), so reuse it instead of
    // searching the workspace a second time.
    if (this.presentAdapterIds) {
      const ids = this.presentAdapterIds;
      return this.enabledAdapters().filter((a) => ids.has(a.id));
    }
    const present: LanguageAdapter[] = [];
    const exclude = excludeGlob();
    for (const adapter of this.enabledAdapters()) {
      for (const glob of adapter.manifestGlobs) {
        const hits = await vscode.workspace.findFiles(glob, exclude, 1);
        if (hits.length > 0) {
          present.push(adapter);
          break;
        }
      }
    }
    return present;
  }
}
