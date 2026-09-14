import type { ResolvedScene, SceneConfig, SceneRoute, SiteKey } from '../types';

export interface SceneSource {
  list(): Promise<SceneConfig[]>;
  getByRoute(site: SiteKey, slug: string): Promise<ResolvedScene | null>;
  getById(id: string, site: SiteKey): Promise<ResolvedScene | null>;
  allLiveRoutes(): Promise<SceneRoute[]>;
  redirects(): Promise<Record<SiteKey, Record<string, string>>>;
}
