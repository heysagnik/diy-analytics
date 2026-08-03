"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";

interface ThemeToggleProps {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function ThemeToggle({ className, size = "icon-xs", variant = "ghost" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <span className="icon-crossfade size-4">
        <SunIcon size={16} weight="regular" className={isDark ? "icon-crossfade-hidden" : undefined} />
        <MoonIcon size={16} weight="regular" className={isDark ? undefined : "icon-crossfade-hidden"} />
      </span>
    </Button>
  );
}
