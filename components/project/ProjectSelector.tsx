"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CaretDownIcon, PlusIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { normalizeProjectUrl } from "@/utils/url";
import { Button } from "@/components/ui/button";

interface ProjectSelectorProps {
  projectId: string;
  projectName: string;
  projectUrl: string;
  workspaceId: string;
  workspaceSlug: string;
}

function ProjectAvatar({ name, url }: { name: string; url: string }) {
  const [showFavicon, setShowFavicon] = useState(true);
  const hostname = normalizeProjectUrl(url)?.hostname;

  if (showFavicon && hostname) {
    return (
      <div className="w-5 h-5 rounded-full flex-shrink-0 relative overflow-hidden bg-surface-secondary outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
        <Image
          src={`https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`}
          alt={`${name} favicon`}
          width={20}
          height={20}
          className="rounded-full"
          onError={() => setShowFavicon(false)}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xs font-bold flex-shrink-0">
      {name ? name.charAt(0).toUpperCase() : '#'}
    </div>
  );
}

export default function ProjectSelector({ projectId, projectName, projectUrl, workspaceId, workspaceSlug }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Array<{_id: string, name: string, url: string}>>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projects?workspaceId=${encodeURIComponent(workspaceId)}`);
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
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
  }, [workspaceId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProjectSelect = (id: string) => {
    router.push(`/${workspaceSlug}/projects/${id}`);
    setIsOpen(false);
  };

  return (
      <div className="px-3 py-2.5 relative" ref={dropdownRef}>
        <Button
          variant="outline"
          size="lg"
          type="button"
          className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-md border border-border bg-surface text-foreground hover:bg-surface-secondary transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <ProjectAvatar name={projectName} url={projectUrl} />
          <span className="font-medium text-sm flex-1 truncate text-foreground">{projectName}</span>
          <CaretDownIcon aria-hidden="true"
            size={16}
             className={`flex-shrink-0 text-muted-foreground transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`}
          />
        </Button>

          {isOpen && (
          <div className="absolute mt-2 left-3 right-3 origin-top rounded-xl border border-border bg-surface shadow-xl z-50 flex flex-col overflow-hidden transition-[opacity,transform] duration-200 ease-out starting:opacity-0 starting:scale-95">
            <div className="max-h-56 overflow-y-auto scrollbar-thin p-1.5">
              {loading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Loading projects...
                </div>
              ) : projects.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No projects available
                </div>
              ) : (
                <div className="space-y-1">
                  {projects.map((project) => {
                    const isActive = project._id === projectId;
                    return (
                      <button
                        key={project._id}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          isActive
                            ? 'bg-surface-tertiary text-foreground font-medium'
                            : 'text-muted-foreground hover:bg-surface-secondary'
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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-1.5 pt-1 border-t border-border shrink-0">
              <Link
                 href={`/${workspaceSlug}`}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium text-accent-foreground bg-accent hover:opacity-90 rounded-md transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <PlusIcon size={14} weight="bold" />
                Create New Project
              </Link>
            </div>
          </div>
        )}
      </div>
  );
}
