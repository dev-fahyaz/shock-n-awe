import type { SceneConfig, SceneRoute, SiteKey } from '../types';

function jsonHeaders(): HeadersInit {
  return { 'content-type': 'application/json' };
}

async function parse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(body.error || res.statusText);
  }
  return body;
}

export async function listScenes(): Promise<SceneConfig[]> {
  const res = await fetch('/api/scene/setup', { headers: jsonHeaders(), cache: 'no-store' });
  const body = await parse<{ scenes: SceneConfig[] }>(res);
  return body.scenes;
}

export async function createScene(): Promise<SceneConfig> {
  const res = await fetch('/api/scene/setup', {
    method: 'POST',
    headers: jsonHeaders(),
    body: '{}',
  });
  const body = await parse<{ scene: SceneConfig }>(res);
  return body.scene;
}

export async function saveScene(scene: SceneConfig): Promise<SceneConfig> {
  const res = await fetch('/api/scene/setup', {
    method: 'PUT',
    headers: jsonHeaders(),
    body: JSON.stringify(scene),
  });
  const body = await parse<{ scene: SceneConfig }>(res);
  return body.scene;
}

export async function deleteScene(id: string): Promise<void> {
  const res = await fetch(`/api/scene/setup?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: jsonHeaders(),
  });
  await parse(res);
}

export async function uploadSceneMedia(
  sceneId: string,
  kind: 'image' | 'pdf' | 'video' | 'audio',
  file: File,
): Promise<{ url: string; id: string }> {
  const body = new FormData();
  body.set('sceneId', sceneId);
  body.set('kind', kind);
  body.set('file', file);
  const res = await fetch('/api/scene/media', {
    method: 'POST',
    body,
  });
  return parse<{ url: string; id: string }>(res);
}

export async function purgeUnusedMedia(): Promise<{ media: number; files: number }> {
  const res = await fetch('/api/scene/media/purge', {
    method: 'POST',
    headers: jsonHeaders(),
    body: '{}',
  });
  return parse<{ media: number; files: number }>(res);
}

export type BrandInfo = {
  key: 'asat' | 'aspire';
  name: string;
  url: string;
  apex: string;
};

/** Campaign URL. Routing is still `/{slug}`; subdomain is the wildcard host label. */
export function sceneUrl(brand: BrandInfo, slug: string, subdomain?: string): string {
  if (subdomain) return `https://${subdomain}.${brand.apex}/${slug}`;
  return `${brand.url.replace(/\/$/, '')}/${slug}`;
}

export function brandShort(site: SiteKey): string {
  return site === 'asat' ? 'SAT' : 'Aspire';
}

function ensureCanonical(routes: SceneRoute[]): SceneRoute[] {
  const marked = routes.filter(r => r.canonical);
  if (marked.length === 1) return routes;
  const preferred =
    marked.find(r => r.site === 'asat') ??
    routes.find(r => r.site === 'asat') ??
    routes[0];
  if (!preferred) return routes;
  return routes.map(r => ({ ...r, canonical: r.site === preferred.site }));
}

/** Add or drop a brand route. Never removes the last remaining route. */
export function withBrandRoute(scene: SceneConfig, site: SiteKey, on: boolean): SceneConfig {
  const existing = scene.routes.find(r => r.site === site);
  if (on) {
    if (existing) return scene;
    const donor = scene.routes[0];
    if (!donor) return scene;
    const added: SceneRoute = {
      site,
      slug: donor.slug,
      status: donor.status,
      subdomain: donor.subdomain,
      indexable: site === 'aspire' ? false : donor.indexable,
    };
    return { ...scene, routes: ensureCanonical([...scene.routes, added]) };
  }
  if (!existing || scene.routes.length <= 1) return scene;
  return { ...scene, routes: ensureCanonical(scene.routes.filter(r => r.site !== site)) };
}

export function urlFoldTitle(scene: SceneConfig, brands: BrandInfo[]): string {
  const bits = brands.map(b => {
    const route = scene.routes.find(r => r.site === b.key);
    const name = brandShort(b.key);
    return route ? `${name} ${route.status}` : `${name} off`;
  });
  return `URL · ${bits.join(' · ')}`;
}
