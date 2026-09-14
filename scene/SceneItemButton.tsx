'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { CSSProperties, ReactNode } from 'react';

import { cn } from 'components/ui/utils';
import { resolveAction } from './actions';
import { track } from './track';
import type { ResolvedItem } from './types';
import { KIND_LABEL, useScene } from './useSceneItem';

const HotspotPreview = dynamic(
  () => import('./HotspotPreview').then(m => ({ default: m.HotspotPreview })),
  { ssr: false, loading: () => <span className="scene-hotspot" /> },
);

/**
 * One hotspot. Real <button> or <a> — never an image-map <area>.
 */

const WRAP = cn(
  'group block cursor-pointer rounded-md outline-none',
  'focus-visible:outline-none',
);

interface Props {
  item: ResolvedItem;
  style: CSSProperties;
  showOutlines?: boolean;
}

function Face({ item, showOutlines }: { item: ResolvedItem; showOutlines?: boolean }) {
  return (
    <>
      <HotspotPreview item={item} showOutlines={showOutlines} />
      <span className="scene-hotspot-label">{item.hint ?? item.label}</span>
    </>
  );
}

export function SceneItemButton({ item, style, showOutlines }: Props) {
  const { config, open, hrefForScene } = useScene();

  const action = resolveAction(item, hrefForScene);
  const label = `${item.label}, ${KIND_LABEL[item.kind]}`;
  const mergedStyle = {
    ...style,
    ...(item.kind === 'scene'
      ? { viewTransitionName: `scene-${item.targetId}` }
      : {}),
  } as CSSProperties;

  const wrap = (node: ReactNode) => (
    <>
      <Face item={item} showOutlines={showOutlines} />
      <span className="sr-only">{node}</span>
    </>
  );

  if (action.type === 'navigate') {
    const external = !action.internal;
    return (
      <Link
        href={action.href}
        target={action.target}
        rel={action.target === '_blank' ? 'noopener noreferrer' : undefined}
        prefetch={action.internal ? undefined : false}
        aria-label={
          external && action.target === '_blank'
            ? `${label}, opens in a new tab`
            : label
        }
        title={item.hint}
        style={mergedStyle}
        className={WRAP}
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
        {wrap(label)}
      </Link>
    );
  }

  if (action.type === 'download') {
    return (
      <a
        href={action.href}
        download={action.filename}
        aria-label={label}
        title={item.hint}
        style={mergedStyle}
        className={WRAP}
        onClick={() =>
          track({ event: 'scene_download', sceneId: config.id, itemId: item.id })
        }
      >
        {wrap(label)}
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      title={item.hint}
      style={mergedStyle}
      className={WRAP}
      onClick={() => open(item.id)}
    >
      {wrap(label)}
    </button>
  );
}
