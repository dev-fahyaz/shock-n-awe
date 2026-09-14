'use client';

import { useMemo } from 'react';

import { itemKindForMedia, resolveMedia } from '../media';
import type { ResolvedItem, SceneItemKind } from '../types';
import { VIEWERS } from './registry';
import type { ViewerProps } from './types';
import { ExternalFallback } from './ExternalFallback';

/**
 * `kind: 'auto'` — the dynamic entry point.
 *
 * Takes a URL, asks the resolver what it is, and delegates to the real viewer
 * with a synthesised item of that kind. A CMS field can therefore be a single
 * "paste a link" input rather than a type picker the editor has to get right.
 *
 * Resolution happens at render, not at save time, so a link that gains a
 * better viewer later (an Office format, a new provider) upgrades itself
 * without anyone re-editing the content.
 */
export default function AutoViewer(props: ViewerProps) {
  const { item } = props;
  const src = item.kind === 'auto' ? item.src : '';
  const override = item.kind === 'auto' ? item.as : undefined;

  const resolved = useMemo(() => {
    if (!src) return null;
    const media = resolveMedia(src);
    const kind = (override ?? itemKindForMedia(media)) as SceneItemKind;
    return { media, kind };
  }, [src, override]);

  if (item.kind !== 'auto' || !resolved) return null;
  const { media, kind } = resolved;

  /**
   * Downloads and nested scenes never reach here — `resolveAction()` makes
   * those hotspots anchors. This branch is the defensive floor if they do.
   */
  if (kind === 'download' || kind === 'scene') {
    return <ExternalFallback href={media.fileUrl ?? media.url} label={item.label} />;
  }

  const Viewer = VIEWERS[kind];
  if (!Viewer) {
    return <ExternalFallback href={media.url} label={item.label} />;
  }

  // Build the item the delegate expects. Preserving `id`, `label` and
  // `download` keeps analytics and the modal's download button intact.
  const base = {
    id: item.id,
    label: item.label,
    hint: item.hint,
    gated: item.gated,
    download:
      item.download ??
      (media.fileUrl
        ? { href: media.fileUrl, filename: media.filename }
        : undefined),
    placement: item.placement,
  };

  let delegate: ResolvedItem;
  switch (kind) {
    case 'video':
      delegate = { ...base, kind: 'video', src: media.url, poster: item.poster ?? media.posterUrl };
      break;
    case 'audio':
      delegate = { ...base, kind: 'audio', src: media.url };
      break;
    case 'pdf':
      delegate = { ...base, kind: 'pdf', src: media.url };
      break;
    case 'image':
      delegate = { ...base, kind: 'image', src: media.url, alt: item.label };
      break;
    case 'embed':
      delegate = { ...base, kind: 'embed', src: media.embedUrl ?? media.url };
      break;
    case 'link':
      delegate = { ...base, kind: 'link', href: media.url };
      break;
    default:
      return <ExternalFallback href={media.url} label={item.label} />;
  }

  return <Viewer {...props} item={delegate} />;
}
