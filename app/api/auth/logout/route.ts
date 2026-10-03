import { NextResponse } from 'next/server';

import { clearAuthSession } from 'scene/auth/clearSession';
import { hubLogoutUrl } from 'scene/auth/dashboard';
import { applySink } from 'scene/auth/establish';

/** Clear this origin’s session. `{ next }` is hub `/logout` when DASHBOARD_URL is set. */
export async function POST() {
  const next = hubLogoutUrl() ?? '/login';
  const sink = await clearAuthSession();
  if (!sink) {
    return NextResponse.json({ ok: true, next });
  }
  return applySink(NextResponse.json({ ok: true, next }), sink);
}
