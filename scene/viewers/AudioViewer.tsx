'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { DeviceFrame } from '../DeviceFrame';
import { track } from '../track';
import type { ViewerProps } from './types';

const BARS = [28, 46, 62, 40, 78, 55, 90, 48, 70, 36, 84, 52, 66, 44, 96, 58, 72, 38, 80, 50, 64, 42, 88, 54];

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * The recording plays inside a phone. The transcript stays on that screen,
 * under the controls, so it is readable without a separate panel.
 */
export default function AudioViewer({ item, sceneId }: ViewerProps) {
  const ref = useRef<HTMLAudioElement>(null);
  const [sent, setSent] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => setSent(new Set()), [item.id]);

  if (item.kind !== 'audio') return null;

  const progress = duration > 0 ? Math.min(time / duration, 1) : 0;

  const onTimeUpdate = () => {
    const el = ref.current;
    if (!el) return;
    setTime(el.currentTime);
    if (!el.duration || !isFinite(el.duration)) return;
    const pct = Math.floor((el.currentTime / el.duration) * 100);
    for (const q of [25, 50, 75, 100] as const) {
      if (pct >= q && !sent.has(q)) {
        setSent(prev => new Set(prev).add(q));
        track({ event: 'scene_media_progress', sceneId, itemId: item.id, pct: q });
      }
    }
  };

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  const seek = (clientX: number, width: number, left: number) => {
    const el = ref.current;
    if (!el || !el.duration || !isFinite(el.duration) || width <= 0) return;
    const ratio = Math.min(Math.max((clientX - left) / width, 0), 1);
    el.currentTime = ratio * el.duration;
    setTime(el.currentTime);
  };

  return (
    <div className="flex h-full items-center justify-center bg-[#07080c] p-4">
      <div className="relative h-[min(100%,620px)] max-w-full" style={{ aspectRatio: '9 / 16' }}>
        <DeviceFrame kind="phone" fill>
          <div className="absolute inset-0 flex flex-col bg-[#070b14] px-[6%] pb-[4%] pt-[5%] text-white">
            <audio
              ref={ref}
              src={item.src}
              preload="metadata"
              onTimeUpdate={onTimeUpdate}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
              onEnded={() => setPlaying(false)}
            />
            <p className="truncate text-center text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">
              Voice message
            </p>
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? 'Pause' : 'Play'}
              className="mx-auto mt-[8%] flex size-16 items-center justify-center rounded-full bg-white text-[#12151a] shadow-lg"
            >
              {playing ? <Pause className="size-7" /> : <Play className="ml-1 size-7" />}
            </button>
            <button
              type="button"
              aria-label="Seek"
              className="mt-[8%] flex h-12 w-full items-center gap-[3px]"
              onClick={e => {
                const box = e.currentTarget.getBoundingClientRect();
                seek(e.clientX, box.width, box.left);
              }}
            >
              {BARS.map((h, i) => {
                const played = (i + 1) / BARS.length <= progress + 0.001;
                return (
                  <span
                    key={i}
                    className="flex-1 rounded-full"
                    style={{
                      height: `${h}%`,
                      background: played ? '#8fd0ff' : 'rgba(255,255,255,0.22)',
                    }}
                  />
                );
              })}
            </button>
            <div className="mt-2 flex justify-between text-[11px] tabular-nums text-white/55">
              <span>{clock(time)}</span>
              <span>{clock(duration)}</span>
            </div>
            <div className="mt-4 min-h-0 flex-1 overflow-auto border-t border-white/10 pt-3">
              {item.transcript ? (
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white/80">
                  {item.transcript}
                </p>
              ) : (
                <p className="text-[13px] text-white/45">No transcript supplied for this recording.</p>
              )}
            </div>
          </div>
        </DeviceFrame>
      </div>
    </div>
  );
}
