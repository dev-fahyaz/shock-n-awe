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
  const width = bg?.width ?? 12;
  const height = bg?.height ?? 7;

  return (
    <div
      className={cn(
        'scene-stage relative isolate w-full select-none overflow-hidden bg-[#1b1410]',
      )}
      style={{
        aspectRatio: `${width} / ${height}`,
        viewTransitionName: `scene-${config.id}`,
      } as CSSProperties}
    >
      {bg && (
        /* Plain img: stage art is a Supabase (or other) URL. next/image 500s
           in production unless every host is listed at build time. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={bg.src}
          alt={bg.alt}
          className="pointer-events-none absolute inset-0 size-full object-cover"
        />
      )}
      {children}
    </div>
  );
}

function position(placement: Placement, index = 0): CSSProperties {
  if (placement.layout !== 'freeform') return {};

  return {
    position: 'absolute',
    left: `${placement.x}%`,
    top: `${placement.y}%`,
    width: `${placement.w}%`,
    height: `${placement.h}%`,
    zIndex: placement.z ?? index,
    transform: placement.rotate ? `rotate(${placement.rotate}deg)` : undefined,
    borderRadius: placement.shape === 'ellipse' ? '50%' : undefined,
  };
}

export const FreeformLayout: LayoutStrategy = {
  Stage: FreeformStage,
  position,
  needsMobileList: true,
};
