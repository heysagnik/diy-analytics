import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from '@/components/ui/card';
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
    <Card className="group relative hover:bg-surface-secondary hover:ring-foreground/20 transition-[background-color,box-shadow]">
      <Link
        href={projectHref}
        aria-label={`View analytics for ${project.name}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background z-20"
      />

      <CardHeader className="flex-row justify-between items-start">
        <div className="overflow-hidden flex-1">
          <CardTitle className="font-display text-lg font-medium tracking-[-0.02em] text-foreground truncate">
            {project.name}
          </CardTitle>
          <CardDescription className="mt-1">
            {websiteHref ? (
              <a
                href={websiteHref}
                className="pointer-events-auto relative z-30 text-xs text-muted-foreground hover:text-foreground truncate block font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                {project.url}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground truncate block font-body">
                {project.url}
              </span>
            )}
          </CardDescription>
        </div>
        <CardAction className="relative z-10 flex-shrink-0 ml-4">
          <span
            aria-hidden
            className="grid place-items-center size-8 rounded-full border border-border text-foreground group-hover:border-primary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-[border-color,color,transform]"
          >
            <ArrowRightIcon size={14} weight="bold" />
          </span>
        </CardAction>
      </CardHeader>

      <CardContent className="pointer-events-none relative z-10 flex items-center justify-between border-t border-border pt-4">
        <div className="flex gap-6">
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
      </CardContent>
    </Card>
  );
};
