import { NextResponse } from 'next/server';

import { StoreError } from '../source/store';

export function setupAuthorized(req: Request): boolean {
  const secret = process.env.SCENE_SETUP_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const provided = req.headers.get('x-scene-secret') ?? '';
  return provided.length === secret.length && provided === secret;
}

export function setupDeny() {
  return NextResponse.json({ ok: false, error: 'unauthorised' }, { status: 401 });
}

export function setupFail(err: unknown) {
  if (err instanceof StoreError) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: err.status },
    );
  }
  const message = err instanceof Error ? err.message : 'unknown error';
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}
