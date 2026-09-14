'use client';

import {
  ArrowRight,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  IdCard,
  Layers,
  ImageIcon,
  Mail,
  Monitor,
  Sparkles,
  PlaySquare,
  SquarePen,
} from 'lucide-react';
import Link from 'next/link';
import type { ComponentType } from 'react';

import { resolveAction } from './actions';
import { useHrefSize } from './fileSize';
import { track } from './track';
import type { ResolvedItem, SceneItemKind } from './types';
import { KIND_LABEL, useScene } from './useSceneItem';

/**
 * The mobile presentation of a freeform scene.
 *
 * NOT a degraded fallback. A desk scaled to a 390px phone gives you 20px tap
 * targets stacked on top of each other; for most visitors arriving from
 * LinkedIn or email, this list IS the experience. Same items, same viewers,
 * same analytics — and the stage image is never downloaded.
 */

const ICONS: Record<SceneItemKind, ComponentType<{ className?: string }>> = {
  auto: Sparkles,
  image: ImageIcon,
  pdf: FileText,
  pages: Layers,
  flipbook: Layers,
  embed: Monitor,
  scene: ArrowRight,
  link: ExternalLink,
  download: Download,
  video: PlaySquare,
  audio: Headphones,
  card: IdCard,
  letter: Mail,
  form: SquarePen,
};

function Row({ item }: { item: ResolvedItem }) {
  const { config, open, hrefForScene } = useScene();
  const Icon = ICONS[item.kind];
  const action = resolveAction(item, hrefForScene);
  const sizeLabel = useHrefSize(item.download?.href);

  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-accent)]/12 text-[var(--brand-accent)]">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.label}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {item.hint ?? KIND_LABEL[item.kind]}
          {sizeLabel ? ` · ${sizeLabel}` : ''}
        </span>
      </span>
      {action.type === 'navigate' && !action.internal ? (
        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      )}
    </>
  );

  const className =
    'flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition active:scale-[0.99] hover:border-[var(--brand-accent)]';

  // Same decision as the desk hotspot, so a visitor on a phone gets exactly
  // the behaviour a visitor on a laptop gets.
  if (action.type === 'navigate') {
    return (
      <Link
        href={action.href}
        target={action.target}
        rel={action.target === '_blank' ? 'noopener noreferrer' : undefined}
        prefetch={action.internal ? undefined : false}
        className={className}
        onClick={() =>
          action.internal && item.kind === 'scene'
            ? track({ event: 'scene_navigate', from: config.id, to: item.targetId })
            : track({
                event: 'scene_cta_click',
                sceneId: config.id,
                href: action.href,
                itemId: item.id,
              })
        }
      >
        {body}
      </Link>
    );
  }

  if (action.type === 'download') {
    return (
      <a
        href={action.href}
        download={action.filename}
        className={className}
        onClick={() =>
          track({ event: 'scene_download', sceneId: config.id, itemId: item.id })
        }
      >
        {body}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={() => open(item.id)}>
      {body}
    </button>
  );
}

export function SceneMobileList() {
  const { config, items } = useScene();

  return (
    <div className="px-4 py-6 md:hidden">
      <header className="mb-5">
        {config.audience.prefix && (
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {config.audience.prefix}
          </p>
        )}
        <h1 className="mt-1 text-xl font-semibold leading-snug">
          {config.audience.nameplate}
        </h1>
      </header>

      <ul className="space-y-2.5">
        {items.map(item => (
          <li key={item.id}>
            <Row item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
