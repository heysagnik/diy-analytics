"use client";

import React from "react";
import { ListIcon, CircleNotchIcon } from "@phosphor-icons/react";
import { Theme } from "../../utils/theme";

interface HeaderProps {
  onMenuToggle: () => void;
  projectName: string;
  theme: Theme;
  apiMode?: string;
  isLoading?: boolean;
}

export default function Header({ onMenuToggle, projectName, theme, apiMode, isLoading = false }: HeaderProps) {
  return (
    <header
      className="px-4 py-2 flex items-center border-b"
      style={{
        backgroundColor: theme.navBg,
        borderColor: theme.sidebarBorder,
      }}
    >
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-md hover:bg-opacity-20 hover:bg-gray-500 transition-colors focus:outline-none focus-visible:ring-2 active:bg-opacity-30"
        aria-label="Open sidebar"
        style={{
          outlineColor: theme.lightAccent,
        }}
      >
        <ListIcon size={24} weight="bold" style={{ color: theme.accent }} />
      </button>

      <div className="ml-4 lg:ml-0 flex items-center">
        <h1 className="text-lg font-semibold ml-1 truncate max-w-[200px]" style={{ color: theme.accent }}>
          {projectName}
        </h1>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="ml-2">
            <CircleNotchIcon className="animate-spin" size={16} style={{ color: theme.accent }} />
          </div>
        )}
        
        {apiMode && (
          <span 
            className="ml-3 text-xs px-1.5 py-0.5 rounded"
            style={{ 
              backgroundColor: apiMode === 'GraphQL' ? theme.lightAccent : theme.cardBorder,
              color: apiMode === 'GraphQL' ? theme.accent : theme.textLight
            }}
          >
            {apiMode}
          </span>
        )}
      </div>

      {/* Right side of header - could add user info, notifications, etc. */}
      <div className="ml-auto flex items-center">
        {/* Placeholder for future components */}
      </div>
    </header>
  );
}