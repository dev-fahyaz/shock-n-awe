import { createClient } from '@supabase/supabase-js';

import type { SiteKey } from '../types';

/**
 * Fetch helper for SAT and Aspire Next.js hosts.
 *
 * Server-only. Uses the project URL + service role key — same pair as Setup.
 * A new live route is visible on the next request (after a short cache).
 *
 *   const post = await getLiveRoute('asat', slug);
 *   if (!post) return next(); // not a scene
 *   // iframe or proxy post.href — config and media[] are on the post
 */

export type SceneMedia = {
  id: string;
  kind: 'image' | 'pdf';
  path: string;
  mime?: string | null;
  bytes?: number | null;
  label?: string | null;
};

export type LivePost = {
  sceneId: string;
  site: SiteKey;
  slug: string;
  subdomain?: string;
  href: string;
  config: unknown;
  media: SceneMedia[];
};

/** @deprecated Use LivePost — same shape, includes config + media. */
export type LiveRoute = LivePost;

export type HostConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  engineUrl: string;
};

const CACHE_MS = 45_000;
const cache = new Map<string, { at: number; posts: LivePost[] }>();

function configFromEnv(): HostConfig | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const engineUrl = (
    process.env.SCENE_ENGINE_URL ??
    process.env.NEXT_PUBLIC_SCENE_ENGINE_URL ??
    ''
  ).replace(/\/$/, '');
  if (!engineUrl) return null;
  return { supabaseUrl, serviceRoleKey, engineUrl };
}

function href(engineUrl: string, slug: string) {
  return `${engineUrl.replace(/\/$/, '')}/${slug}`;
}

function supabase(cfg: HostConfig) {
  return createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type RpcPost = {
  scene_id?: string;
  site?: SiteKey;
  slug?: string;
  subdomain?: string | null;
  config?: unknown;
  media?: SceneMedia[] | null;
};

function asPost(row: RpcPost, engineUrl: string, site: SiteKey): LivePost | null {
  const slug = row.slug;
  if (!slug) return null;
  return {
    sceneId: row.scene_id ?? slug,
    site: row.site ?? site,
    slug,
    subdomain: row.subdomain || undefined,
    href: href(engineUrl, slug),
    config: row.config ?? null,
    media: row.media ?? [],
  };
}

async function fromSupabase(
  cfg: HostConfig,
  site: SiteKey,
  slug?: string,
): Promise<LivePost[] | LivePost | null> {
  if (!cfg.supabaseUrl || !cfg.serviceRoleKey) return null;
  const { data, error } = await supabase(cfg).rpc('get_live_post', {
    p_site: site,
    p_slug: slug ?? null,
  });
  if (error) return null;
  const body = data as RpcPost | RpcPost[] | null;
  if (slug) {
    if (!body || Array.isArray(body)) return null;
    return asPost(body, cfg.engineUrl, site);
  }
  const rows = Array.isArray(body) ? body : body ? [body] : [];
  return rows
    .map(row => asPost(row, cfg.engineUrl, site))
    .filter((p): p is LivePost => Boolean(p));
}

async function fromEngine(cfg: HostConfig, site: SiteKey): Promise<LivePost[]> {
  const res = await fetch(
    `${cfg.engineUrl}/api/scene/navigate?site=${encodeURIComponent(site)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) return [];
  const body = (await res.json()) as {
    routes?: { site: SiteKey; slug: string; subdomain?: string }[];
  };
  return (body.routes ?? [])
    .filter(r => r.site === site)
    .map(r => ({
      sceneId: r.slug,
      site: r.site,
      slug: r.slug,
      subdomain: r.subdomain,
      href: href(cfg.engineUrl, r.slug),
      config: null,
      media: [],
    }));
}

async function load(site: SiteKey, cfg?: HostConfig): Promise<LivePost[]> {
  const resolved = cfg ?? configFromEnv();
  if (!resolved) return [];
  const hit = cache.get(site);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.posts;
  const listed = await fromSupabase(resolved, site);
  const posts = Array.isArray(listed)
    ? listed
    : listed
      ? [listed]
      : await fromEngine(resolved, site);
  cache.set(site, { at: Date.now(), posts });
  return posts;
}

export async function listLiveRoutes(
  site: SiteKey,
  cfg?: HostConfig,
): Promise<LivePost[]> {
  return load(site, cfg);
}

export async function getLiveRoute(
  site: SiteKey,
  slug: string,
  cfg?: HostConfig,
): Promise<LivePost | null> {
  const resolved = cfg ?? configFromEnv();
  if (resolved?.supabaseUrl && resolved.serviceRoleKey) {
    const hit = cache.get(site);
    const cached = hit && Date.now() - hit.at < CACHE_MS
      ? hit.posts.find(p => p.slug === slug)
      : undefined;
    if (cached) return cached;
    const post = await fromSupabase(resolved, site, slug);
    if (post && !Array.isArray(post)) return post;
  }
  const posts = await load(site, cfg);
  return posts.find(r => r.slug === slug) ?? null;
}
