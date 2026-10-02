'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Sticky true once the element has been within `rootMargin` of the viewport.
 * Used to defer heavy desk previews until they can actually be seen.
 */
export function useNearViewport<T extends Element>(rootMargin = '200px') {
  const ref = useRef<T | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, rootMargin]);

  return { ref, near };
}
