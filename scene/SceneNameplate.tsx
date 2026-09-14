'use client';

import type { CSSProperties } from 'react';

import { cn } from 'components/ui/utils';
import type { SceneConfig } from './types';

/**
 * The engraved desk nameplate.
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
    <div
      style={style}
      className={cn(
        'pointer-events-none flex flex-col items-center justify-center',
        'rounded-sm px-2 text-center',
      )}
    >
      {prefix && (
        <span className="text-[0.55vw] font-medium uppercase tracking-[0.18em] text-white/55 sm:text-[0.6vw]">
          {prefix}
        </span>
      )}
      <span className="mt-[0.3em] text-[0.95vw] font-semibold leading-tight text-white/90 drop-shadow-sm">
        {line}
      </span>
    </div>
  );
}
