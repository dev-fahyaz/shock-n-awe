import type { SceneConfig } from '../types';

const SECRET_KEY = 'scene-setup-secret';

function headers(): HeadersInit {
  const secret =
    typeof window === 'undefined' ? '' : sessionStorage.getItem(SECRET_KEY) ?? '';
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (secret) h['x-scene-secret'] = secret;
  return h;
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
