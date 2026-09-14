import { getLibraryItem } from '../library/items';
import { isPlacedRef } from '../types';
import type { Placed, ResolvedItem } from '../types';

/**
 * Merge library references with their per-scene placements.
 *
 * `placement` is deliberately stored separately from the item definition —
 * that separation is what lets the same handbook sit at different coordinates
 * in three different scenes without three copies of its config.
 *
 * A reference to a missing library key is dropped with a warning rather than
 * throwing: one bad key should not take a whole campaign page down.
 */
export function resolvePlaced(placed: Placed[]): ResolvedItem[] {
  const out: ResolvedItem[] = [];

  for (const entry of placed) {
    if (!isPlacedRef(entry)) {
      out.push(entry);
      continue;
    }

    const base = getLibraryItem(entry.ref);
    if (!base) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(`[scene] unknown library item "${entry.ref}" — skipped`);
      }
      continue;
    }

    out.push({
      ...base,
      ...(entry.override ?? {}),
      placement: entry.placement,
    } as ResolvedItem);
  }

  return out;
}
