import { jsonSource } from './jsonSource';
import type { SceneSource } from './types';

/**
 * Where scene config comes from.
 *
 * Live reads go through jsonSource (local JSON by default). Writes live on
 * `store.ts` so a later database swap does not touch the viewers.
 */

let cached: SceneSource | null = null;

export function sceneSource(): SceneSource {
  if (!cached) cached = jsonSource;
  return cached;
}

export type { SceneSource } from './types';
export { resolvePlaced } from './resolve';
export { invalidateSceneCache } from './store';
