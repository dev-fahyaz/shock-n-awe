'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { track } from './track';
import type { SceneConfig } from './types';

/**
 * Sticky conversion strip.
 *
 * Present on every scene, root or nested. However deep a visitor wanders into
 * the scene graph, they stay one click from the conversion path.
 */
export function SceneBanner({ config }: { config: SceneConfig }) {
  if (!config.banner) return null;
  const { text, cta } = config.banner;

  return (
    <div className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0b1020]/70 text-white backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
        <span className="text-white/85">{text}</span>
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-accent)]/15 px-2.5 py-0.5 font-semibold text-[var(--brand-accent)] transition hover:bg-[var(--brand-accent)]/25"
          onClick={() =>
            track({
              event: 'scene_cta_click',
              sceneId: config.id,
              href: cta.href,
            })
          }
        >
          {cta.label}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
