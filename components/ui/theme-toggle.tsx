'use client';

import { MoonIcon, SunIcon } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ButtonSize = 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';

interface ThemeToggleProps {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  iconSize?: number;
}

export function ThemeToggle({ className, size = 'icon-xs', variant = 'ghost', iconSize = 16 }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size={size}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`relative active:translate-y-0 active:scale-[0.96] before:absolute before:-inset-2 before:content-[''] ${className ?? ''}`}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <span className="icon-crossfade" style={{ width: iconSize, height: iconSize }}>
              <SunIcon size={iconSize} weight="regular" className={isDark ? 'icon-crossfade-hidden' : undefined} />
              <MoonIcon size={iconSize} weight="regular" className={isDark ? undefined : 'icon-crossfade-hidden'} />
            </span>
          </Button>
        }
      />
      <TooltipContent side="right" className="whitespace-nowrap">
        {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      </TooltipContent>
    </Tooltip>
  );
}
