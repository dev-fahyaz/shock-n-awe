import { NextResponse } from 'next/server';

import { HANDOFF_HINT, parseHandoffTokens } from 'scene/auth/handoff';
import {
  applySink,
  createRouteSupabase,
  establishAdminSession,
  newCookieSink,
  publicOrigin,
} from 'scene/auth/establish';
import { adminRoleFor, isAuthConfigured, safeNextPath } from 'scene/auth/shared';

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

  if (handoff) {
    const result = await establishAdminSession(handoff);
    if (!result.ok) {
      return applySink(
        NextResponse.json({ ok: false, error: result.error }, { status: result.status }),
        result.sink,
      );
    }
    const origin = publicOrigin(req);
    const res = wantRedirect
      ? NextResponse.redirect(new URL(next, origin), 303)
      : NextResponse.json({ ok: true, next });
    return applySink(res, result.sink);
  }

  const sink = newCookieSink();
  const supabase = createRouteSupabase(sink);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return applySink(
      NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 401 }),
      sink,
    );
  }
  if (!(await adminRoleFor(data.user.id))) {
    await supabase.auth.signOut();
    return applySink(
      NextResponse.json({ ok: false, error: 'Not an admin' }, { status: 403 }),
      sink,
    );
  }

  const origin = publicOrigin(req);
  const res = wantRedirect
    ? NextResponse.redirect(new URL(next, origin), 303)
    : NextResponse.json({ ok: true, next });
  return applySink(res, sink);
}
