import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { adminRoleFor, authPublishableKey, authUrl } from './shared';

/** Cookie client for Route Handlers and Server Components. */
export function createAuthClient() {
  const url = authUrl();
  const publishable = authPublishableKey();
  if (!url || !publishable) return null;
  const store = cookies();
  return createServerClient(url, publishable, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* Server Component cannot set cookies; middleware refreshes the session. */
        }
      },
    },
  });
}

export async function isAdmin(): Promise<boolean> {
  const auth = createAuthClient();
  if (!auth) return false;
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return false;
  return adminRoleFor(user.id);
}
