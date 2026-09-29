import { Download } from 'lucide-react';

import { cn } from 'components/ui/utils';
import type { CardItem } from './types';

/**
 * A landscape calling card. `mini` scales type to the hotspot; the modal uses
 * the same arrangement at a readable size.
 */
export function BusinessCard({ item, mini = false }: { item: CardItem; mini?: boolean }) {
  const { person, social, vcard } = item;
  const phone = person.phones?.[0];
  const site = person.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <article
      className={cn(
        'flex h-full w-full bg-[#f4f0e6] text-[#1a1c20]',
        mini ? 'items-stretch' : 'overflow-hidden rounded-md shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)]',
      )}
    >
      <div
        className="w-[7px] shrink-0"
        style={{ background: 'linear-gradient(180deg, #1d4e89, #163a66)' }}
        aria-hidden
      />
      <div
        className={cn(
          'flex min-w-0 flex-1 items-center',
          mini ? 'gap-[5%] px-[5%] py-[6%]' : 'gap-6 px-7 py-6',
        )}
      >
        {person.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photo}
            alt=""
            className={cn(
              'shrink-0 rounded-full object-cover',
              mini ? 'aspect-square h-[62%]' : 'size-24 border border-black/10',
            )}
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className={cn('truncate font-semibold leading-tight', !mini && 'text-2xl')}
            style={mini ? { fontSize: '8cqw' } : undefined}
          >
            {person.name}
          </p>
          <p
            className={cn('truncate text-[#5c6570]', !mini && 'mt-1 text-sm')}
            style={mini ? { fontSize: '4.6cqw', marginTop: '0.35em' } : undefined}
          >
            {person.title}
          </p>
          <div
            className={cn('bg-[#c4a15a]', mini ? 'my-[0.7em] h-px w-[28%]' : 'my-3 h-px w-16')}
            aria-hidden
          />
          <div
            className={cn('text-[#3c4450]', mini ? 'space-y-[0.2em]' : 'space-y-1 text-sm')}
            style={mini ? { fontSize: '3.8cqw' } : undefined}
          >
            {(mini ? [phone].filter(Boolean) : person.phones ?? []).map(p =>
              p ? (
                <p key={p.number} className="truncate">
                  {mini ? (
                    p.number
                  ) : (
                    <a href={`tel:${p.number.replace(/\s/g, '')}`} className="hover:underline">
                      {p.number}
                    </a>
                  )}
                  {p.label && (
                    <span className="ml-[0.6em] text-[#8a909a]">{p.label}</span>
                  )}
                </p>
              ) : null,
            )}
            {person.email && (
              <p className="truncate">
                {mini ? (
                  person.email
                ) : (
                  <a href={`mailto:${person.email}`} className="hover:underline">
                    {person.email}
                  </a>
                )}
              </p>
            )}
            {!mini && person.address && <p>{person.address}</p>}
            {site && (
              <p className="truncate">
                {mini || !person.website ? (
                  site
                ) : (
                  <a
                    href={person.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {site}
                  </a>
                )}
              </p>
            )}
          </div>
          {!mini && social && social.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {social.map(s => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs capitalize text-[#1d4e89] hover:underline"
                >
                  {s.network}
                </a>
              ))}
            </div>
          )}
          {!mini && vcard && (
            <a
              href={vcard}
              download
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#1d4e89] hover:underline"
            >
              <Download className="size-3.5" />
              Save contact
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
