'use client';

import { isEmbeddable } from '../schema';
import type { ViewerProps } from './types';
import { ExternalFallback } from './ExternalFallback';

/**
 * Lead capture inside the modal.
 *
 * `provider` decides where the lead lands. `ghl` frames a LeadConnector form;
 * `internal` is reserved for a form posting to this app's own endpoints — not
 * built yet, so it renders an honest notice rather than a dead form that
 * silently drops submissions.
 */
export default function FormViewer({ item }: ViewerProps) {
  if (item.kind !== 'form') return null;

  const provider = item.provider ?? 'ghl';

  if (provider === 'ghl') {
    const src = `https://api.leadconnectorhq.com/widget/form/${item.formId}`;
    if (!isEmbeddable(src)) {
      return (
        <ExternalFallback
          href={src}
          label={item.label}
          reason="The form host is not on the embed allowlist."
        />
      );
    }
    return (
      <iframe
        src={src}
        title={item.label}
        className="size-full border-0 bg-white"
        style={item.height ? { height: item.height } : undefined}
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <p className="font-medium">{item.label}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        The internal form provider is not wired up yet. Set{' '}
        <code className="rounded bg-muted px-1.5 py-0.5">provider: &quot;ghl&quot;</code>{' '}
        on this item, or connect the form to this app&apos;s own endpoint before
        using it in a live campaign.
      </p>
    </div>
  );
}
