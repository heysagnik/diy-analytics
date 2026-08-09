"use client";

import React from "react";
import Navigation, { NavigationItem } from "../layout/Navigation";
import ProjectSelector from "./ProjectSelector";
import Footer, { FooterLink } from "./Footer";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { StarFourIcon } from "@phosphor-icons/react";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

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
  footerLinks
}: SidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleNavItemClick = (itemId: string) => {
    setActivePageId(itemId);
    setOpenMobile(false);
  };

  return (
    <ShadcnSidebar collapsible="icon" className="border-r border-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="border-b border-border p-2">
        <div className="flex h-10 items-center justify-between px-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <StarFourIcon size={20} weight="fill" className="shrink-0 text-foreground" />
              <span className="font-sans font-semibold text-base leading-none tracking-[-0.03em] truncate text-foreground">
                diy-analytics
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <ThemeToggle className="relative text-muted-foreground hover:bg-surface-tertiary" />
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
        <Navigation
          navigationItems={navigationItems}
          activePageId={activePageId}
          onNavItemClick={handleNavItemClick}
        />
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-0">
        <Footer
          footerLinks={footerLinks}
          onLinkClick={() => setOpenMobile(false)}
        />
      </SidebarFooter>
      <SidebarRail />
    </ShadcnSidebar>
  );
}
