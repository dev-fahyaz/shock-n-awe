import type { LayoutKind } from '../types';
import { FreeformLayout } from './FreeformLayout';
import type { LayoutStrategy } from './types';

/**
 * Layout registry.
 *
 * `grid` (plan boards) and `panorama` (360° walkthroughs) are declared in the
 * type but not yet implemented — both fall back to freeform so a misconfigured
 * scene degrades instead of crashing. Implement `grid` when a plan board is
 * actually commissioned; leave `panorama` until someone asks, since it needs a
 * 3D library, 360° capture and its own accessibility story.
 */
export const LAYOUTS: Record<LayoutKind, LayoutStrategy> = {
  freeform: FreeformLayout,
  grid: FreeformLayout,
  panorama: FreeformLayout,
};

export const layoutFor = (kind: LayoutKind): LayoutStrategy =>
  LAYOUTS[kind] ?? FreeformLayout;

export type { LayoutStrategy } from './types';
