'use client';

import { useMemo } from 'react';

import { applyTokens } from '../letterTokens';
import { getRecipientName } from '../track';
import type { ViewerProps } from './types';

/**
 * Letterhead plus body text, with `{{token}}` substitution.
 *
 * Tokens resolve client-side from the recipient resolved by `?r=`. That is
 * deliberate: doing it during the server render would give every recipient
 * their own cache entry and destroy the ISR benefit. Unresolved tokens fall
 * back to a neutral word rather than printing `{{firstName}}` at a prospect.
 */
export default function LetterViewer({ item }: ViewerProps) {
  const recipient = getRecipientName();

  const body = useMemo(
    () => (item.kind === 'letter' ? applyTokens(item.bodyMdx, recipient) : ''),
    [item, recipient],
  );

  if (item.kind !== 'letter') return null;

  const paragraphs = body.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-10">
      <article className="mx-auto max-w-2xl rounded-lg bg-[#f8f7f3] p-8 text-[#1c1e22] shadow-2xl md:p-12">
        {item.letterheadSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.letterheadSrc}
            alt=""
            className="mb-8 h-12 w-auto"
          />
        )}

        {paragraphs.map((p, i) => (
          <p key={i} className="mb-4 whitespace-pre-line leading-relaxed">
            {p}
          </p>
        ))}

        {item.signature && (
          <footer className="mt-10 border-t border-black/10 pt-5">
            {item.signature.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.signature.image} alt="" className="mb-2 h-12 w-auto" />
            )}
            <p className="font-semibold">{item.signature.name}</p>
            <p className="text-sm text-[#5c626c]">{item.signature.title}</p>
          </footer>
        )}
      </article>
    </div>
  );
}
