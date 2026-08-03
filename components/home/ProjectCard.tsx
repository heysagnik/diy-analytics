import React from 'react';
import Link from 'next/link';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { Project } from '@/lib/api/projects';
import { normalizeProjectUrl } from '@/utils/url';

interface ProjectCardProps {
  project: Project;
  workspaceSlug: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, workspaceSlug }) => {
  const projectHref = `/${workspaceSlug}/projects/${project._id}`;
  const websiteHref = normalizeProjectUrl(project.url)?.href;
  const hasData = (project.analytics?.views ?? 0) > 0;

  return (
    <Card className="group relative p-6 hover:bg-surface-secondary hover:ring-foreground/20 transition-[background-color,box-shadow]">
      <Link
        href={projectHref}
        aria-label={`View analytics for ${project.name}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      <div className="pointer-events-none relative z-10 flex justify-between items-start mb-6">
        <div className="overflow-hidden">
          <CardTitle className="font-display text-lg font-medium tracking-[-0.02em] text-foreground truncate">
            {project.name}
          </CardTitle>
          {websiteHref ? (
            <a
              href={websiteHref}
              className="pointer-events-auto relative z-20 text-xs text-muted-foreground hover:text-foreground truncate block mt-1 font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              {project.url}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground truncate block mt-1 font-body">
              {project.url}
            </span>
          )}
        </div>
        <span
          aria-hidden
          className="grid place-items-center size-8 rounded-full border border-border text-foreground group-hover:border-primary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-[border-color,color,transform] flex-shrink-0"
        >
          <ArrowRightIcon size={14} weight="bold" />
        </span>
      </div>

      <div className="pointer-events-none relative z-10 flex items-center justify-between mt-auto pt-4 border-t border-border">
        <div className="flex space-x-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-label text-muted-foreground block">
              Views
            </span>
            <span className="font-display text-lg text-foreground mt-0.5 block tabular-nums">
              {project.analytics?.views.toLocaleString() || '0'}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-label text-muted-foreground block">
              Users
            </span>
            <span className="font-display text-lg text-foreground mt-0.5 block tabular-nums">
              {project.analytics?.users.toLocaleString() || '0'}
            </span>
          </div>
        </div>

        {hasData ? (
          <Badge
            className={
              project.analytics?.growth.startsWith("+")
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }
          >
            <span className="tabular-nums">{project.analytics?.growth}</span>
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-muted-foreground">
            No data
          </Badge>
        )}
      </div>
    </Card>
  );
};
