import React from 'react';

interface SettingsGroupProps {
  title: string;
  headerAction?: React.ReactNode;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
}

export function SettingsGroup({ title, headerAction, tone = 'default', children }: SettingsGroupProps) {
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-xl border bg-card ${
        tone === 'danger' ? 'border-danger/30' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <h2
          className={`text-xs font-medium tracking-kicker ${
            tone === 'danger' ? 'text-danger' : 'text-accent'
          }`}
        >
          {title}
        </h2>
        {headerAction}
      </div>
      <div className="divide-y divide-border border-t border-border">{children}</div>
    </div>
  );
}
