'use client';

import { useEffect, useState } from 'react';

import { cn } from 'components/ui/utils';

/**
 * WordPress mShots URL. Shared by the embed modal and desk hotspot so width
 * is the only thing that differs.
 */
export function shotUrl(href: string, width = 1400, bust?: number) {
  const abs =
    href.startsWith('/') && !href.startsWith('//') && typeof window !== 'undefined'
      ? `${window.location.origin}${href}`
      : href;
  const q = bust ? `&r=${bust}` : '';
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(abs)}?w=${width}${q}`;
}

export function WebsiteShot({
  href,
  label,
  width = 1400,
  className,
}: {
  href: string;
  label: string;
  width?: number;
  className?: string;
}) {
  const [bust, setBust] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    setBust(0);
  }, [href, width]);

  if (failed) {
    return (
      <div
        className={cn(
          'flex size-full items-center justify-center bg-neutral-900 p-8 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        Preview is not available. Use Open full page.
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={shotUrl(href, width, bust || undefined)}
      alt={label}
      className={cn('size-full object-cover object-top', className)}
      onLoad={e => {
        const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
        // mShots serves a 400×300 (or tiny) placeholder until the capture is ready.
        if ((w < 50 || (w === 400 && h === 300)) && bust < 8) {
          window.setTimeout(() => setBust(n => n + 1), 2000);
        }
      }}
      onError={() => {
        if (bust < 3) setBust(n => n + 1);
        else setFailed(true);
      }}
    />
  );
}
