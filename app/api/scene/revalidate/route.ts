import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { invalidateSceneCache, sceneSource } from 'scene/source';

/**
 * Publish webhook.
 *
 * Called by the CMS after a scene is saved. Drops the source cache and
 * revalidates the affected paths, so a change is live in seconds rather than
 * waiting out the ISR window.
 *
 * POST /api/scene/revalidate
 *   { "secret": "…", "slugs": ["banking-desk"] }   // or omit slugs for all
 */
export async function POST(req: Request) {
  const secret = process.env.SCENE_REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'SCENE_REVALIDATE_SECRET is not configured' },
      { status: 501 },
    );
  }

  let body: { secret?: string; slugs?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  // Constant-time-ish comparison; the secret is short and the endpoint is
  // rate-limited by the platform, but avoid leaking length via early exit.
  const provided = body.secret ?? req.headers.get('x-scene-secret') ?? '';
  if (provided.length !== secret.length || provided !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorised' }, { status: 401 });
  }

  invalidateSceneCache();

  const slugs =
    body.slugs?.length
      ? body.slugs
      : (await sceneSource().allLiveRoutes()).map(r => r.slug);

  for (const slug of slugs) {
    revalidatePath(`/${slug}`);
  }
  revalidatePath('/');

  return NextResponse.json({ ok: true, revalidated: slugs, at: Date.now() });
}
