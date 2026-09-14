import type { ComponentType, CSSProperties, ReactNode } from 'react';

import type { Placement, SceneConfig } from '../types';

export interface StageProps {
  config: SceneConfig;
  children: ReactNode;
}

/**
 * A layout strategy answers exactly one question: given a placement, where
 * does this item go on screen?
 *
 * Item definitions, viewers, analytics and personalisation are all layout
 * independent — a PDF behaves identically on a desk or in a board column.
 * That is what stops "add a plan board" from becoming a second codebase.
 */
export interface LayoutStrategy {
  /** Wraps the scene: background image and aspect box, or grid columns. */
  Stage: ComponentType<StageProps>;
  /** Style props for one positioned item. */
  position: (placement: Placement) => CSSProperties;
  /**
   * Freeform needs a purpose-built card list under `md` — 20px tap targets
   * stacked on top of each other are unusable. Grid just stacks its columns.
   */
  needsMobileList: boolean;
}
