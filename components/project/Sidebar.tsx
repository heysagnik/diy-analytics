"use client";

import React, { useEffect, useRef } from "react";
import { XIcon, SidebarSimpleIcon } from "@phosphor-icons/react";
import Navigation, { NavigationItem } from "../layout/Navigation";
import ProjectSelector from "./ProjectSelector";
import Footer, { FooterLink } from "./Footer";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  projectId: string;
  projectName: string;
  projectUrl: string;
  workspaceId: string;
  workspaceSlug: string;
  navigationItems: NavigationItem[];
  activePageId: string;
  setActivePageId: (id: string) => void;
  handleNavClick: () => void;
  footerLinks: FooterLink[];
}

export default function Sidebar({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapsed,
  projectId,
  projectName,
  projectUrl,
  workspaceId,
  workspaceSlug,
  navigationItems,
  activePageId,
  setActivePageId,
  handleNavClick,
  footerLinks
}: SidebarProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)", true);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(isOpen);
  const isHidden = !isDesktop ? !isOpen : isCollapsed;

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && !activeElement.closest("aside")) {
        restoreFocusRef.current = activeElement;
      }
      if (!isDesktop) {
        requestAnimationFrame(() => closeButtonRef.current?.focus());
      }
    }
    if (!isOpen && wasOpenRef.current) {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    }
    wasOpenRef.current = isOpen;
  }, [isDesktop, isOpen]);

  useEffect(() => {
    if (isDesktop && isCollapsed) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-label="Expand sidebar"]')?.focus());
    }
  }, [isCollapsed, isDesktop]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const handleNavItemClick = (itemId: string) => {
    setActivePageId(itemId);
    handleNavClick();
  };

  return (
      <aside
        className={`fixed inset-y-0 left-0 z-50 lg:static flex flex-col h-screen w-64 flex-shrink-0 overflow-hidden border-r border-border bg-surface transition-[transform,opacity] duration-300 ease-in-out ${
          isCollapsed ? "lg:-translate-x-full lg:opacity-0 lg:-mr-64" : "lg:translate-x-0 lg:opacity-100"
        } ${
          isOpen ? "translate-x-0 shadow-[var(--overlay-shadow)]" : "-translate-x-full lg:translate-x-0"
        }`}
         tabIndex={isHidden ? -1 : undefined}
        onKeyDown={handleKeyDown}
        role="navigation"
        aria-label="Main navigation"
         aria-hidden={isHidden}
         inert={isHidden}
      >
        <div className="h-14 px-4 flex items-center justify-between w-64 border-b border-border flex-shrink-0">
          <div className="flex items-center min-w-0">
            <span className="font-display font-semibold text-sm leading-none tracking-[-0.03em] truncate">
              <span className="text-accent">DIY</span>
              <span className="text-foreground"> Analytics</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="relative text-muted-foreground hover:bg-surface-tertiary after:absolute after:-inset-1 after:content-['']" />

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onToggleCollapsed}
              className="relative hidden lg:flex text-muted-foreground hover:bg-surface-tertiary after:absolute after:-inset-1 after:content-['']"
              aria-label="Collapse sidebar"
            >
              <SidebarSimpleIcon size={16} weight="bold" />
            </Button>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              ref={closeButtonRef}
              className="relative lg:hidden text-muted-foreground hover:bg-surface-tertiary after:absolute after:-inset-1 after:content-['']"
              aria-label="Close sidebar"
            >
              <XIcon size={16} weight="bold" />
            </Button>
          </div>
        </div>

        <div className="w-64 border-b border-border">
          <ProjectSelector
            projectId={projectId}
            projectName={projectName}
            projectUrl={projectUrl}
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
          />
        </div>

        <div className="flex-grow overflow-y-auto scrollbar-thin px-2 py-3 w-64">
          <Navigation
            navigationItems={navigationItems}
            activePageId={activePageId}
            onNavItemClick={handleNavItemClick}
          />
        </div>

        <div className="w-64">
          <Footer
            footerLinks={footerLinks}
            onLinkClick={handleNavClick}
          />
        </div>
      </aside>
  );
}
