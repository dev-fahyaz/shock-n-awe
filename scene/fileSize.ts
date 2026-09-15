'use client';

import { useEffect, useState } from 'react';

const cache = new Map<string, string>();

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) {
    const kb = n / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = n / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** Size of a Storage object, or null while unknown / not a file URL. */
export function useHrefSize(href?: string): string | null {
  const [label, setLabel] = useState(() => (href ? cache.get(href) ?? null : null));

  useEffect(() => {
    if (!href || !href.includes('/storage/v1/object/')) {
      setLabel(null);
      return;
    }
    const hit = cache.get(href);
    if (hit) {
      setLabel(hit);
      return;
    }
    let gone = false;
    (async () => {
      try {
        const head = await fetch(href, { method: 'HEAD' });
        let n = Number(head.headers.get('content-length'));
        if (!head.ok || !Number.isFinite(n) || n <= 0) {
          const res = await fetch(href);
          if (!res.ok) return;
          n = (await res.blob()).size;
        }
        const next = formatBytes(n);
        cache.set(href, next);
        if (!gone) setLabel(next);
      } catch {
        /* keep null — do not fall back to a stale placeholder */
      }
    })();
    return () => {
      gone = true;
    };
  }, [href]);

  return label;
}
