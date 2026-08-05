import React from "react";
import Link from "next/link";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";

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
  return (
    <SidebarMenu className="gap-0.5 p-2">
      {footerLinks.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton
            tooltip={link.label}
            className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-tertiary rounded-md transition-colors duration-150"
            render={
              <Link
                href={link.href}
                onClick={onLinkClick}
                aria-label={link.label}
              />
            }
          >
            <span className="flex-shrink-0 text-muted-foreground">{link.icon}</span>
            <span>{link.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
