import Link from 'next/link';

import { Button } from 'components/ui/Button';
import { SITES } from 'scene/sites';
import { list } from 'scene/source/store';

import { SetupList } from './SetupList';

export const metadata = { robots: { index: false, follow: false }, title: 'Scene setup' };
export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const scenes = await list();
  const brands = Object.values(SITES).map(s => ({
    key: s.key,
    name: s.name,
    url: s.url,
    apex: new URL(s.url).hostname.replace(/^www\./, ''),
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-accent)]">
        Setup
      </p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Scenes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anatomy, URLs and items. Stored locally until a database lands.
          </p>
        </div>
        <Button asChild>
          <Link href="/">Index</Link>
        </Button>
      </div>
      <SetupList scenes={scenes} brands={brands} />
    </main>
  );
}
