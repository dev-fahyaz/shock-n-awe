import { NextResponse } from 'next/server';

import { mintCode, secretMatches } from 'scene/auth/code';
import { adminUserForTokens } from 'scene/auth/establish';
import { HANDOFF_HINT, parseHandoffTokens } from 'scene/auth/handoff';
import { isAuthConfigured } from 'scene/auth/shared';

export async function POST(req: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Auth is not configured. Set SUPABASE_PUBLISHABLE_KEY.' },
      { status: 503 },
    );
  }

  const match = secretMatches(req);
  if (match === 'missing') {
    return NextResponse.json(
      { ok: false, error: 'Handoff is not configured. Set HANDOFF_SECRET.' },
      { status: 501 },
    );
  }
  if (match === 'bad') {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const tokens = parseHandoffTokens(body);
  if (!tokens) {
    return NextResponse.json(
      { ok: false, error: `access_token and refresh_token required. ${HANDOFF_HINT}` },
      { status: 400 },
    );
  }

  const verified = await adminUserForTokens(tokens);
  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: verified.error }, { status: verified.status });
  }

  const { code, expires_in } = mintCode(tokens);
  return NextResponse.json({ ok: true, code, expires_in });
}
