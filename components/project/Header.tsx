"use client";

import { CircleNotchIcon, SidebarSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onMenuToggle: () => void;
  projectName: string;
  isLoading?: boolean;
}

export default function Header({ onMenuToggle, projectName, isLoading = false }: HeaderProps) {
  return (
    <header className="px-3 py-3 flex items-center gap-3 bg-surface-secondary/90 backdrop-blur-md sticky top-0 z-20">
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onMenuToggle}
        aria-label="Open sidebar"
      >
        <SidebarSimpleIcon size={20} weight="bold" />
      </Button>

      <div className="flex items-center gap-2 min-w-0">
        <h1 className="font-display font-medium text-lg text-foreground truncate max-w-[220px]">
          {projectName}
        </h1>
        {isLoading && (
          <CircleNotchIcon className="animate-spin text-muted-foreground flex-shrink-0" size={16} />
        )}
      </div>
    </header>
  );
}