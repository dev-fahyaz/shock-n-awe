/**
 * Outer dashboard / hub URL helpers.
 * Runtime server env only — not NEXT_PUBLIC_.
 */

export function dashboardUrl(): string | null {
  const raw = process.env.DASHBOARD_URL?.trim() ?? '';
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * After local Sign out, send the browser to the hub SPA logout page
 * (`{DASHBOARD_URL}/logout`, or DASHBOARD_LOGOUT_URL). Prefer that over the hub
 * API bounce — absolute Location from a proxied Host often drops the port.
 */
export function hubLogoutUrl(): string | null {
  const override = process.env.DASHBOARD_LOGOUT_URL?.trim() ?? '';
  if (override) {
    try {
      const url = new URL(override);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return url.toString();
    } catch {
      return null;
    }
  }
  const dash = dashboardUrl();
  if (!dash) return null;
  return new URL('/logout', dash).toString();
}

/** Default place to send the browser after a hub-initiated logout consume. */
export function dashboardHomeUrl(): string | null {
  return dashboardUrl();
}

/** Absolute http(s) URL on the DASHBOARD_URL origin, or null. */
export function safeDashboardNext(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? '';
  if (!raw) return null;
  const dash = dashboardUrl();
  if (!dash) return null;
  try {
    const next = new URL(raw);
    if (next.protocol !== 'http:' && next.protocol !== 'https:') return null;
    if (next.origin !== new URL(dash).origin) return null;
    return next.toString();
  } catch {
    return null;
  }
}
