import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { HANDOFF_HINT, parseHandoffTokens } from 'scene/auth/handoff';
import {
  adminRoleFor,
  applyAuthCookies,
  authPublishableKey,
  authUrl,
  isAuthConfigured,
  safeNextPath,
} from 'scene/auth/shared';

type CookiePending = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

async function readBody(req: Request): Promise<{
  fields: Record<string, unknown>;
  wantRedirect: boolean;
}> {
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(await req.text());
    const fields: Record<string, string> = {};
    for (const [key, value] of params.entries()) fields[key] = value;
    return { fields, wantRedirect: true };
  }
  try {
    const json = (await req.json()) as Record<string, unknown>;
    const redirectFlag = json.redirect === true || json.redirect === '1' || json.redirect === 1;
    return { fields: json, wantRedirect: redirectFlag };
  } catch {
    return { fields: {}, wantRedirect: false };
  }
}

function apply(
  res: NextResponse,
  pending: CookiePending[],
  extraHeaders: Record<string, string>,
) {
  applyAuthCookies(res, pending, extraHeaders);
  return res;
}

export async function POST(req: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Auth is not configured. Set SUPABASE_PUBLISHABLE_KEY.' },
      { status: 503 },
    );
  }

  const { fields, wantRedirect } = await readBody(req);
  const email = String(fields.email ?? '').trim();
  const password = String(fields.password ?? '');
  const next = safeNextPath(String(fields.next ?? ''));
  const handoff = parseHandoffTokens(fields);

  const passwordLogin = Boolean(email && password);
  const tokenLogin = Boolean(handoff);
  if (passwordLogin === tokenLogin) {
    return NextResponse.json(
      {
        ok: false,
        error: passwordLogin
          ? 'send either email and password, or access_token (not both)'
          : `send either email and password, or access_token plus refresh_token. ${HANDOFF_HINT}`,
      },
      { status: 400 },
    );
  }

  const store = cookies();
  const pending: CookiePending[] = [];
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

  let userId: string | null = null;

  if (passwordLogin) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return apply(
        NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 401 }),
        pending,
        extraHeaders,
      );
    }
    userId = data.user.id;
  } else if (handoff) {
    const { data, error } = await supabase.auth.getUser(handoff.access_token);
    if (error || !data.user) {
      return apply(
        NextResponse.json({ ok: false, error: `Invalid access token. ${HANDOFF_HINT}` }, { status: 401 }),
        pending,
        extraHeaders,
      );
    }
    userId = data.user.id;
    const { error: sessError } = await supabase.auth.setSession({
      access_token: handoff.access_token,
      refresh_token: handoff.refresh_token,
    });
    if (sessError) {
      return apply(
        NextResponse.json({ ok: false, error: 'Invalid session tokens' }, { status: 401 }),
        pending,
        extraHeaders,
      );
    }
  }

  if (!userId || !(await adminRoleFor(userId))) {
    await supabase.auth.signOut();
    return apply(
      NextResponse.json({ ok: false, error: 'Not an admin' }, { status: 403 }),
      pending,
      extraHeaders,
    );
  }

  const origin = process.env.SCENE_ENGINE_URL || new URL(req.url).origin;
  const res = wantRedirect
    ? NextResponse.redirect(new URL(next, origin), 303)
    : NextResponse.json({ ok: true, next });
  return apply(res, pending, extraHeaders);
}
