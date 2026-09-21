import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

import { HANDOFF_HINT, type HandoffTokens } from './handoff';
import {
  adminRoleFor,
  applyAuthCookies,
  authPublishableKey,
  authUrl,
} from './shared';

export type CookiePending = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

export type CookieSink = {
  pending: CookiePending[];
  extraHeaders: Record<string, string>;
};

export function newCookieSink(): CookieSink {
  return { pending: [], extraHeaders: {} };
}

export function createRouteSupabase(sink: CookieSink) {
  const store = cookies();
  return createServerClient(authUrl(), authPublishableKey(), {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(toSet, headers) {
        toSet.forEach(({ name, value, options }) => {
          sink.pending.push({ name, value, options: options as Record<string, unknown> });
        });
        sink.extraHeaders = headers ?? sink.extraHeaders;
      },
    },
  });
}

export function applySink(res: NextResponse, sink: CookieSink) {
  applyAuthCookies(res, sink.pending, sink.extraHeaders);
  return res;
}

export function publicOrigin(req: Request): string {
  return process.env.SCENE_ENGINE_URL || new URL(req.url).origin;
}

/** Validate tokens and admin role without writing cookies (mint a code). */
export async function adminUserForTokens(
  tokens: HandoffTokens,
): Promise<{ ok: true; userId: string } | { ok: false; status: 401 | 403; error: string }> {
  const url = authUrl();
  const publishable = authPublishableKey();
  if (!url || !publishable) {
    return { ok: false, status: 401, error: `Invalid access token. ${HANDOFF_HINT}` };
  }
  const supabase = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(tokens.access_token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: `Invalid access token. ${HANDOFF_HINT}` };
  }
  if (!(await adminRoleFor(data.user.id))) {
    return { ok: false, status: 403, error: 'Not an admin' };
  }
  return { ok: true, userId: data.user.id };
}

export type EstablishResult =
  | { ok: true; sink: CookieSink }
  | { ok: false; status: number; error: string; sink: CookieSink };

/** setSession + admin check. Writes auth cookies into the sink. */
export async function establishAdminSession(tokens: HandoffTokens): Promise<EstablishResult> {
  const sink = newCookieSink();
  const supabase = createRouteSupabase(sink);
  const { data, error } = await supabase.auth.getUser(tokens.access_token);
  if (error || !data.user) {
    return {
      ok: false,
      status: 401,
      error: `Invalid access token. ${HANDOFF_HINT}`,
      sink,
    };
  }
  const { error: sessError } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (sessError) {
    return { ok: false, status: 401, error: 'Invalid session tokens', sink };
  }
  if (!(await adminRoleFor(data.user.id))) {
    await supabase.auth.signOut();
    return { ok: false, status: 403, error: 'Not an admin', sink };
  }
  return { ok: true, sink };
}
