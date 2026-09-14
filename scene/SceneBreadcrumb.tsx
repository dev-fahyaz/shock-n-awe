'use client';

import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { setupReturnId } from './setupReturn';
import { useScene } from './useSceneItem';

function sceneHref(slug: string, setupId: string | null) {
  return setupId ? `/${slug}?setup=${encodeURIComponent(setupId)}` : `/${slug}`;
}

/**
 * Persistent exit. Back returns to Setup when the scene was opened from the
 * editor (`?setup=`), otherwise to the scene index. Parent crumbs and Up
 * appear only when this scene sits under another.
 */
export function SceneBreadcrumb() {
  const { trail } = useScene();
  const nested = trail.length >= 2;
  const parent = nested ? trail[trail.length - 2] : null;
  const [setupId, setSetupId] = useState<string | null>(null);

  useEffect(() => {
    setSetupId(setupReturnId());
  }, []);

  const backHref = setupId ? `/setup/${encodeURIComponent(setupId)}` : '/';

  return (
    <nav
      aria-label="Scene"
      className="flex items-center justify-between gap-3 border-b border-white/8 bg-white/[0.03] px-4 py-2 backdrop-blur-md"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/80 transition hover:border-white/25 hover:text-white"
        >
          <ChevronLeft className="size-3" />
          Back
        </Link>
        {nested && (
          <ol className="flex min-w-0 items-center gap-1 text-xs text-white/60">
            {trail.map((node, i) => {
              const last = i === trail.length - 1;
              return (
                <li key={node.id} className="flex min-w-0 items-center gap-1">
                  {i > 0 && <ChevronRight className="size-3 shrink-0 opacity-50" />}
                  {last ? (
                    <span className="truncate font-medium text-white/85">{node.label}</span>
                  ) : (
                    <Link
                      href={sceneHref(node.slug, setupId)}
                      className="truncate transition hover:text-white"
                    >
                      {node.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {parent && (
        <Link
          href={sceneHref(parent.slug, setupId)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/70 transition hover:border-white/25 hover:text-white"
        >
          <ChevronUp className="size-3" />
          Up
        </Link>
      )}
    </nav>
  );
}
