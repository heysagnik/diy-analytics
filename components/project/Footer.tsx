"use client";

import React from "react";
import Link from "next/link";
import ErrorBoundary from "../layout/ErrorBoundary";
import { Theme } from "../../utils/theme";

export interface FooterLink {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface FooterProps {
  footerLinks: FooterLink[];
  onLinkClick: () => void;
  theme: Theme;
}

export default function Footer({ footerLinks, onLinkClick, theme }: FooterProps) {
  return (
    <ErrorBoundary>
      <div 
        className="p-3 space-y-1 mt-auto border-t" 
        style={{ 
          borderColor: theme.cardBorder,
          background: theme.navBg
        }}
      >
        {footerLinks.map((link, i) => (
          <Link 
            key={i} 
            href={link.href}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all hover:bg-opacity-80"
            onClick={onLinkClick}
            style={{ color: theme.textLight }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = theme.lightAccent;
              e.currentTarget.style.color = theme.accent;
              e.currentTarget.style.transform = 'translateX(3px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.textLight;
              e.currentTarget.style.transform = 'translateX(0)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.backgroundColor = theme.lightAccent;
              e.currentTarget.style.color = theme.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.textLight;
            }}
          >
            <span className="flex-shrink-0">{link.icon}</span>
            <span className="truncate">{link.label}</span>
          </Link>
        ))}
      </div>
    </ErrorBoundary>
  );
}