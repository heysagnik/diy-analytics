import { SidebarSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSidebar } from "@/components/ui/sidebar";

interface HeaderProps {
  projectName: string;
  isLoading?: boolean;
}

export default function Header({ projectName, isLoading = false }: HeaderProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="px-3 py-3 flex items-center gap-3 bg-surface-secondary/90 backdrop-blur-md sticky top-0 z-20">
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={toggleSidebar}
        aria-label="Open sidebar"
      >
        <SidebarSimpleIcon size={20} weight="bold" />
      </Button>

      <div className="flex items-center gap-2 min-w-0">
        <h1 className="font-display font-medium text-lg text-foreground truncate max-w-[220px]">
          {projectName}
        </h1>
        {isLoading && <Spinner className="size-4 text-muted-foreground flex-shrink-0" />}
      </div>
    </header>
  );
}