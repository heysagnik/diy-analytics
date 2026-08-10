import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AuthBrandPanel from './AuthBrandPanel';

interface AuthLayoutProps {
  children: React.ReactNode;
  headline: string;
  subtext: string;
}

/**
 * Split-screen shell for /login, /register, /onboarding: a fixed dark brand
 * panel on the left, the form on the right. The form panel follows the
 * app's normal theme (light/dark/system) — only the brand panel is fixed
 * dark, since that's a brand identity choice, not a themeable surface.
 */
export default function AuthLayout({ children, headline, subtext }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Capped width keeps the split from turning into a dead expanse on
          ultra-wide displays; outside it the page still matches the theme. */}
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <AuthBrandPanel headline={headline} subtext={subtext} />

        {/* Lifted a step off the brand panel (surface-1, not raw background)
            so the two halves read as distinct surfaces even in dark mode,
            where both would otherwise resolve to the same near-black. */}
        <div className="relative flex flex-1 flex-col border-l border-border bg-surface text-foreground selection:bg-accent/20">
          {/* Compact brand mark shown only when the dark panel is hidden (mobile/tablet). */}
          <div className="flex h-14 items-center px-6 lg:hidden">
            <Link href="/" aria-label="DIY Analytics">
              <Image src="/brand/logo.svg" alt="DIY Analytics" width={91} height={12} className="h-5 w-auto dark:hidden" />
              <Image src="/brand/logo-dark.svg" alt="DIY Analytics" width={91} height={12} className="hidden h-5 w-auto dark:block" />
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-10">
            <div className="w-full max-w-sm">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
