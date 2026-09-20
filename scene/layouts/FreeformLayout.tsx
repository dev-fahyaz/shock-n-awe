'use client';

import type { CSSProperties } from 'react';

import { cn } from 'components/ui/utils';
import type { Placement } from '../types';
import type { LayoutStrategy, StageProps } from './types';

/**
 * Freeform: absolutely-positioned percentage hotspots over a background image.
 *
 * Percentages rather than pixels is the whole point. The reference
 * implementation uses an HTML <area> image map locked to a 1240px background,
 * which is why it is desktop-only and scrolls sideways on a laptop. A
 * percentage inside an aspect-ratio box scales to any viewport and keeps every
 * hotspot glued to its prop.
 */

function FreeformStage({ config, children }: StageProps) {
  const bg = config.stage.background;

  if (!bg) {
    return (
      <div className="scene-stage relative w-full" style={{ aspectRatio: '12 / 7' }}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'scene-stage relative w-full select-none overflow-hidden rounded-2xl',
        'bg-[#1b1410]',
      )}
      style={{
        aspectRatio: `${bg.width} / ${bg.height}`,
        viewTransitionName: `scene-${config.id}`,
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.06), 0 40px 80px -24px rgba(0,0,0,0.65), 0 0 80px -20px color-mix(in srgb, var(--brand-accent) 28%, transparent)',
      } as CSSProperties}
    >
      {/* Plain img: stage art is a Supabase (or other) URL. next/image 500s
          in production unless every host is listed at build time. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bg.src}
        alt={bg.alt}
        className="pointer-events-none absolute inset-0 size-full object-cover"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/35"
      />
      {children}
    </div>
  );
}

function position(placement: Placement): CSSProperties {
  if (placement.layout !== 'freeform') return {};

  return {
    position: 'absolute',
    left: `${placement.x}%`,
    top: `${placement.y}%`,
    width: `${placement.w}%`,
    height: `${placement.h}%`,
    transform: placement.rotate ? `rotate(${placement.rotate}deg)` : undefined,
    borderRadius: placement.shape === 'ellipse' ? '50%' : undefined,
  };
}

export const FreeformLayout: LayoutStrategy = {
  Stage: FreeformStage,
  position,
  needsMobileList: true,
};
