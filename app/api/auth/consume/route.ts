import { redeemCode } from 'scene/auth/code';
import { applySink, establishAdminSession, redirectPath } from 'scene/auth/establish';
import { isAuthConfigured, safeNextPath } from 'scene/auth/shared';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNextPath(url.searchParams.get('next'));

  if (!isAuthConfigured()) {
    return redirectPath('/login', 302);
  }

  const tokens = redeemCode(url.searchParams.get('code') ?? '');
  if (!tokens) {
    return redirectPath('/login', 302);
  }

  const result = await establishAdminSession(tokens);
  if (!result.ok) {
    return applySink(redirectPath('/login', 302), result.sink);
  }

  return applySink(redirectPath(next, 303), result.sink);
}
