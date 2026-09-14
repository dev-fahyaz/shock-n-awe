'use client';

import { useState } from 'react';

import { cn } from 'components/ui/utils';
import type { ViewerProps } from './types';

/**
 * A single image, click to toggle fit/fill.
 *
 * Uses a plain <img> rather than next/image: the source is dynamic and may
 * come from a host that is not in `remotePatterns`, which would make the
 * optimiser throw at request time. A campaign asset failing to render is
 * worse than an unoptimised one.
 */
export default function ImageViewer({ item }: ViewerProps) {
  const [zoomed, setZoomed] = useState(false);
  if (item.kind !== 'image') return null;

  return (
    <button
      type="button"
      onClick={() => setZoomed(z => !z)}
      aria-label={zoomed ? 'Fit image to screen' : 'Zoom image'}
      className={cn(
        'flex size-full items-center justify-center bg-black/40 p-4',
        zoomed ? 'cursor-zoom-out overflow-auto' : 'cursor-zoom-in',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.src}
        alt={item.alt ?? item.label}
        className={cn(
          'rounded shadow-2xl',
          zoomed ? 'max-w-none' : 'max-h-full max-w-full object-contain',
        )}
      />
    </button>
  );
}
