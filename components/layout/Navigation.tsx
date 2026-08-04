"use client";

import React from 'react';
import Link from 'next/link';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
}

interface NavigationProps {
  navigationItems: NavigationItem[];
  activePageId: string;
  onNavItemClick: (itemId: string, href?: string) => void;
}

export default function Navigation({
  navigationItems,
  activePageId,
  onNavItemClick,
}: NavigationProps) {
  return (
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = item.id === activePageId;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-md text-sm transition-colors before:absolute before:left-1 before:inset-y-2 before:w-[3px] before:rounded-full before:bg-accent before:transition-[opacity,transform] before:duration-200 before:ease-out ${
                isActive
                  ? 'bg-accent/10 text-accent font-semibold before:opacity-100 before:scale-y-100'
                  : 'font-medium text-muted-foreground hover:text-foreground hover:bg-surface-tertiary/60 before:opacity-0 before:scale-y-50'
              }`}
              onClick={() => onNavItemClick(item.id, item.href)}
            >
              <div className="icon-container flex items-center justify-center">
                <IconComponent
                  size={18}
                  weight={isActive ? "bold" : "regular"}
                  className={isActive ? 'text-accent' : ''}
                />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
  );
}
