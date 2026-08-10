'use client';

import {
  ArrowUpIcon,
  CircleNotchIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, type KeyboardEvent, Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import AuthField from '@/components/auth/AuthField';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthLayout from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';

const HEADLINE = 'Know exactly who’s on your site.';
const SUBTEXT =
  'Privacy-friendly, self-hosted analytics — no cookies, no data resale, deployed on your own infrastructure.';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated) router.replace(next);
      })
      .catch(() => {});
  }, [router, next]);

  const handleKeyEvent = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState('CapsLock'));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setIsError(false);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid email or password');
      }

      toast.success('Welcome back!');
      router.replace(next);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setIsError(true);
      setErrorMessage(message);
      toast.error(message);
      // Reset error shake class after animation completes
      setTimeout(() => setIsError(false), 450);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative w-full">
      <AuthHeader eyebrow="Secure access" title="Sign in" subtitle="Welcome back to your workspace." />

      <div
        className={`animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_both] ${isError ? 'animate-shake' : ''}`}
        style={{ animationDelay: '80ms' }}
      >
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <AuthField
            id="email"
            label="Email"
            icon={EnvelopeSimpleIcon}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />

          <AuthField
            id="password"
            label="Password"
            icon={LockIcon}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (isError) {
                setIsError(false);
                setErrorMessage('');
              }
            }}
            onKeyDown={handleKeyEvent}
            onKeyUp={handleKeyEvent}
            placeholder="••••••••"
            disabled={submitting}
            aria-invalid={isError}
            aria-describedby={errorMessage ? 'password-error' : undefined}
            labelSlot={
              capsLock && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-warning animate-fade-in">
                  <ArrowUpIcon size={12} weight="bold" />
                  Caps Lock ON
                </span>
              )
            }
            endSlot={
              // Keep both icons mounted so the visibility transition is interruptible.
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={submitting || !email || !password}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-40"
              >
                <span className="icon-crossfade size-4">
                  <EyeSlashIcon
                    size={16}
                    weight="bold"
                    className={showPassword ? undefined : 'icon-crossfade-hidden'}
                  />
                  <EyeIcon size={16} weight="bold" className={showPassword ? 'icon-crossfade-hidden' : undefined} />
                </span>
              </Button>
            }
          />

          {errorMessage && (
            <p
              id="password-error"
              role="alert"
              className="-mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive animate-fade-in"
            >
              <WarningCircleIcon size={14} weight="bold" className="shrink-0" />
              {errorMessage}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !password}
            className="h-11 w-full gap-2 rounded-lg text-base font-medium transition-[transform,background-color,opacity] duration-150 active:scale-[0.96]"
          >
            {submitting ? (
              <>
                <CircleNotchIcon size={16} weight="bold" className="animate-spin" />
                <span>Verifying…</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </Button>
        </form>
      </div>

      <p
        className="mt-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_both] text-pretty font-body text-sm text-muted-foreground"
        style={{ animationDelay: '160ms' }}
      >
        Don&apos;t have a workspace yet?{' '}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout headline={HEADLINE} subtext={SUBTEXT}>
      <Suspense fallback={<div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent" />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
