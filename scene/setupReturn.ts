/**
 * Read `?setup=` without `useSearchParams`, so the scene route stays static.
 *
 * The id is remembered for this document so a later URL edit on the same
 * scene still returns to that setup. A fresh visit with no `?setup=` — the
 * index — forgets it and Back goes home.
 */

const KEY = 'sna.setupReturn';

let capturedPath: string | null = null;

export function setupReturnId(): string | null {
  if (typeof window === 'undefined') return null;
  const fromUrl = new URLSearchParams(window.location.search).get('setup')?.trim() || '';
  if (fromUrl) {
    capturedPath = window.location.pathname;
    sessionStorage.setItem(KEY, JSON.stringify({ path: capturedPath, id: fromUrl }));
    return fromUrl;
  }
  if (capturedPath && capturedPath === window.location.pathname) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null') as {
        path?: string;
        id?: string;
      } | null;
      if (saved?.path === capturedPath && saved.id) return saved.id;
    } catch {
      /* ignore a bad value */
    }
  }
  sessionStorage.removeItem(KEY);
  capturedPath = null;
  return null;
}
