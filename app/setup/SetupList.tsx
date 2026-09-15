'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from 'components/ui/Button';
import { cn } from 'components/ui/utils';
import {
  brandShort,
  createScene,
  deleteScene,
  purgeUnusedMedia,
  rememberSetupSecret,
  saveScene,
  sceneUrl,
  withBrandRoute,
  type BrandInfo,
} from 'scene/setup/client';
import type { SceneConfig, SiteKey } from 'scene/types';

export function SetupList({
  scenes,
  brands,
}: {
  scenes: SceneConfig[];
  brands: BrandInfo[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function add() {
    setError(null);
    setNote(null);
    setBusy('create');
    try {
      const scene = await createScene();
      router.push(`/setup/${scene.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'create failed');
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this scene?')) return;
    setError(null);
    setBusy(id);
    try {
      await deleteScene(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'delete failed');
    } finally {
      setBusy(null);
    }
  }

  async function purge() {
    if (
      !confirm(
        'Remove unused files? Images and PDFs that no scene still points at will be deleted from Storage.',
      )
    ) {
      return;
    }
    setError(null);
    setNote(null);
    setBusy('purge');
    try {
      const result = await purgeUnusedMedia();
      setNote(
        `Removed ${result.media} unused record(s) and ${result.files} file(s).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'purge failed');
    } finally {
      setBusy(null);
    }
  }

  async function toggle(scene: SceneConfig, site: SiteKey) {
    const on = !scene.routes.some(r => r.site === site);
    setError(null);
    setBusy(`${scene.id}:${site}`);
    try {
      await saveScene(withBrandRoute(scene, site, on));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'save failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8">
      <ul className="space-y-2">
        {scenes.length === 0 && (
          <li className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No scenes yet. Add one, then assign it to SAT and/or Aspire.
          </li>
        )}
        {scenes.map(scene => (
          <li
            key={scene.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"
          >
            <Link href={`/setup/${scene.id}`} className="min-w-0 flex-1">
              <span className="block font-medium">{scene.audience.nameplate}</span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {brands
                  .map(b => {
                    const route = scene.routes.find(r => r.site === b.key);
                    return route ? sceneUrl(b, route.slug, route.subdomain) : null;
                  })
                  .filter(Boolean)
                  .join(' · ') || scene.id}
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              {brands.map(brand => {
                const route = scene.routes.find(r => r.site === brand.key);
                const label = brandShort(brand.key);
                const state = route?.status ?? 'off';
                return (
                  <button
                    key={brand.key}
                    type="button"
                    disabled={busy === `${scene.id}:${brand.key}`}
                    onClick={() => toggle(scene, brand.key)}
                    title={
                      route
                        ? `Remove from ${brand.name}`
                        : `Assign to ${brand.name}`
                    }
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                      state === 'live' &&
                        'border-[var(--brand-accent)] bg-[var(--brand-accent)]/15 text-foreground',
                      state === 'draft' && 'border-white/20 bg-white/5 text-muted-foreground',
                      state === 'archived' && 'border-white/10 text-muted-foreground',
                      state === 'off' && 'border-dashed border-white/20 text-muted-foreground',
                    )}
                  >
                    {label} {state}
                  </button>
                );
              })}
            </div>
            {scene.routes[0] && (
              <Link
                href={`/${scene.routes[0].slug}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={busy === scene.id}
              onClick={() => remove(scene.id)}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {note && <p className="mt-4 text-sm text-muted-foreground">{note}</p>}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={add} disabled={busy === 'create'}>
            Add scene
          </Button>
          <Button
            variant="outline"
            onClick={purge}
            disabled={busy === 'purge'}
          >
            {busy === 'purge' ? 'Removing…' : 'Remove unused files'}
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Setup secret
          <input
            type="password"
            autoComplete="off"
            placeholder="optional"
            className="h-8 w-48 rounded-md border bg-background px-2"
            onChange={e => rememberSetupSecret(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
