'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from 'components/ui/utils';
import { track } from '../track';
import type { ViewerProps } from './types';

/**
 * Rendered page images with a thumbnail rail.
 *
 * The middle ground between `pdf` (searchable, zero prep) and `flipbook`
 * (impressive, expensive): faithful to the original design, mobile-friendly,
 * and no page-turn library. Use it for design-heavy brochures and handbooks.
 *
 * Pages load lazily. The rail is the navigation on desktop; on mobile the
 * pages simply scroll.
 */
export default function PagesViewer({ item, sceneId }: ViewerProps) {
  const [current, setCurrent] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const pages = item.kind === 'pages' ? item.pages : [];

  const goTo = useCallback(
    (i: number) => {
      pageRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrent(i);
      track({ event: 'scene_page_turn', sceneId, itemId: item.id, page: i + 1 });
    },
    [item.id, sceneId],
  );

  // Track which page is in view so the rail highlight follows the scroll.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idx = Number((visible.target as HTMLElement).dataset.page);
          if (!Number.isNaN(idx)) setCurrent(idx);
        }
      },
      { root, threshold: [0.4, 0.8] },
    );
    pageRefs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [pages.length]);

  if (item.kind !== 'pages') return null;

  return (
    <div className="flex h-full">
      {/* Thumbnail rail */}
      <nav
        aria-label="Pages"
        className="hidden w-28 shrink-0 overflow-y-auto border-r bg-background/50 p-2 md:block"
      >
        {pages.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-current={current === i ? 'true' : undefined}
            className={cn(
              'mb-2 block w-full overflow-hidden rounded border-2 transition',
              current === i
                ? 'border-[var(--brand-accent)]'
                : 'border-transparent hover:border-muted-foreground/40',
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.thumb ?? p.src}
              alt=""
              loading="lazy"
              className="w-full"
            />
            <span className="block py-1 text-[10px] text-muted-foreground">
              {i + 1}
            </span>
          </button>
        ))}
      </nav>

      {/* Pages */}
      <div ref={scroller} className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {pages.map((p, i) => (
            <div
              key={i}
              data-page={i}
              ref={el => {
                pageRefs.current[i] = el;
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt={p.alt ?? `${item.label}, page ${i + 1}`}
                width={p.width}
                height={p.height}
                loading={i < 2 ? 'eager' : 'lazy'}
                className="w-full rounded shadow-lg"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
