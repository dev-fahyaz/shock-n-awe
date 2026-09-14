import { NextResponse } from 'next/server';

import { currentSiteKey } from 'scene/sites';
import { resolveNavigation } from 'scene/source/navigate';
import { sceneSource } from 'scene/source';
import type { SiteKey } from 'scene/types';

/**
 * Read-only scene resolver.
 *
 * Live routes only. Drafts stay in the setup handler.
 *
 *   GET /api/scene/navigate?slug=nyc-security-desk
 *   GET /api/scene/navigate?id=nyc-financial-desk&site=asat
 */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const site = (url.searchParams.get('site') as SiteKey | null) ?? currentSiteKey();
  const slug = url.searchParams.get('slug') ?? undefined;
  const id = url.searchParams.get('id') ?? undefined;

  if (!slug && !id) {
    const routes = await sceneSource().allLiveRoutes();
    return NextResponse.json({
      ok: true,
      routes: routes.filter(r => r.site === site),
    });
  }

  const scene = await resolveNavigation(site, { slug, id });
  if (!scene) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...scene });
}
