import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

const TABLE = 'app_users';

export function authUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
}

export function authPublishableKey(): string {
  return process.env.SUPABASE_PUBLISHABLE_KEY ?? '';
}

export function isAuthConfigured(): boolean {
  return Boolean(authUrl() && authPublishableKey() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function service() {
  const url = authUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function adminRoleFor(userId: string): Promise<boolean> {
  const db = service();
  if (!db) return false;
  const { data, error } = await db
    .from(TABLE)
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === 'admin';
}

export function applyAuthCookies(
  res: NextResponse,
  toSet: { name: string; value: string; options?: Record<string, unknown> }[],
  extraHeaders?: Record<string, string>,
) {
  toSet.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options as never);
  });
  if (extraHeaders) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      res.headers.set(key, value);
    }
  }
}

export function createMiddlewareAuth(req: NextRequest, res: NextResponse) {
  const url = authUrl();
  const publishable = authPublishableKey();
  if (!url || !publishable) return null;
  return createServerClient(url, publishable, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(toSet, headers) {
        toSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            res.headers.set(key, value);
          }
        }
      },
    },
  });
}

export function safeNextPath(value: string | null | undefined): string {
  const raw = value?.trim() ?? '';
  if (!raw) return '/setup';

  // Hub sometimes sends an absolute same-origin URL; keep only the path.
  if (/^https?:\/\//i.test(raw)) {
    try {
      const abs = new URL(raw);
      return safeNextPath(`${abs.pathname}${abs.search}${abs.hash}`);
    } catch {
      return '/setup';
    }
  }

  if (!raw.startsWith('/') || raw.startsWith('//')) return '/setup';
  if (raw.startsWith('/login')) return '/setup';
  return raw;
}
