import { NextResponse } from 'next/server';

import { redeemCode } from 'scene/auth/code';
import { applySink, establishAdminSession, publicOrigin } from 'scene/auth/establish';
import { isAuthConfigured, safeNextPath } from 'scene/auth/shared';

export async function GET(req: Request) {
  const origin = publicOrigin(req);
  const login = new URL('/login', origin);
  const url = new URL(req.url);
  const next = safeNextPath(url.searchParams.get('next'));

  if (!isAuthConfigured()) {
    return NextResponse.redirect(login, 302);
  }

  const tokens = redeemCode(url.searchParams.get('code') ?? '');
  if (!tokens) {
    return NextResponse.redirect(login, 302);
  }

  const result = await establishAdminSession(tokens);
  if (!result.ok) {
    return applySink(NextResponse.redirect(login, 302), result.sink);
  }

  return applySink(NextResponse.redirect(new URL(next, origin), 303), result.sink);
}
