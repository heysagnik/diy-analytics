import React from "react";

interface ProjectPageShellProps {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  mainClassName?: string;
}

export default function ProjectPageShell({
  children,
  eyebrow,
  title,
  description,
  actions,
  className = "",
  mainClassName = "flex flex-col gap-8",
}: ProjectPageShellProps) {
  const hasHeader = eyebrow || title || description || actions;

  return (
    <div className={`relative min-h-full w-full font-body ${className}`}>
      <main className={`relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8 ${mainClassName}`}>
        {hasHeader && (
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              {eyebrow && <p className="text-xs font-medium tracking-kicker text-accent">{eyebrow}</p>}
              {title && <h1 className="text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">{title}</h1>}
              {description && <p className="text-pretty max-w-lg text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
