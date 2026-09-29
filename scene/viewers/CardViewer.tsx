'use client';

import { BusinessCard } from '../BusinessCard';
import type { ViewerProps } from './types';

/** A calling card, not a profile panel. */
export default function CardViewer({ item }: ViewerProps) {
  if (item.kind !== 'card') return null;

  return (
    <div className="flex h-full items-center justify-center bg-[#1a140f] p-8">
      <div className="aspect-[1.75/1] w-[min(640px,100%)]">
        <BusinessCard item={item} />
      </div>
    </div>
  );
}
