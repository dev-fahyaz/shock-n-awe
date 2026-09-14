import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { Scene } from 'scene/Scene';
import { absoluteUrl, currentSiteKey, SITES } from 'scene/sites';
import { resolveNavigation } from 'scene/source/navigate';
import { sceneSource } from 'scene/source';

/**
 * Root-level scene route.
 *
 * Static segments win over dynamic ones in the App Router, so `/setup` still
 * resolves to `app/setup/page.tsx` and only unmatched paths reach here.
 */

export const revalidate = 300;
export const dynamicParams = true;

interface PageProps {
  params: { sceneSlug: string };
}

export async function generateStaticParams() {
  const routes = await sceneSource().allLiveRoutes();
  return routes.map(route => ({ sceneSlug: route.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const site = currentSiteKey();
  const scene = await resolveNavigation(site, { slug: params.sceneSlug });
  if (!scene) return {};

  const { config, route } = scene;
  const canonicalRoute =
    config.routes.find(r => r.canonical && r.status === 'live') ?? route;
  const canonical = absoluteUrl(canonicalRoute.site, canonicalRoute.slug);
  const indexable = route.indexable !== false;

  return {
    title: config.seo.title,
    description: config.seo.description,
    alternates: { canonical },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: 'website',
      url: canonical,
      title: config.seo.title,
      description: config.seo.description,
      siteName: SITES[site].name,
      images: config.seo.ogImage ? [config.seo.ogImage] : undefined,
    },
  };
}

export default async function ScenePage({ params }: PageProps) {
  const site = currentSiteKey();
  const scene = await resolveNavigation(site, { slug: params.sceneSlug });

  if (!scene) {
    const moved = (await sceneSource().redirects())[site]?.[params.sceneSlug];
    if (moved) permanentRedirect(`/${moved}`);
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0b1020]">
      <Scene
        config={scene.config}
        site={site}
        items={scene.items}
        links={scene.links}
        trail={scene.trail}
      />
    </main>
  );
}
