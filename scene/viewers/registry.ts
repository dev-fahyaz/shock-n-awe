import dynamic from 'next/dynamic';

import type { SceneItemKind } from '../types';
import type { ViewerComponent } from './types';

/**
 * kind → viewer.
 *
 * Every entry is `next/dynamic`, so a scene ships its shell and nothing else
 * until a visitor actually opens something. PDF, video and page-image code
 * never enters the initial bundle.
 *
 * `Record<SceneItemKind, …>` is the safety net: adding a kind to the union
 * fails the build until its viewer is registered here, which makes it
 * impossible to ship a half-wired type.
 */

/** Kinds that act on click instead of opening a modal. */
const NoModal: ViewerComponent = () => null;

export const VIEWERS: Record<SceneItemKind, ViewerComponent> = {
  // The dynamic entry point — resolves a URL then delegates to one of the below.
  auto: dynamic(() => import('./AutoViewer')),

  pdf: dynamic(() => import('./PdfViewer'), { ssr: false }),
  pages: dynamic(() => import('./PagesViewer')),
  embed: dynamic(() => import('./EmbedViewer')),
  image: dynamic(() => import('./ImageViewer')),
  video: dynamic(() => import('./VideoViewer')),
  audio: dynamic(() => import('./AudioViewer')),
  card: dynamic(() => import('./CardViewer')),
  letter: dynamic(() => import('./LetterViewer')),
  form: dynamic(() => import('./FormViewer')),

  // Page-turn animation is the one deliberately deferred viewer: it needs a
  // library plus ~2 rendered images per page. `pages` covers the same content
  // today with no asset pipeline, so a flipbook item degrades to that.
  flipbook: dynamic(() => import('./PagesViewer')),

  // Website items open the modal (iframe or screenshot snippet).
  link: dynamic(() => import('./EmbedViewer')),

  // Handled at the hotspot — these navigate or download, never open a modal.
  scene: NoModal,
  download: NoModal,
};

/** Kinds that never open the modal. */
export const NON_MODAL_KINDS: ReadonlySet<SceneItemKind> = new Set([
  'scene',
  'download',
]);

export const opensModal = (kind: SceneItemKind) => !NON_MODAL_KINDS.has(kind);
