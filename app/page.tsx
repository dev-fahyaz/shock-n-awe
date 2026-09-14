import Link from 'next/link';

import { Button } from 'components/ui/Button';
import { currentSite, currentSiteKey, SITES } from 'scene/sites';
import { sceneSource } from 'scene/source';

export const metadata = { robots: { index: false, follow: false } };

/**
 * Development index.
 *
 * Lists every live route so you can jump between scenes without remembering
 * slugs. Not a production page — `noindex`, and worth replacing with a
 * redirect or a real landing page before this deploys anywhere public.
 */
export default async function Home() {
  const siteKey = currentSiteKey();
  const site = currentSite();
  const routes = await sceneSource().allLiveRoutes();
  const mine = routes.filter(r => r.site === siteKey);
  const others = routes.filter(r => r.site !== siteKey);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-accent)]">
            Scene engine
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{site.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Serving <code className="rounded bg-muted px-1.5 py-0.5">{site.url}</code>{' '}
            — resolved from the request host.
          </p>
        </div>
        <Button asChild>
          <Link href="/setup">Setup</Link>
        </Button>
      </div>

      <h2 className="mt-12 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Live on this brand
      </h2>
      <ul className="mt-4 space-y-2">
        {mine.length === 0 && (
          <li className="text-sm text-muted-foreground">None yet.</li>
        )}
        {mine.map(route => (
          <li key={`${route.site}:${route.slug}`}>
            <Link
              href={`/${route.slug}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition hover:border-[var(--brand-accent)]"
            >
              <span>
                <span className="block font-medium">/{route.slug}</span>
                <span className="block text-xs text-muted-foreground">
                  {route.status}
                  {route.publishedAt ? ` · ${route.publishedAt}` : ''}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {route.indexable === false ? 'noindex' : 'index'}
                {route.canonical ? ' · canonical' : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {others.length > 0 && (
        <>
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Live on the other brand
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {others.map(route => (
              <li key={`${route.site}:${route.slug}`}>
                {SITES[route.site].url}/{route.slug}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Set <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_FORCE_SITE</code>{' '}
            or add a hosts entry to view those locally.
          </p>
        </>
      )}
    </main>
  );
}
