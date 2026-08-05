import React from 'react';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

export interface RetentionCohort {
  cohortWeek: string;
  cohortSize: number;
  retention: number[];
}

interface RetentionHeatmapProps {
  cohorts: RetentionCohort[];
  weeks: number;
}

function cellColor(pct: number): string {
  if (pct === 0) return 'bg-surface-secondary text-muted-foreground';
  if (pct < 10) return 'bg-accent/10 text-foreground';
  if (pct < 25) return 'bg-accent/25 text-foreground';
  if (pct < 45) return 'bg-accent/45 text-accent-foreground';
  if (pct < 65) return 'bg-accent/65 text-accent-foreground';
  return 'bg-accent text-accent-foreground';
}

export const RetentionHeatmap: React.FC<RetentionHeatmapProps> = ({ cohorts, weeks }) => {
  if (!cohorts.length) {
    return (
      <Empty className="py-16 bg-surface shadow-[var(--surface-shadow)] border border-border rounded-xl">
        <EmptyHeader>
          <EmptyTitle className="text-sm font-medium text-foreground">Not enough data yet</EmptyTitle>
          <EmptyDescription className="text-xs text-muted-foreground max-w-sm">
            Retention cohorts build up as returning visitors are tracked across weeks.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin border border-border rounded-xl bg-surface shadow-[var(--surface-shadow)]">
      <table className="border-collapse w-full text-xs">
        <thead>
          <tr>
            <th className="text-left font-medium text-muted-foreground px-3 py-2 sticky left-0 bg-surface">Cohort</th>
            <th className="text-right font-medium text-muted-foreground px-3 py-2">Size</th>
            {Array.from({ length: weeks }, (_, i) => (
              <th key={`week-${i}`} className="text-center font-medium text-muted-foreground px-2 py-2 min-w-[52px]">
                W{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr key={cohort.cohortWeek} className="border-t border-border">
              <td className="px-3 py-2 text-foreground whitespace-nowrap sticky left-0 bg-surface">
                {new Date(cohort.cohortWeek).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{cohort.cohortSize}</td>
              {Array.from({ length: weeks }, (_, i) => {
                const pct = cohort.retention[i];
                const cellKey = `${cohort.cohortWeek}:week-${i}`;
                if (pct === undefined) return <td key={cellKey} className="px-1 py-1" />;
                return (
                  <td key={cellKey} className="px-1 py-1">
                    <div className={`rounded-md px-2 py-1.5 text-center tabular-nums font-medium ${cellColor(pct)}`}>
                      {pct}%
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
