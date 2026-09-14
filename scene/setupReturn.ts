/** Read `?setup=` without `useSearchParams`, so the scene route stays static. */

export function setupReturnId(): string | null {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('setup');
  return id && id.trim() ? id.trim() : null;
}
