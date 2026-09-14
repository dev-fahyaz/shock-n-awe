import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { slugRedirects } from 'scene/configs';
import { siteFromHost } from 'scene/sites';
import type { SiteKey } from 'scene/types';

/**
 * Edge resolution, in order:
 *
 *  1. Host  → brand. Passed downstream as `x-site` so server components can
 *     read it without prop-drilling.
 *  2. Old slug → current slug, for scenes in the COMPILED registry. Middleware
 *     runs on the edge runtime, which cannot read a JSON file or reach a CMS,
 *     so redirects for dynamically-sourced scenes are handled one layer down
 *     in `app/[sceneSlug]/page.tsx`. Both paths exist because a renamed slug
 *     must keep working either way: campaign links live in sent emails and
 *     printed QR codes that cannot be recalled.
 *
 * 301 rather than 302 — these are permanent moves and the search equity
 * should transfer.
 */

const REDIRECTS = slugRedirects();

export function middleware(req: NextRequest) {
  const forced = process.env.NEXT_PUBLIC_FORCE_SITE as SiteKey | undefined;
  const site = forced ?? siteFromHost(req.headers.get('host'));

  const slug = req.nextUrl.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  const moved = slug ? REDIRECTS[site]?.[slug] : undefined;

  if (moved) {
    const url = req.nextUrl.clone();
    url.pathname = `/${moved}`;
    return NextResponse.redirect(url, 301);
  }

  const res = NextResponse.next();
  res.headers.set('x-site', site);
  return res;
}

export const config = {
  // Everything except Next internals, API routes and static files.
  matcher: ['/((?!_next|api|.*\\..*).*)'],
};
