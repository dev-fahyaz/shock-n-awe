import { Button } from 'components/ui/Button';

/** Absolute http(s) hub URL, or null if unset / invalid. Runtime env, not NEXT_PUBLIC_. */
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

export function DashboardLink() {
  const href = dashboardUrl();
  if (!href) return null;
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href}>Return to dashboard</a>
    </Button>
  );
}
