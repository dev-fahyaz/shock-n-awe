import { Suspense } from 'react';
import { redirect } from 'next/navigation';

import { isAdmin } from 'scene/auth/session';

import { LoginForm } from './LoginForm';

export const metadata = { robots: { index: false, follow: false }, title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await isAdmin()) redirect('/setup');

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-accent)]">
        Shock and Awe
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Admin only. Live scenes stay public; this dashboard does not.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
