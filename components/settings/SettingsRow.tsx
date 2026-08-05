import React from 'react';

interface SettingsRowProps {
  label: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function SettingsRow({ label, description, action, children }: SettingsRowProps) {
  return (
    <div className="p-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex flex-col gap-0.5">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
