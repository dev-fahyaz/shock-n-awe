'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from 'components/ui/Button';
import {
  createScene,
  deleteScene,
  rememberSetupSecret,
  sceneUrl,
  type BrandInfo,
} from 'scene/setup/client';
import type { SceneConfig } from 'scene/types';

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

  async function add() {
    setError(null);
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

  return (
    <div className="mt-8">
      <label className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        Setup secret
        <input
          type="password"
          autoComplete="off"
          placeholder="optional"
          className="h-8 w-48 rounded-md border bg-background px-2"
          onChange={e => rememberSetupSecret(e.target.value)}
        />
      </label>

      <ul className="space-y-2">
        {scenes.length === 0 && (
          <li className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No scenes yet.
          </li>
        )}
        {scenes.map(scene => {
          const route = scene.routes[0];
          const brand = brands.find(b => b.key === route?.site) ?? brands[0];
          return (
            <li
              key={scene.id}
              className="flex items-center gap-3 rounded-xl border bg-card p-4"
            >
              <Link href={`/setup/${scene.id}`} className="min-w-0 flex-1">
                <span className="block font-medium">{scene.audience.nameplate}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {route && brand
                    ? sceneUrl(brand, route.slug)
                    : scene.id}
                  {' · '}
                  {route?.status ?? 'draft'}
                </span>
              </Link>
              {route && (
                <Link
                  href={`/${route.slug}`}
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
          );
        })}
      </ul>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <Button className="mt-6" onClick={add} disabled={busy === 'create'}>
        Add scene
      </Button>
    </div>
  );
}
