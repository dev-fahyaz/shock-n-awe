import { NextResponse } from 'next/server';

import { StoreError } from '../source/store';
import { isAdmin } from '../auth/session';

/** True when the request has a Supabase Auth session with app_users.role = admin. */
export async function setupAuthorized(): Promise<boolean> {
  return isAdmin();
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
