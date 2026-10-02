import { Download } from 'lucide-react';

import { cn } from 'components/ui/utils';
import type { CardItem } from './types';

/**
 * A landscape calling card. `mini` scales type to the hotspot; the modal uses
 * the same arrangement at a readable size. Everything shown must fit inside
 * the card bounds.
 */
export function BusinessCard({ item, mini = false }: { item: CardItem; mini?: boolean }) {
  const { person, social, vcard } = item;
  const phone = person.phones?.[0];
  const site = person.website?.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <article
      className={cn(
        'flex h-full w-full overflow-hidden bg-[#f4f0e6] text-[#1a1c20]',
        !mini && 'rounded-md shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)]',
      )}
    >
      <div
        className={cn('shrink-0', mini ? 'w-[4px]' : 'w-[6px]')}
        style={{ background: 'linear-gradient(180deg, #1d4e89, #163a66)' }}
        aria-hidden
      />
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 items-center',
          mini ? 'gap-[3.5%] px-[4%] py-[4%]' : 'gap-4 px-5 py-4',
        )}
      >
        {person.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photo}
            alt=""
            loading="lazy"
            decoding="async"
            className={cn(
              'shrink-0 rounded-full object-cover',
              mini ? 'aspect-square h-[48%]' : 'size-16 border border-black/10',
            )}
          />
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden">
          <p
            className={cn(
              'truncate font-semibold leading-tight',
              !mini && 'text-base',
            )}
            style={mini ? { fontSize: '5.2cqw' } : undefined}
          >
            {person.name}
          </p>
          <p
            className={cn('truncate text-[#5c6570]', !mini && 'mt-0.5 text-xs')}
            style={mini ? { fontSize: '3.2cqw', marginTop: '0.2em' } : undefined}
          >
            {person.title}
          </p>
          <div
            className={cn('bg-[#c4a15a]', mini ? 'my-[0.45em] h-px w-[24%]' : 'my-2 h-px w-12')}
            aria-hidden
          />
          <div
            className={cn(
              'min-w-0 overflow-hidden text-[#3c4450]',
              mini ? 'space-y-[0.12em]' : 'space-y-0.5 text-xs leading-snug',
            )}
            style={mini ? { fontSize: '2.7cqw' } : undefined}
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
            {!mini && person.address && (
              <p className="line-clamp-2 break-words">{person.address}</p>
            )}
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
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
              {social.map(s => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] capitalize text-[#1d4e89] hover:underline"
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
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[#1d4e89] hover:underline"
            >
              <Download className="size-3" />
              Save contact
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
