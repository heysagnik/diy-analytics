"use client";

import React from "react";
import Link from "next/link";

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
      <div className="p-2.5 space-y-0.5 mt-auto border-t border-border">
        {footerLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            aria-label={link.label}
            className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-tertiary rounded-md transition-colors duration-150"
          >
            <span className="flex-shrink-0 text-muted-foreground">{link.icon}</span>
            <span className="truncate">{link.label}</span>
          </Link>
        ))}
      </div>
  );
}
