import { createRouteSupabase, newCookieSink, type CookieSink } from './establish';
import { authPublishableKey, authUrl } from './shared';

/**
 * Sign out the current browser session and collect Set-Cookie updates.
 * Returns null when Auth env is missing.
 */
export async function clearAuthSession(): Promise<CookieSink | null> {
  if (!authUrl() || !authPublishableKey()) return null;

  const sink = newCookieSink();
  const supabase = createRouteSupabase(sink);
  await supabase.auth.signOut();
  return sink;
}
