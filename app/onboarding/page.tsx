'use client';

import { BuildingsIcon, CircleNotchIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import AuthField from '@/components/auth/AuthField';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthLayout from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';

const HEADLINE = 'One workspace, every project.';
const SUBTEXT = 'Invite teammates, connect as many sites as you like, and see it all from a single dashboard.';

export default function OnboardingPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.authenticated) {
          router.replace('/login?next=/onboarding');
          return;
        }
        // Already has a workspace (e.g. revisited this URL) — skip straight in.
        if (d.workspaces?.length > 0) {
          router.replace(`/${d.workspaces[0].slug}`);
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    setIsError(false);

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create workspace');
      }
      const body = await response.json();
      router.replace(`/${body.workspaceSlug}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace';
      setIsError(true);
      setError(message);
      setTimeout(() => setIsError(false), 450);
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <AuthLayout headline={HEADLINE} subtext={SUBTEXT}>
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline={HEADLINE} subtext={SUBTEXT}>
      <div className="relative w-full">
        <AuthHeader
          eyebrow="One more step"
          title="Name your workspace"
          subtitle="Projects, teammates, and analytics all live inside a workspace."
        />

        <div
          className={`animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_both] ${isError ? 'animate-shake' : ''}`}
          style={{ animationDelay: '80ms' }}
        >
          <form className="space-y-5" onSubmit={submit} noValidate>
            <AuthField
              id="workspaceName"
              label="Workspace name"
              icon={BuildingsIcon}
              type="text"
              autoComplete="organization"
              autoFocus
              required
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Acme Inc."
              disabled={submitting}
            />

            {error && (
              <p
                role="alert"
                className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-fade-in"
              >
                <WarningCircleIcon size={14} weight="bold" className="shrink-0" />
                {error}
              </p>
            )}

            <Button
              className="h-11 w-full gap-2 rounded-lg text-base font-medium transition-[transform,background-color,opacity] duration-150 active:scale-[0.96]"
              type="submit"
              disabled={submitting || !workspaceName.trim()}
            >
              {submitting ? (
                <>
                  <CircleNotchIcon size={16} weight="bold" className="animate-spin" />
                  <span>Creating workspace…</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}
