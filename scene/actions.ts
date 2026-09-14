import { itemKindForMedia, resolveMedia } from './media';
import { isEmbeddable } from './schema';
import type { ResolvedItem } from './types';

/**
 * What happens when a visitor clicks an item.
 *
 * Decided HERE rather than inside a viewer, because the answer changes the
 * element the hotspot renders: a modal needs a <button>, a navigation needs an
 * <a>. Getting that wrong is what produces the "opens a pop-up, then makes you
 * click Open again" behaviour — two clicks to reach one destination, and a
 * middle-click or ctrl-click that does nothing.
 *
 * `SceneItemButton` and `SceneMobileList` both call this, so the desk and the
 * phone behave identically.
 */

export type SceneAction =
  /** Open the modal and render the viewer for this kind. */
  | { type: 'modal' }
  /** Navigate the browser. Internal scene links and outbound URLs alike. */
  | { type: 'navigate'; href: string; target: '_self' | '_blank'; internal: boolean }
  /** Trigger a file download; no navigation, no modal. */
  | { type: 'download'; href: string; filename?: string };

/**
 * @param item      the resolved scene item
 * @param sceneHref resolves a scene id to a URL on the current brand
 */
export function resolveAction(
  item: ResolvedItem,
  sceneHref: (sceneId: string) => string | null,
): SceneAction {
  switch (item.kind) {
    /* -------- always navigation -------- */

    case 'scene': {
      const href = sceneHref(item.targetId);
      // A dangling target would render a dead hotspot; a modal explaining the
      // config error is not the visitor's problem, so fall back to nothing.
      return href
        ? { type: 'navigate', href, target: '_self', internal: true }
        : { type: 'modal' };
    }

    case 'link': {
      // mailto/tel are not pages — a modal snippet would be empty. Everything
      // else (including hosts we will not iframe) opens the modal.
      if (/^(mailto|tel):/i.test(item.href)) {
        return {
          type: 'navigate',
          href: item.href,
          target: item.target ?? '_self',
          internal: false,
        };
      }
      return { type: 'modal' };
    }

    case 'download':
      return {
        type: 'download',
        href: item.download.href,
        filename: item.download.filename,
      };

    /* -------- conditionally navigation -------- */

    case 'auto': {
      const media = resolveMedia(item.src);
      const kind = item.as ?? itemKindForMedia(media);

      if (kind === 'link' && /^(mailto|tel):/i.test(media.url)) {
        return {
          type: 'navigate',
          href: media.url,
          target: '_self',
          internal: false,
        };
      }

      if (kind === 'download') {
        return {
          type: 'download',
          href: media.fileUrl ?? media.url,
          filename: media.filename,
        };
      }

      return { type: 'modal' };
    }

    case 'embed':
      return { type: 'modal' };

    case 'video': {
      const media = resolveMedia(item.src);
      if (media.embedUrl && !isEmbeddable(media.embedUrl)) {
        return { type: 'navigate', href: item.src, target: '_blank', internal: false };
      }
      return { type: 'modal' };
    }

    /* -------- always the modal -------- */

    default:
      return { type: 'modal' };
  }
}
