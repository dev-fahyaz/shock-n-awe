'use client';

import { useEffect, useMemo, useRef } from 'react';

import { withEmbedPlayback } from './media';

type YtPlayer = {
  mute: () => void;
  playVideo: () => void;
  destroy: () => void;
};

type YtNamespace = {
  Player: new (
    el: HTMLElement,
    opts: { events?: { onReady?: (e: { target: YtPlayer }) => void } },
  ) => YtPlayer;
};

const waiters: Array<() => void> = [];

function whenYtReady(cb: () => void) {
  const yt = (window as Window & { YT?: YtNamespace }).YT;
  if (yt?.Player) {
    cb();
    return;
  }
  waiters.push(cb);
  const w = window as Window & { onYouTubeIframeAPIReady?: () => void };
  const prev = w.onYouTubeIframeAPIReady;
  w.onYouTubeIframeAPIReady = () => {
    prev?.();
    const queued = waiters.splice(0);
    queued.forEach(fn => fn());
  };
  if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  }
}

function isYoutube(src: string) {
  try {
    const host = new URL(src).hostname.replace(/^www\./, '');
    return host.endsWith('youtube.com') || host === 'youtube-nocookie.com';
  } catch {
    return false;
  }
}

/**
 * Provider embed that actually starts. Query-param autoplay plus YouTube
 * IFrame API `playVideo()` so the preview frame is not left sitting there.
 */
export function ProviderFrame({
  embedUrl,
  title,
  className,
  mini = false,
}: {
  embedUrl: string;
  title: string;
  className?: string;
  mini?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const iframeId = useRef(`yt-${Math.random().toString(36).slice(2, 10)}`).current;
  const src = useMemo(
    () => withEmbedPlayback(embedUrl, { muted: true, loop: mini, controls: !mini }),
    [embedUrl, mini],
  );
  const youtube = isYoutube(src);

  useEffect(() => {
    if (!youtube) return;
    const iframe = hostRef.current?.querySelector('iframe');
    if (!iframe) return;
    let dead = false;
    whenYtReady(() => {
      if (dead || !iframe.isConnected) return;
      const YT = (window as Window & { YT?: YtNamespace }).YT;
      if (!YT?.Player) return;
      try {
        playerRef.current = new YT.Player(iframe, {
          events: {
            onReady: e => {
              e.target.mute();
              e.target.playVideo();
            },
          },
        });
      } catch {
        /* query-param autoplay still on the iframe */
      }
    });
    return () => {
      dead = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* iframe already gone */
      }
      playerRef.current = null;
    };
  }, [src, youtube]);

  return (
    <div ref={hostRef} className={className}>
      <iframe
        id={iframeId}
        src={src}
        title={title}
        className="size-full border-0 bg-black"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen={!mini}
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
