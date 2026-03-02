import type { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Login | MyNewStyle',
  description: 'Acesse sua conta no MyNewStyle para ver seu histórico de consultas e favoritos.',
};

/**
 * Login page - server component shell.
 * Renders the LoginForm client component for form interactivity.
 *
 * Per architecture Section 6.1: src/app/login/page.tsx
 * SSR-rendered static shell for SEO, client-side interactivity via LoginForm.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center" aria-busy="true" />}>
      <LoginForm />
    </Suspense>
  );
}
