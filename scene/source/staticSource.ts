import {
  allLiveRoutes as allLiveRoutePairs,
  allScenes,
  findByRoute,
  getSceneById,
  routeFor,
  slugRedirects,
} from '../configs';
import type { ResolvedScene, SceneRoute, SiteKey } from '../types';
import { resolvePlaced } from './resolve';
import type { SceneSource } from './types';

/**
 * v1 backing store: typed TS files in `configs/`.
 *
 * Compile-time safety, zero infrastructure, reviewable in a pull request.
 * Changing a slug requires a deploy — acceptable for the first campaigns,
 * replaced by `cmsSource` when marketing needs to do it themselves.
 */
export const staticSource: SceneSource = {
  async list() {
    return allScenes();
  },
  async getByRoute(site: SiteKey, slug: string): Promise<ResolvedScene | null> {
    const hit = findByRoute(site, slug);
    if (!hit) return null;

    return {
      config: hit.scene,
      route: hit.route,
      items: resolvePlaced(hit.scene.items),
    };
  },

  async getById(id: string, site: SiteKey): Promise<ResolvedScene | null> {
    const scene = getSceneById(id);
    if (!scene) return null;

    const route = routeFor(scene, site);
    if (!route) return null;

    return { config: scene, route, items: resolvePlaced(scene.items) };
  },

  async allLiveRoutes(): Promise<SceneRoute[]> {
    return allLiveRoutePairs().map(({ route }) => route);
  },

  async redirects(): Promise<Record<SiteKey, Record<string, string>>> {
    return slugRedirects();
  },
};
