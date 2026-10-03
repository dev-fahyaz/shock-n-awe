import { redeemCode } from 'scene/auth/code';
import {
  applySink,
  establishAdminSession,
  redirectPath,
  type EstablishResult,
} from 'scene/auth/establish';
import { isAdmin } from 'scene/auth/session';
import { isAuthConfigured, safeNextPath } from 'scene/auth/shared';

/** One establish per code — refresh tokens must not run twice in parallel. */
const inflight = new Map<string, Promise<EstablishResult>>();

function establishOnce(code: string, tokens: { access_token: string; refresh_token: string }) {
  const existing = inflight.get(code);
  if (existing) return existing;
  const pending = establishAdminSession(tokens).finally(() => {
    setTimeout(() => inflight.delete(code), 15_000);
  });
  inflight.set(code, pending);
  return pending;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNextPath(url.searchParams.get('next'));
  const code = (url.searchParams.get('code') ?? '').trim();

  if (!isAuthConfigured()) {
    return redirectPath('/login', 302);
  }

  if (await isAdmin()) {
    return redirectPath(next, 303);
  }

  const tokens = redeemCode(code);
  if (!tokens) {
    return redirectPath('/login', 302);
  }

  const result = await establishOnce(code, tokens);
  if (!result.ok) {
    return applySink(redirectPath('/login', 302), result.sink);
  }

  return applySink(redirectPath(next, 303), result.sink);
}
