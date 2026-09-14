'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { layoutFor } from './layouts/registry';
import { SceneBanner } from './SceneBanner';
import { SceneBreadcrumb } from './SceneBreadcrumb';
import { SceneItemButton } from './SceneItemButton';
import { SceneMobileList } from './SceneMobileList';
import { SceneModal } from './SceneModal';
import { SceneNameplate } from './SceneNameplate';
import { setRecipientId, track } from './track';
import type { ResolvedItem, SceneConfig, SiteKey, TrailNode } from './types';
import { SceneContext } from './useSceneItem';
import { opensModal } from './viewers/registry';

/**
 * The scene shell.
 *
 * Owns three things and delegates everything else:
 *  - which item is open (and keeping `?open=` in sync so a document is
 *    shareable and the back button closes it)
 *  - the recipient token, read once from `?r=` after first paint so the page
 *    itself stays static and cacheable
 *  - handing the active layout strategy the job of positioning items
 */

const BRAND_ACCENT: Record<SiteKey, string> = {
  asat: '#FCBC3A',
  aspire: '#2FA8E0',
};

interface Props {
  config: SceneConfig;
  site: SiteKey;
  items: ResolvedItem[];
  links?: Record<string, string>;
  trail?: TrailNode[];
}

export function Scene({ config, site, items, links = {}, trail = [] }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showOutlines, setShowOutlines] = useState(false);
  const [setupId, setSetupId] = useState<string | null>(null);

  const strategy = layoutFor(config.layout);

  const activeItem = useMemo(
    () => items.find(i => i.id === activeId) ?? null,
    [items, activeId],
  );

  /**
   * Read URL state once on mount rather than via `useSearchParams`, which
   * would opt the whole route out of static rendering. History is updated
   * with replaceState for the same reason.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSetupId(params.get('setup')?.trim() || null);

    const recipient = params.get('r');
    if (recipient) setRecipientId(recipient);

    if (process.env.NODE_ENV !== 'production' && params.get('edit') === '1') {
      setShowOutlines(true);
    }

    const requested = params.get('open') ?? config.autoOpen ?? null;
    if (requested && items.some(i => i.id === requested && opensModal(i.kind))) {
      setActiveId(requested);
    }

    track({
      event: 'scene_view',
      sceneId: config.id,
      site,
      preset: config.preset,
    });
    // Mount only — this is initial URL state, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Keep `?open=` in the URL so a specific document can be shared. */
  const syncUrl = useCallback((itemId: string | null) => {
    const url = new URL(window.location.href);
    if (itemId) url.searchParams.set('open', itemId);
    else url.searchParams.delete('open');
    window.history.replaceState(null, '', url.toString());
  }, []);

  const open = useCallback(
    (itemId: string) => {
      setActiveId(itemId);
      syncUrl(itemId);
    },
    [syncUrl],
  );

  const close = useCallback(() => {
    setActiveId(null);
    syncUrl(null);
  }, [syncUrl]);

  /**
   * Scene links target an immutable id; the URL is resolved per brand here.
   * That is what lets one scene graph serve two domains with different slugs.
   */
  const hrefForScene = useCallback(
    (sceneId: string) => {
      const slug = links[sceneId];
      if (!slug) return null;
      return setupId
        ? `/${slug}?setup=${encodeURIComponent(setupId)}`
        : `/${slug}`;
    },
    [links, setupId],
  );

  const value = useMemo(
    () => ({
      config,
      site,
      items,
      trail,
      activeItem,
      open,
      close,
      hrefForScene,
    }),
    [config, site, items, trail, activeItem, open, close, hrefForScene],
  );

  const { Stage } = strategy;

  return (
    <SceneContext.Provider value={value}>
      <div
        data-brand={site}
        style={{ ['--brand-accent' as string]: BRAND_ACCENT[site] }}
      >
        <SceneBanner config={config} />
        <SceneBreadcrumb />

        {/* Desktop / tablet: the scene itself. */}
        <div className="hidden px-4 py-6 md:block">
          <div className="mx-auto w-full max-w-[1400px]">
            <Stage config={config}>
              {/* Only when the artwork leaves room for it — see stage.nameplate. */}
              {config.stage.nameplate && (
                <SceneNameplate
                  config={config}
                  style={strategy.position(config.stage.nameplate)}
                />
              )}
              {items.map(item => (
                <SceneItemButton
                  key={item.id}
                  item={item}
                  style={strategy.position(item.placement)}
                  showOutlines={showOutlines}
                />
              ))}
            </Stage>
          </div>
        </div>

        {/* Under md: the same items as a card list. */}
        {strategy.needsMobileList && <SceneMobileList />}

        <SceneModal />
      </div>
    </SceneContext.Provider>
  );
}
