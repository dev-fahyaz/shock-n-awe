'use client';

import { ExternalLink } from 'lucide-react';

import { isEmbeddable, isSafeUrl } from '../schema';
import { WebsiteShot } from '../websiteShot';
import type { ViewerProps } from './types';
import { ExternalFallback } from './ExternalFallback';

/**
 * Live HTML in a sandboxed iframe only when the host actually allows framing
 * (same-origin paths, YouTube / Vimeo / Loom / Drive / forms). Marketing sites
 * send `X-Frame-Options: DENY` and Chrome reports that as "refused to connect"
 * — those get a screenshot snippet instead.
 */
const DEFAULT_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox';

function hrefOf(item: ViewerProps['item']): string | null {
  if (item.kind === 'embed') return item.src;
  if (item.kind === 'link') return item.href;
  return null;
}

export default function EmbedViewer({ item }: ViewerProps) {
  const href = hrefOf(item);
  if (!href) return null;

  if (!isSafeUrl(href)) {
    return <ExternalFallback href="/" label={item.label} reason="This URL is not safe to open." />;
  }

  const framed = isEmbeddable(href);

  return (
    <div className="relative size-full bg-black">
      {framed ? (
        <iframe
          src={href}
          title={item.label}
          className="size-full border-0 bg-white"
          loading="lazy"
          sandbox={item.kind === 'embed' ? (item.sandbox ?? DEFAULT_SANDBOX) : DEFAULT_SANDBOX}
          allow={item.kind === 'embed' ? item.allow : undefined}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <WebsiteShot href={href} label={item.label} />
      )}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-background/90 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur transition hover:bg-background"
      >
        <ExternalLink className="size-3.5" />
        Open full page
      </a>
    </div>
  );
}
