'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { isEmbeddable } from '../schema';
import { resolveMedia } from '../media';
import { ProviderFrame } from '../ProviderFrame';
import { track } from '../track';
import type { ViewerProps } from './types';
import { ExternalFallback } from './ExternalFallback';

/**
 * Any video URL.
 *
 * A direct file (mp4 / webm / HLS) plays in a native `<video>`; a provider
 * link (YouTube, Vimeo, Loom, Wistia, Dailymotion) is normalised to its embed
 * form by the resolver and framed. A marketer pastes whatever they copied from
 * the address bar and it works.
 *
 * Quartile progress is reported for direct files. Provider iframes do not
 * expose playback state without their own SDK, so those report `scene_item_open`
 * and dwell time only — worth knowing before someone builds a report on it.
 */
export default function VideoViewer({ item, sceneId }: ViewerProps) {
  const src = item.kind === 'video' ? item.src : undefined;
  const muted = item.kind === 'video' ? Boolean(item.autoplayMuted) : false;
  const media = useMemo(() => (src ? resolveMedia(src) : null), [src]);
  const ref = useRef<HTMLVideoElement>(null);
  const [sent, setSent] = useState<Set<number>>(new Set());

  useEffect(() => setSent(new Set()), [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = muted;
    const play = () => el.play().catch(() => {
      el.muted = true;
      return el.play().catch(() => undefined);
    });
    void play();
  }, [src, muted]);

  if (item.kind !== 'video' || !media) return null;

  // Provider embed
  if (media.embedUrl) {
    if (!isEmbeddable(media.embedUrl)) {
      return (
        <ExternalFallback
          href={media.url}
          label={item.label}
          reason="This video host is not on the embed allowlist."
        />
      );
    }
    return (
      <ProviderFrame
        embedUrl={media.embedUrl}
        title={item.label}
        className="size-full bg-black"
      />
    );
  }

  // Direct file
  const onTimeUpdate = () => {
    const el = ref.current;
    if (!el || !el.duration || !isFinite(el.duration)) return;
    const pct = Math.floor((el.currentTime / el.duration) * 100);
    for (const q of [25, 50, 75, 100] as const) {
      if (pct >= q && !sent.has(q)) {
        setSent(prev => new Set(prev).add(q));
        track({
          event: 'scene_media_progress',
          sceneId,
          itemId: item.id,
          pct: q,
        });
      }
    }
  };

  return (
    <video
      ref={ref}
      src={media.url}
      poster={item.poster ?? media.posterUrl}
      controls
      autoPlay
      muted={muted}
      playsInline
      preload="metadata"
      onTimeUpdate={onTimeUpdate}
      className="size-full bg-black object-contain"
    >
      {item.captions?.map(c => (
        <track
          key={c.srclang}
          kind="captions"
          src={c.src}
          srcLang={c.srclang}
          label={c.label}
          default={c.srclang === 'en'}
        />
      ))}
    </video>
  );
}
