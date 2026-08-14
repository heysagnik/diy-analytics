'use client';

import { SidebarSimpleIcon, StarFourIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Navigation, { type NavigationItem } from '../layout/Navigation';
import Footer, { type FooterLink } from './Footer';
import ProjectSelector from './ProjectSelector';

interface SidebarProps {
  projectId: string;
  projectName: string;
  projectUrl: string;
  workspaceId: string;
  workspaceSlug: string;
  navigationItems: NavigationItem[];
  activePageId: string;
  setActivePageId: (id: string) => void;
  footerLinks: FooterLink[];
}

export default function Sidebar({
  projectId,
  projectName,
  projectUrl,
  workspaceId,
  workspaceSlug,
  navigationItems,
  activePageId,
  setActivePageId,
  footerLinks,
}: SidebarProps) {
  const { state, setOpenMobile, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleNavItemClick = (itemId: string) => {
    setActivePageId(itemId);
    setOpenMobile(false);
  };

  return (
    <ShadcnSidebar collapsible="icon" className="border-r border-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="border-b border-border p-2">
        <div className={cn('flex h-10 items-center px-2', isCollapsed ? 'justify-center' : 'justify-between')}>
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2 min-w-0 rounded-md">
              <StarFourIcon size={20} weight="fill" className="shrink-0 text-foreground" />
              <span className="font-sans font-semibold text-base leading-none tracking-[-0.03em] truncate text-foreground">
                diy-analytics
              </span>
            </Link>
          )}
          <div className={cn('flex items-center gap-1.5', !isCollapsed && 'ml-auto')}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:bg-surface-tertiary"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <SidebarSimpleIcon size={20} />
            </Button>
          </div>
        </div>
      </SidebarHeader>

      <ProjectSelector
        projectId={projectId}
        projectName={projectName}
        projectUrl={projectUrl}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        collapsed={isCollapsed}
      />

      <SidebarContent className="px-2 py-3">
        <Navigation navigationItems={navigationItems} activePageId={activePageId} onNavItemClick={handleNavItemClick} />
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <Footer footerLinks={footerLinks} onLinkClick={() => setOpenMobile(false)} />
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
}
