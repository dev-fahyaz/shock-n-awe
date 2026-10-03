import { redeemLogoutCode } from 'scene/auth/code';
import { clearAuthSession } from 'scene/auth/clearSession';
import { dashboardHomeUrl, safeDashboardNext } from 'scene/auth/dashboard';
import { applySink, redirectPath } from 'scene/auth/establish';
import { isAuthConfigured } from 'scene/auth/shared';

/** Browser-only. Clear this origin’s cookies, then redirect to a trusted hub `next`. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const hub = dashboardHomeUrl();
  const fallback = hub ?? '/login';

  const ticket = redeemLogoutCode(url.searchParams.get('code') ?? '');
  if (!ticket) {
    return redirectPath(fallback, 302);
  }

  const fromQuery = safeDashboardNext(url.searchParams.get('next'));
  const next = fromQuery ?? ticket.next ?? fallback;

  if (!isAuthConfigured()) {
    return redirectPath(next, 302);
  }

  const sink = await clearAuthSession();
  if (!sink) {
    return redirectPath(next, 302);
  }

  return applySink(redirectPath(next, 303), sink);
}
