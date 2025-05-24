"use client";

import React from "react";
import { X } from "@phosphor-icons/react";
import ErrorBoundary from "../layout/ErrorBoundary";
import Navigation, { NavigationItem } from "../layout/Navigation";
import ProjectSelector from "./ProjectSelector";
import Footer, { FooterLink } from "./Footer";
import { Theme } from "../../utils/theme";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectUrl: string;
  navigationItems: NavigationItem[];
  activePageId: string;
  setActivePageId: (id: string) => void;
  handleNavClick: () => void;
  theme: Theme;
  footerLinks: FooterLink[];
}

export default function Sidebar({
  isOpen,
  onClose,
  projectId,
  projectName,
  projectUrl,
  navigationItems,
  activePageId,
  setActivePageId,
  handleNavClick,
  theme,
  footerLinks
}: SidebarProps) {
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  // Create a new handler that combines setting the active page and closing sidebar
  const handleNavItemClick = (itemId: string) => {
    setActivePageId(itemId);
    handleNavClick(); // Close sidebar on mobile
  };

  return (
    <ErrorBoundary>
      <div
        className={`${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static top-0 left-0 z-30 w-72 lg:w-68 flex flex-col border-r h-screen overflow-hidden transition-all duration-300 ease-in-out`}
        style={{
          background: theme.navBg,
          borderColor: theme.sidebarBorder,
          boxShadow: isOpen ? "0 0 15px rgba(0,0,0,0.1)" : "none",
        }}
        tabIndex={isOpen ? 0 : -1}
        onKeyDown={handleKeyDown}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Close button for mobile - positioned at top right */}
        <div className="lg:hidden px-4 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2"
            aria-label="Close sidebar"
            style={{
              outlineColor: theme.lightAccent,
            }}
          >
            <X size={20} weight="bold" style={{ color: theme.accent }} />
          </button>
        </div>

        <ProjectSelector
          projectId={projectId}
          projectName={projectName}
          projectUrl={projectUrl}
          theme={theme}
        />

        {/* Navigation scrollable area */}
        <div
          className="flex-grow overflow-y-auto custom-scrollbar px-1"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: `${theme.textLight} transparent`,
          }}
        >
          <Navigation
            navigationItems={navigationItems}
            activePageId={activePageId}
            onNavItemClick={handleNavItemClick}
            theme={theme}
          />
        </div>

        <Footer
          footerLinks={footerLinks}
          onLinkClick={handleNavClick}
          theme={theme}
        />
      </div>
    </ErrorBoundary>
  );
}