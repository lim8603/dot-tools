import * as vscode from 'vscode';
import { ALL_ADAPTERS } from '../adapters';
import type { LanguageAdapter, ProjectInfo } from './types';

/** Build artifacts / VCS dirs never hold a source manifest we care about (상세설계서 §8.2/§9). */
const EXCLUDE_GLOB = '**/{target,node_modules,.git}/**';

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

  /** Rescan the workspace and refresh the project list. */
  async scan(): Promise<ProjectInfo[]> {
    const found: ProjectInfo[] = [];
    for (const adapter of this.adapters) {
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

  project(projectId: string): ProjectInfo | undefined {
    return this.projects.find((p) => p.id === projectId);
  }

  adapterFor(project: ProjectInfo): LanguageAdapter | undefined {
    return this.byId.get(project.adapterId);
  }

  /**
   * Adapters whose manifest is present in the workspace — Doctor's check set (F19).
   * Independent of scan() so it still reports (e.g.) a present Cargo.toml when
   * `cargo metadata` failed and produced zero projects — that is exactly the E1 case.
   */
  async detectAdapters(): Promise<LanguageAdapter[]> {
    const present: LanguageAdapter[] = [];
    for (const adapter of this.adapters) {
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
