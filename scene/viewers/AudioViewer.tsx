'use client';

import { useEffect, useRef, useState } from 'react';

import { track } from '../track';
import type { ViewerProps } from './types';

/**
 * Audio with its transcript visible, not hidden behind a toggle.
 *
 * An audio-only message is unusable for a deaf visitor, unusable in an open
 * office, and invisible to search. The transcript solves all three, so it is
 * rendered by default rather than tucked away.
 */
export default function AudioViewer({ item, sceneId }: ViewerProps) {
  const ref = useRef<HTMLAudioElement>(null);
  const [sent, setSent] = useState<Set<number>>(new Set());

  useEffect(() => setSent(new Set()), [item.id]);

  if (item.kind !== 'audio') return null;

  const onTimeUpdate = () => {
    const el = ref.current;
    if (!el || !el.duration || !isFinite(el.duration)) return;
    const pct = Math.floor((el.currentTime / el.duration) * 100);
    for (const q of [25, 50, 75, 100] as const) {
      if (pct >= q && !sent.has(q)) {
        setSent(prev => new Set(prev).add(q));
        track({ event: 'scene_media_progress', sceneId, itemId: item.id, pct: q });
      }
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-6 p-8">
      <audio
        ref={ref}
        src={item.src}
        controls
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        className="w-full"
      />

      {item.transcript ? (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Transcript
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {item.transcript}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No transcript supplied for this recording.
        </p>
      )}
    </div>
  );
}
