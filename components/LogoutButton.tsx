'use client';

import { useRouter } from 'next/navigation';

import { Button } from 'components/ui/Button';

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
      Sign out
    </Button>
  );
}
