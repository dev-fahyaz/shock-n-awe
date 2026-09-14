import type { SceneConfig, SceneRoute, SiteKey } from '../types';
import { campaignPlanner } from './campaign-planner';
import { cisoTable } from './ciso-table';
import { executiveBriefing } from './executive-briefing';
import { nycDesk } from './nyc-desk';

/**
 * Scene registry — the v1 `staticSource` backing store.
 *
 * Keyed by the scene's IMMUTABLE id. Slugs live inside `routes[]` and may
 * change freely; nothing in this file or anywhere else keys off them.
 */
export const SCENES = {
  'nyc-financial-desk': nycDesk,
  'ciso-table': cisoTable,
  'campaign-planner': campaignPlanner,
  'executive-briefing': executiveBriefing,
} satisfies Record<string, SceneConfig>;

export type SceneId = keyof typeof SCENES;

export const allScenes = (): SceneConfig[] => Object.values(SCENES);

export const getSceneById = (id: string): SceneConfig | null =>
  (SCENES as Record<string, SceneConfig>)[id] ?? null;

/** Every live route across all scenes and brands. */
export function allLiveRoutes(): { scene: SceneConfig; route: SceneRoute }[] {
  return allScenes().flatMap(scene =>
    scene.routes
      .filter(route => route.status === 'live')
      .map(route => ({ scene, route })),
  );
}

/** Resolve `(brand, slug)` to a scene. Returns null on a miss. */
export function findByRoute(
  site: SiteKey,
  slug: string,
): { scene: SceneConfig; route: SceneRoute } | null {
  for (const scene of allScenes()) {
    const route = scene.routes.find(
      r => r.site === site && r.slug === slug && r.status === 'live',
    );
    if (route) return { scene, route };
  }
  return null;
}

/** The route a scene should be reached at on a given brand. */
export function routeFor(
  scene: SceneConfig,
  site: SiteKey,
): SceneRoute | undefined {
  return scene.routes.find(r => r.site === site && r.status === 'live');
}

/**
 * Walks `parent` up to the root, nearest-first.
 * Cycle-safe: stops if it ever revisits an id.
 */
export function trail(id: string): SceneConfig[] {
  const out: SceneConfig[] = [];
  const seen = new Set<string>();
  let cursor = getSceneById(id);

  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    out.push(cursor);
    cursor = cursor.parent ? getSceneById(cursor.parent) : null;
  }
  return out.reverse();
}

/** Old slug → current slug, per brand. Consumed by middleware for 301s. */
export function slugRedirects(): Record<SiteKey, Record<string, string>> {
  const map: Record<SiteKey, Record<string, string>> = {
    asat: {},
    aspire: {},
  };
  for (const scene of allScenes()) {
    for (const route of scene.routes) {
      for (const old of route.slugHistory ?? []) {
        map[route.site][old] = route.slug;
      }
    }
  }
  return map;
}

/* ------------------------------------------------------------------ *
 * Build-time validation
 * ------------------------------------------------------------------ */

export interface ValidationIssue {
  sceneId: string;
  message: string;
}

/**
 * Run in CI. Catches the failure modes that are otherwise invisible until a
 * campaign is already live:
 *
 *  - a slug that collides with a real page (silently never renders)
 *  - two scenes claiming the same slug on the same brand
 *  - a scene indexable on both brands with no canonical (competes with itself)
 *  - a `parent` or `targetId` pointing at a scene that does not exist
 */
export function validateScenes(reserved: string[] = []): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const reservedSet = new Set(reserved);
  const claimed = new Map<string, string>(); // `${site}:${slug}` → sceneId

  for (const scene of allScenes()) {
    if (scene.parent && !getSceneById(scene.parent)) {
      issues.push({
        sceneId: scene.id,
        message: `parent "${scene.parent}" does not exist`,
      });
    }

    for (const item of scene.items) {
      if ('kind' in item && item.kind === 'scene' && !getSceneById(item.targetId)) {
        issues.push({
          sceneId: scene.id,
          message: `item "${item.id}" targets missing scene "${item.targetId}"`,
        });
      }
    }

    const live = scene.routes.filter(r => r.status === 'live');

    for (const route of live) {
      if (reservedSet.has(route.slug)) {
        issues.push({
          sceneId: scene.id,
          message: `slug "${route.slug}" collides with an existing page and will never render`,
        });
      }

      const key = `${route.site}:${route.slug}`;
      const owner = claimed.get(key);
      if (owner && owner !== scene.id) {
        issues.push({
          sceneId: scene.id,
          message: `slug "${route.slug}" on ${route.site} is already used by "${owner}"`,
        });
      }
      claimed.set(key, scene.id);
    }

    const indexable = live.filter(r => r.indexable !== false);
    if (indexable.length > 1 && !indexable.some(r => r.canonical)) {
      issues.push({
        sceneId: scene.id,
        message:
          'indexable on more than one brand with no canonical route — the two will compete in search',
      });
    }
  }

  return issues;
}
