'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthHeader from '@/components/auth/AuthHeader';
import AuthField from '@/components/auth/AuthField';
import {
  CircleNotchIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockIcon,
  UserIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';

const MIN_PASSWORD_LENGTH = 10;
const HEADLINE = 'Own your analytics, end to end.';
const SUBTEXT = 'Deploy in three steps, keep every event on infrastructure you control, and skip the cookie banner entirely.';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      if (isError) {
        setIsError(false);
        setError('');
      }
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    setIsError(false);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create account');
      }
      const body = await response.json().catch(() => ({}));
      router.replace(body.workspaceSlug ? `/${body.workspaceSlug}` : '/onboarding');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setIsError(true);
      setError(message);
      setTimeout(() => setIsError(false), 450);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout headline={HEADLINE} subtext={SUBTEXT}>
      <div className="relative w-full">
        <AuthHeader eyebrow="Create account" title="Create your account" subtitle="You'll set up your workspace right after this." />

        <div
          className={`animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_both] ${isError ? 'animate-shake' : ''}`}
          style={{ animationDelay: '80ms' }}
        >
          <form className="space-y-5" onSubmit={submit} noValidate>
            <AuthField
              id="name"
              label="Name"
              icon={UserIcon}
              type="text"
              autoComplete="name"
              required
              value={form.name}
              onChange={update('name')}
              disabled={submitting}
            />

            <AuthField
              id="email"
              label="Email"
              icon={EnvelopeSimpleIcon}
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={update('email')}
              disabled={submitting}
            />

            <AuthField
              id="password"
              label="Password"
              icon={LockIcon}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              required
              value={form.password}
              onChange={update('password')}
              placeholder="••••••••"
              disabled={submitting}
              aria-invalid={isError}
              aria-describedby="password-hint"
              endSlot={
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={submitting || !form.password}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-40"
                >
                  <span className="icon-crossfade size-4">
                    <EyeSlashIcon size={16} weight="bold" className={showPassword ? undefined : 'icon-crossfade-hidden'} />
                    <EyeIcon size={16} weight="bold" className={showPassword ? 'icon-crossfade-hidden' : undefined} />
                  </span>
                </Button>
              }
            />
            <p id="password-hint" className="-mt-3 text-xs text-muted-foreground">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>

            {error && (
              <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive animate-fade-in">
                <WarningCircleIcon size={14} weight="bold" className="shrink-0" />
                {error}
              </p>
            )}

            <Button
              className="h-11 w-full gap-2 rounded-lg text-base font-medium transition-[transform,background-color,opacity] duration-150 active:scale-[0.96]"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <CircleNotchIcon size={16} weight="bold" className="animate-spin" />
                  <span>Creating account…</span>
                </>
              ) : (
                <span>Create account</span>
              )}
            </Button>
          </form>
        </div>

        <p
          className="mt-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_both] text-pretty font-body text-sm text-muted-foreground"
          style={{ animationDelay: '160ms' }}
        >
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
