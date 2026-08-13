'use client';

import { LockIcon, ShieldCheckIcon } from '@phosphor-icons/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthLayout from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';

const FIELDS = [
  'client_id',
  'redirect_uri',
  'state',
  'code_challenge',
  'code_challenge_method',
  'scope',
  'response_type',
];

function ConsentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'checking' | 'ready'>('checking');
  const [clientName, setClientName] = useState<string | null>(null);

  const clientId = searchParams.get('client_id');
  const search = searchParams.toString();

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.authenticated) {
          router.replace(`/login?next=${encodeURIComponent(`/oauth/consent?${search}`)}`);
          return;
        }
        setStatus('ready');
      })
      .catch(() => router.replace('/login'));
  }, [router, search]);

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/mcp/oauth/client-info?client_id=${encodeURIComponent(clientId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setClientName(d?.clientName ?? null))
      .catch(() => setClientName(null));
  }, [clientId]);

  if (!clientId || !searchParams.get('redirect_uri') || !searchParams.get('code_challenge')) {
    return <p className="text-sm text-destructive">Invalid authorization request — missing required parameters.</p>;
  }

  if (status === 'checking') {
    return <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent" />;
  }

  return (
    <div className="relative w-full">
      <AuthHeader
        eyebrow="Authorize access"
        title="Connect an application"
        subtitle={`${clientName ?? 'An application'} wants to access your DIY Analytics account.`}
      />

      <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <ShieldCheckIcon size={18} weight="bold" className="mt-0.5 shrink-0 text-accent" />
        <p>
          This grants read-only access to your analytics — the same data you can see in the dashboard. It cannot change
          your password or delete anything.
        </p>
      </div>

      <form method="POST" action="/api/mcp/oauth/consent" className="mt-6 space-y-3">
        {FIELDS.map((name) => {
          const value = searchParams.get(name);
          return value ? <input key={name} type="hidden" name={name} value={value} /> : null;
        })}

        <Button
          type="submit"
          name="decision"
          value="approve"
          className="h-11 w-full gap-2 rounded-lg text-base font-medium"
        >
          <LockIcon size={16} weight="bold" />
          Approve
        </Button>
        <Button
          type="submit"
          name="decision"
          value="deny"
          variant="ghost"
          className="h-11 w-full rounded-lg text-base font-medium text-muted-foreground"
        >
          Deny
        </Button>
      </form>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <AuthLayout headline="Connect an application" subtext="Grant an MCP client read-only access to your analytics.">
      <Suspense fallback={<div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent" />}>
        <ConsentForm />
      </Suspense>
    </AuthLayout>
  );
}
