import type { SceneConfig, SceneRoute, SiteKey } from '../types';

const SECRET_KEY = 'scene-setup-secret';

function secretHeader(): Record<string, string> {
  const secret =
    typeof window === 'undefined' ? '' : sessionStorage.getItem(SECRET_KEY) ?? '';
  return secret ? { 'x-scene-secret': secret } : {};
}

function headers(): HeadersInit {
  return { 'content-type': 'application/json', ...secretHeader() };
}

export function rememberSetupSecret(secret: string) {
  if (secret) sessionStorage.setItem(SECRET_KEY, secret);
  else sessionStorage.removeItem(SECRET_KEY);
}

async function parse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(body.error || res.statusText);
  }
  return body;
}

export async function listScenes(): Promise<SceneConfig[]> {
  const res = await fetch('/api/scene/setup', { headers: headers(), cache: 'no-store' });
  const body = await parse<{ scenes: SceneConfig[] }>(res);
  return body.scenes;
}

export async function createScene(): Promise<SceneConfig> {
  const res = await fetch('/api/scene/setup', {
    method: 'POST',
    headers: headers(),
    body: '{}',
  });
  const body = await parse<{ scene: SceneConfig }>(res);
  return body.scene;
}

export async function saveScene(scene: SceneConfig): Promise<SceneConfig> {
  const res = await fetch('/api/scene/setup', {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(scene),
  });
  const body = await parse<{ scene: SceneConfig }>(res);
  return body.scene;
}

export async function deleteScene(id: string): Promise<void> {
  const res = await fetch(`/api/scene/setup?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  await parse(res);
}

export async function uploadSceneMedia(
  sceneId: string,
  kind: 'image' | 'pdf',
  file: File,
): Promise<{ url: string; id: string }> {
  const body = new FormData();
  body.set('sceneId', sceneId);
  body.set('kind', kind);
  body.set('file', file);
  const res = await fetch('/api/scene/media', {
    method: 'POST',
    headers: secretHeader(),
    body,
  });
  return parse<{ url: string; id: string }>(res);
}

export async function purgeUnusedMedia(): Promise<{ media: number; files: number }> {
  const res = await fetch('/api/scene/media/purge', {
    method: 'POST',
    headers: headers(),
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
