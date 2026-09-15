import { resolvePlaced } from './resolve';
import {
  getById as storeGetById,
  getByRoute as storeGetByRoute,
  list as storeList,
  redirects as storeRedirects,
} from './store';
import type { SceneSource } from './types';
import type { ResolvedScene, SiteKey } from '../types';

/**
 * SceneSource when Supabase env is set. Reads go through store.ts, which
 * reads sna_scenes through store.ts. Empty table is seeded once from JSON.
 */
export const supabaseSource: SceneSource = {
  list: storeList,

  async getByRoute(site: SiteKey, slug: string): Promise<ResolvedScene | null> {
    const hit = await storeGetByRoute(site, slug, true);
    if (!hit) return null;
    return {
      config: hit.config,
      route: hit.route,
      items: resolvePlaced(hit.config.items),
    };
  },

  async getById(id: string, site: SiteKey): Promise<ResolvedScene | null> {
    const config = await storeGetById(id);
    if (!config) return null;
    const route = config.routes.find(r => r.site === site && r.status === 'live');
    if (!route) return null;
    return { config, route, items: resolvePlaced(config.items) };
  },

  async allLiveRoutes() {
    return (await storeList()).flatMap(s =>
      s.routes.filter(r => r.status === 'live'),
    );
  },

  redirects: storeRedirects,
};
