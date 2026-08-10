"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { CircleNotchIcon, SignOutIcon } from '@phosphor-icons/react';

export default function LogoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'clearing' | 'done'>('clearing');

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/auth/logout', { method: 'POST' })
        .catch(() => { })
        .finally(() => {
          setStatus('done');
          setTimeout(() => {
            router.replace('/login');
            router.refresh();
          }, 300);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-surface-secondary text-foreground px-4 py-12 overflow-hidden select-none">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(94,106,210,0.12),transparent_100%)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(94,106,210,0.18),transparent_100%)]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">
        <Card className="p-8 rounded-2xl bg-card/95 backdrop-blur-md shadow-[0_0_0_1px_rgba(8,9,10,0.08),0_8px_24px_-6px_rgba(8,9,10,0.08),0_20px_48px_-12px_rgba(8,9,10,0.06)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_-6px_rgba(0,0,0,0.5)] text-center animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-muted text-foreground mb-4 ring-1 ring-border shadow-sm">
            {status === 'clearing' ? (
              <CircleNotchIcon size={24} weight="bold" className="animate-spin text-accent" />
            ) : (
              <SignOutIcon size={24} weight="bold" className="text-accent" />
            )}
          </div>

          <h2 className="font-display font-semibold text-xl text-foreground tracking-[-0.02em]">
            {status === 'clearing' ? 'Signing out…' : 'Signed out'}
          </h2>

          <p className="text-xs text-muted-foreground mt-1.5 font-body text-pretty">
            {status === 'clearing'
              ? 'Revoking your active session'
              : 'Redirecting to sign in…'}
          </p>
        </Card>
      </div>
    </div>
  );
}
