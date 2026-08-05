import React from 'react';

export interface FunnelStepResult {
  step: number;
  label: string;
  matchValue: string;
  count: number;
  dropoffPct: number;
}

interface FunnelChartProps {
  steps: FunnelStepResult[];
}

export const FunnelChart: React.FC<FunnelChartProps> = ({ steps }) => {
  if (!steps.length) return null;
  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, idx) => {
        const widthPct = (step.count / maxCount) * 100;
        const retainedPct = idx === 0 || steps[0].count === 0 ? 100 : Math.round((step.count / steps[0].count) * 10000) / 100;

        return (
          <div key={step.step}>
            {idx > 0 && (
              <div className="flex items-center gap-2 pl-1 py-1 text-xs text-danger">
                <span>−{step.dropoffPct}% drop-off</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-sm text-foreground truncate" title={step.label}>
                {step.label}
              </div>
              <div className="flex-1 h-8 bg-surface-secondary rounded-md overflow-hidden">
                <div
                  className="h-full w-full bg-accent rounded-md flex items-center justify-end px-2 transition-[clip-path] duration-500 ease-out"
                  style={{ clipPath: `inset(0 ${100 - Math.max(widthPct, 2)}% 0 0)` }}
                >
                  <span className="text-xs font-semibold text-accent-foreground tabular-nums">
                    {step.count.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-16 shrink-0 text-right text-xs font-medium text-muted-foreground tabular-nums">
                {retainedPct}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
