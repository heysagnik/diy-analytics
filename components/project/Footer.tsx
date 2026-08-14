import { MoonIcon, SunIcon } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import * as React from 'react';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

export interface FooterLink {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface FooterProps {
  footerLinks: FooterLink[];
  onLinkClick: () => void;
}

export default function Footer({ footerLinks, onLinkClick }: FooterProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <SidebarMenu className="gap-0.5 p-2">
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-tertiary rounded-md transition-colors duration-150"
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <span className="flex-shrink-0 text-muted-foreground">
            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </span>
          <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {footerLinks.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            tooltip={link.label}
            className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-tertiary rounded-md transition-colors duration-150"
            render={<Link href={link.href} onClick={onLinkClick} aria-label={link.label} />}
          >
            <span className="flex-shrink-0 text-muted-foreground">{link.icon}</span>
            <span>{link.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
