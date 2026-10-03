import { NextResponse } from 'next/server';

import { mintLogoutCode, secretMatches } from 'scene/auth/code';
import { dashboardHomeUrl, safeDashboardNext } from 'scene/auth/dashboard';
import { isAuthConfigured } from 'scene/auth/shared';

/**
 * Hub mints a logout consume URL for the browser.
 * Body: `{ next?: string }` — absolute URL on DASHBOARD_URL origin when set.
 */
export async function POST(req: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Auth is not configured. Set SUPABASE_PUBLISHABLE_KEY.' },
      { status: 503 },
    );
  }

  const match = secretMatches(req);
  if (match === 'missing') {
    return NextResponse.json(
      { ok: false, error: 'Handoff is not configured. Set HANDOFF_SECRET.' },
      { status: 501 },
    );
  }
  if (match === 'bad') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const rawNext = typeof body.next === 'string' ? body.next : null;
  if (rawNext != null && rawNext.trim() !== '' && !safeDashboardNext(rawNext)) {
    return NextResponse.json(
      { ok: false, error: 'next must be an absolute http(s) URL on the DASHBOARD_URL origin' },
      { status: 400 },
    );
  }

  const next = rawNext?.trim() ? safeDashboardNext(rawNext) : dashboardHomeUrl();

  const { code, expires_in } = mintLogoutCode(next);
  const engine =
    process.env.SCENE_ENGINE_URL?.replace(/\/$/, '') ||
    new URL(req.url).origin;
  const consume = new URL('/api/auth/logout/consume', engine);
  consume.searchParams.set('code', code);
  if (next) consume.searchParams.set('next', next);

  return NextResponse.json({ ok: true, url: consume.toString(), expires_in });
}
