"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretDownIcon, PlusIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { normalizeProjectUrl } from "@/utils/url";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectSelectorProps {
  projectId: string;
  projectName: string;
  projectUrl: string;
  workspaceId: string;
  workspaceSlug: string;
  collapsed?: boolean;
}

function ProjectAvatar({ name, url }: { name: string; url: string }) {
  const [failed, setFailed] = useState(false);
  const hostname = normalizeProjectUrl(url)?.hostname;

  if (hostname && !failed) {
    return (
      <div className="size-5 rounded-full flex-shrink-0 relative overflow-hidden bg-surface-secondary outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/site-icon?domain=${encodeURIComponent(hostname)}`}
          alt={`${name} icon`}
          width={20}
          height={20}
          className="rounded-full size-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="size-5 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function ProjectSelector({
  projectId,
  projectName,
  projectUrl,
  workspaceId,
  workspaceSlug,
  collapsed = false,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Array<{_id: string, name: string, url: string}>>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  // Tracks which workspace the current `projects` list was fetched for, so
  // reopening the dropdown reuses the cached list instead of re-fetching
  // (and re-showing "Loading projects...") on every open.
  const fetchedForWorkspace = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || fetchedForWorkspace.current === workspaceId) return;

    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projects?workspaceId=${encodeURIComponent(workspaceId)}`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
          fetchedForWorkspace.current = workspaceId;
        } else {
          console.error('Failed to fetch projects');
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [isOpen, workspaceId]);

  const handleProjectSelect = (id: string) => {
    router.push(`/${workspaceSlug}/projects/${id}`);
    setIsOpen(false);
  };

  return (
    <div className="px-3 py-2.5">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="lg"
              type="button"
              className={`w-full justify-start gap-2.5 text-left ${collapsed ? 'justify-center p-2' : 'px-2.5 py-2.5'}`}
              aria-expanded={isOpen}
            />
          }
        >
          <ProjectAvatar name={projectName} url={projectUrl} />
          {!collapsed && (
            <>
              <span className="font-medium text-sm flex-1 truncate text-foreground">{projectName}</span>
              <CaretDownIcon
                aria-hidden="true"
                size={16}
                className={`flex-shrink-0 text-muted-foreground transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`}
              />
            </>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72 p-1.5">
          <div className="max-h-56 overflow-y-auto scrollbar-thin">
            {loading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No projects available
              </div>
            ) : (
              projects.map((project) => {
                const isActive = project._id === projectId;
                return (
                  <DropdownMenuItem
                    key={project._id}
                    className={`gap-2.5 px-3 py-2 text-xs ${
                      isActive ? 'bg-surface-tertiary text-foreground font-medium' : 'text-muted-foreground'
                    }`}
                    onClick={() => handleProjectSelect(project._id)}
                  >
                    <ProjectAvatar name={project.name} url={project.url} />
                    <div className="flex-1 overflow-hidden">
                      <span className="block truncate">{project.name || 'Unnamed Project'}</span>
                    </div>
                    {isActive && (
                      <Badge className="bg-accent text-accent-foreground">
                        Active
                      </Badge>
                    )}
                  </DropdownMenuItem>
                );
              })
            )}
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            render={<Link href={`/${workspaceSlug}`} />}
            className="justify-center gap-1.5 px-3 py-2 text-xs font-medium text-accent-foreground bg-accent focus:bg-accent focus:text-accent-foreground hover:opacity-90"
          >
            <PlusIcon size={14} weight="bold" />
            Create New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
