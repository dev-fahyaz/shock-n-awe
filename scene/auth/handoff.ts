/** Parse a universal-login payload into Supabase session tokens. */

export type HandoffTokens = {
  access_token: string;
  refresh_token: string;
};

function looksLikeJwt(value: string): boolean {
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(value);
}

function fromBase64Url(input: string): string {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64').toString('utf8');
}

function tokensFromRecord(value: unknown): HandoffTokens | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  const nested =
    rec.session && typeof rec.session === 'object'
      ? (rec.session as Record<string, unknown>)
      : rec;
  const access = String(nested.access_token ?? nested.accessToken ?? '').trim();
  const refresh = String(nested.refresh_token ?? nested.refreshToken ?? '').trim();
  if (!looksLikeJwt(access) || !refresh) return null;
  return { access_token: access, refresh_token: refresh };
}

/** Decode a `sb-*-auth-token` cookie value (`base64-…` JSON) or a session JSON string. */
export function tokensFromCookieValue(raw: string): HandoffTokens | null {
  let value = raw.trim();
  if (!value) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    /* already decoded */
  }
  if (value.startsWith('base64-')) {
    try {
      value = fromBase64Url(value.slice('base64-'.length));
    } catch {
      return null;
    }
  }
  if (value.startsWith('{')) {
    try {
      return tokensFromRecord(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (looksLikeJwt(value)) return null;
  return null;
}

/**
 * Channel body: `{ access_token, refresh_token }` from `supabase.auth.getSession()`,
 * the same fields nested under `session`, or the auth-cookie blob (not a JWT by itself).
 */
export function parseHandoffTokens(body: Record<string, unknown>): HandoffTokens | null {
  const direct = tokensFromRecord(body);
  if (direct) return direct;

  const blob = String(body.access_token ?? body.token ?? body.cookie ?? '').trim();
  if (!blob) return null;
  if (looksLikeJwt(blob)) {
    const refresh = String(body.refresh_token ?? body.refreshToken ?? '').trim();
    if (!refresh) return null;
    return { access_token: blob, refresh_token: refresh };
  }
  return tokensFromCookieValue(blob);
}

export const HANDOFF_HINT =
  'Send session.access_token (JWT starting with eyJ) and session.refresh_token from supabase.auth.getSession(). The sb-*-auth-token cookie wraps those fields; it is not the access token.';
