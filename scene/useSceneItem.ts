'use client';

import { createContext, useContext } from 'react';

import type { ResolvedItem, SceneConfig, SiteKey, TrailNode } from './types';

export interface SceneContextValue {
  config: SceneConfig;
  site: SiteKey;
  items: ResolvedItem[];
  trail: TrailNode[];
  activeItem: ResolvedItem | null;
  open: (itemId: string) => void;
  close: () => void;
  /** Resolves a scene id to a URL on the current brand, or null if unreachable. */
  hrefForScene: (sceneId: string) => string | null;
}

export const SceneContext = createContext<SceneContextValue | null>(null);

export function useScene(): SceneContextValue {
  const ctx = useContext(SceneContext);
  if (!ctx) {
    throw new Error('useScene must be used inside <Scene>');
  }
  return ctx;
}

/** Human-readable suffix for the accessible name of a hotspot. */
export const KIND_LABEL: Record<ResolvedItem['kind'], string> = {
  // `auto` resolves at render time, so the announcement stays generic. A
  // screen-reader user hears the item's own label first, which carries the
  // meaning; the kind is only a hint about what will happen.
  auto: 'opens content',
  image: 'image',
  pdf: 'PDF document',
  pages: 'document',
  flipbook: 'document',
  embed: 'web page',
  scene: 'opens another scene',
  link: 'link',
  download: 'download',
  video: 'video',
  audio: 'audio message',
  card: 'contact card',
  letter: 'letter',
  form: 'form',
};
