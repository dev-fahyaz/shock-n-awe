import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { applyAuthCookies, authPublishableKey, authUrl } from 'scene/auth/shared';

export async function POST() {
  const url = authUrl();
  const publishable = authPublishableKey();
  if (!url || !publishable) {
    return NextResponse.redirect(new URL('/login', process.env.SCENE_ENGINE_URL || 'http://localhost:3000'));
  }

  const store = cookies();
  const pending: {
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }[] = [];
  let extraHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, publishable, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet, headers) {
        toSet.forEach(({ name, value, options }) => {
          pending.push({ name, value, options: options as Record<string, unknown> });
        });
        extraHeaders = headers ?? extraHeaders;
      },
    },
  });

  await supabase.auth.signOut();

  const res = NextResponse.json({ ok: true });
  applyAuthCookies(res, pending, extraHeaders);
  return res;
}
