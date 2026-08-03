import React from 'react';

interface AuthHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export default function AuthHeader({ eyebrow, title, subtitle }: AuthHeaderProps) {
  return (
    <div className="mb-8 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_both]" style={{ animationDelay: '0ms' }}>
      <p className="text-xs font-medium tracking-kicker text-accent">{eyebrow}</p>
      <h1 className="mt-1.5 text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
        {title}
      </h1>
      <p className="mt-2 text-pretty font-body text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
