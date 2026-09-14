'use client';

import { ExternalLink, ShieldAlert } from 'lucide-react';

import { Button } from 'components/ui/Button';

/**
 * What a viewer renders when it cannot safely show something inline.
 *
 * Reached when a URL's host is not on the embed allowlist, or when a format
 * has no inline renderer. Opening in a new tab is the honest outcome — the
 * content loads under its own origin instead of running inside the visitor's
 * session on ours.
 */
export function ExternalFallback({
  href,
  label,
  reason,
}: {
  href: string;
  label: string;
  reason?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
      <ShieldAlert className="size-8 text-muted-foreground" />
      <div className="max-w-sm">
        <p className="font-medium">{label}</p>
        {reason && (
          <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          It will open in a new tab instead.
        </p>
      </div>
      <Button asChild>
        <a href={href} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 size-4" />
          Open
        </a>
      </Button>
    </div>
  );
}
