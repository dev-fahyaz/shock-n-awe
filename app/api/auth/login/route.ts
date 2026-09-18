import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  adminRoleFor,
  applyAuthCookies,
  authPublishableKey,
  authUrl,
  isAuthConfigured,
  safeNextPath,
} from 'scene/auth/shared';

export async function POST(req: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Auth is not configured. Set SUPABASE_PUBLISHABLE_KEY.' },
      { status: 503 },
    );
  }

  let email = '';
  let password = '';
  let next = '/setup';
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      next?: string;
    };
    email = String(body.email ?? '').trim();
    password = String(body.password ?? '');
    next = safeNextPath(body.next);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'email and password required' }, { status: 400 });
  }

  const store = cookies();
  const pending: {
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }[] = [];
  let extraHeaders: Record<string, string> = {};

  const supabase = createServerClient(authUrl(), authPublishableKey(), {
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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const res = NextResponse.json(
      { ok: false, error: 'Invalid email or password' },
      { status: 401 },
    );
    applyAuthCookies(res, pending, extraHeaders);
    return res;
  }

  if (!(await adminRoleFor(data.user.id))) {
    await supabase.auth.signOut();
    const res = NextResponse.json(
      { ok: false, error: 'Not an admin' },
      { status: 403 },
    );
    applyAuthCookies(res, pending, extraHeaders);
    return res;
  }

  const res = NextResponse.json({ ok: true, next });
  applyAuthCookies(res, pending, extraHeaders);
  return res;
}
