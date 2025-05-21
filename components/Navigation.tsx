"use client";

import React from 'react';
import Link from 'next/link';
import { Theme } from '../utils/theme';
import ErrorBoundary from './ErrorBoundary';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
}

interface NavigationProps {
  navigationItems: NavigationItem[];
  activePageId: string;
  onNavItemClick: (itemId: string, href: string) => void;
  theme: Theme;
}

/**
 * Navigation component that renders a list of navigation items
 */
export default function Navigation({ 
  navigationItems, 
  activePageId, 
  onNavItemClick,
  theme
}: NavigationProps) {
  return (
    <ErrorBoundary>
      <nav className="flex-1 px-3.5 space-y-1 overflow-y-auto mt-4">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = item.id === activePageId;
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-4 px-4 py-3 rounded-lg text-base transition-all"
              onClick={() => onNavItemClick(item.id, item.href)}
              style={{
                background: isActive ? theme.activeBg : 'transparent',
                color: isActive ? theme.accent : theme.textLight,
                fontWeight: isActive ? 500 : 400,
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s ease"
              }}
              onMouseOver={!isActive ? (e) => {
                e.currentTarget.style.backgroundColor = theme.lightAccent;
                e.currentTarget.style.color = theme.accent;
              } : undefined}
              onMouseOut={!isActive ? (e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = theme.textLight;
              } : undefined}
            >
              <IconComponent size={24} weight={isActive ? "bold" : "regular"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </ErrorBoundary>
  );
}