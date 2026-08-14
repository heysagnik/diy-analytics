import Link from 'next/link';
import type React from 'react';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

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

export default function Navigation({ navigationItems, activePageId, onNavItemClick }: NavigationProps) {
  return (
    <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
      {navigationItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = item.id === activePageId;

        return (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              isActive={isActive}
              tooltip={item.label}
              className={`relative flex items-center transition-all duration-150 active:scale-[0.96] rounded-md gap-2.5 px-3 py-1.5 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mx-auto ${
                isActive
                  ? 'bg-accent! text-accent-foreground! font-semibold shadow-xs'
                  : 'font-medium text-muted-foreground hover:text-foreground hover:bg-surface-tertiary/60'
              }`}
              render={
                <Link
                  href={item.href}
                  onClick={() => onNavItemClick(item.id, item.href)}
                  aria-current={isActive ? 'page' : undefined}
                />
              }
            >
              <IconComponent
                size={18}
                weight={isActive ? 'fill' : 'regular'}
                className={isActive ? 'text-accent-foreground!' : ''}
              />
              <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
