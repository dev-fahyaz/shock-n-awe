'use client';

import type { CSSProperties } from 'react';

import { cn } from 'components/ui/utils';
import type { SceneConfig } from './types';

/**
 * The clear desk plaque.
 *
 * Audience-level personalisation, baked at build time. Recipient-level
 * personalisation ("Customized for Sarah at Northbridge") is layered on top
 * client-side after first paint, which is what keeps the page cacheable.
 */
interface Props {
  config: SceneConfig;
  style: CSSProperties;
  /** Resolved from the `?r=` token, when present. */
  recipientName?: string;
}

export function SceneNameplate({ config, style, recipientName }: Props) {
  const { prefix, nameplate } = config.audience;
  const line = recipientName ?? nameplate;

  return (
    <div style={style} className="pointer-events-none">
      <div
        className={cn(
          'flex size-full flex-col items-center justify-center rounded-md px-2 text-center',
          'border border-white/30 bg-white/10',
          'shadow-[0_10px_18px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.5)]',
          'backdrop-blur-[2px]',
        )}
      >
        {prefix && (
          <span className="text-[0.55vw] font-medium uppercase tracking-[0.18em] text-white/75 sm:text-[0.6vw]">
            {prefix}
          </span>
        )}
        <span className="mt-[0.3em] text-[0.95vw] font-semibold leading-tight text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
          {line}
        </span>
      </div>
    </div>
  );
}
