'use client';

import { Button } from 'components/ui/Button';

/** Clear this origin, then top-level navigate to the hub `/logout` page. */
export function LogoutButton() {
  async function logout() {
    let next = '/login';
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const body = (await res.json()) as { next?: string };
      if (body?.next) next = body.next;
    } catch {
      /* still leave this origin */
    }
    window.location.assign(next);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
      Sign out
    </Button>
  );
}
