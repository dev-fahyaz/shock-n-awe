'use client';

import { Download, Globe, Mail, MapPin, Phone } from 'lucide-react';

import { Button } from 'components/ui/Button';
import type { ViewerProps } from './types';

/** Contact card with a vCard download, built from whatever fields exist. */
export default function CardViewer({ item }: ViewerProps) {
  if (item.kind !== 'card') return null;
  const { person, social, vcard } = item;

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-2xl">
        <div className="h-20 bg-[var(--brand-accent)]/20" />

        <div className="-mt-12 px-6 pb-6">
          {person.photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.photo}
              alt=""
              className="size-24 rounded-full border-4 border-card object-cover"
            />
          )}
          <h3 className="mt-3 text-xl font-semibold">{person.name}</h3>
          <p className="text-sm text-muted-foreground">{person.title}</p>

          <dl className="mt-5 space-y-2.5 text-sm">
            {person.email && (
              <div className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <a href={`mailto:${person.email}`} className="hover:underline">
                  {person.email}
                </a>
              </div>
            )}
            {person.phones?.map(p => (
              <div key={p.number} className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <a href={`tel:${p.number.replace(/\s/g, '')}`} className="hover:underline">
                  {p.number}
                </a>
                <span className="text-xs text-muted-foreground">{p.label}</span>
              </div>
            ))}
            {person.address && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{person.address}</span>
              </div>
            )}
            {person.website && (
              <div className="flex items-center gap-3">
                <Globe className="size-4 shrink-0 text-muted-foreground" />
                <a
                  href={person.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {person.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </dl>

          {social && social.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {social.map(s => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border px-3 py-1.5 text-xs capitalize transition hover:border-[var(--brand-accent)]"
                >
                  {s.network}
                </a>
              ))}
            </div>
          )}

          {vcard && (
            <Button asChild className="mt-6 w-full">
              <a href={vcard} download>
                <Download className="mr-2 size-4" />
                Save contact
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
