import type React from 'react';
import { Card } from '@/components/ui/card';

interface MetricTileProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  footnote?: React.ReactNode;
  idx?: number;
}

export function MetricTile({ icon, label, value, footnote, idx = 0 }: MetricTileProps) {
  return (
    <Card
      className="p-4 flex flex-col justify-between gap-3 animate-fade-in transition-shadow duration-200 hover:shadow-md"
      style={{ animationDelay: `${idx * 80}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="label-eyebrow text-muted-foreground">{label}</span>
        <span className="icon-chip size-6 rounded-md flex items-center justify-center text-muted-foreground">{icon}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</span>
        {footnote}
      </div>
    </Card>
  );
}
