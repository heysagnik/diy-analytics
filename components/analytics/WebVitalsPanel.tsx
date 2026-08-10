import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WebVitalData } from '@/types/analytics';

interface WebVitalsPanelProps {
  webVitals: WebVitalData[];
}

// Thresholds match Google's Core Web Vitals rating bands.
const THRESHOLDS: Record<WebVitalData['metric'], { good: number; poor: number; format: (v: number) => string }> = {
  LCP: { good: 2500, poor: 4000, format: (v) => `${(v / 1000).toFixed(2)}s` },
  CLS: { good: 0.1, poor: 0.25, format: (v) => v.toFixed(3) },
  INP: { good: 200, poor: 500, format: (v) => `${Math.round(v)}ms` },
};

const METRIC_LABELS: Record<WebVitalData['metric'], string> = {
  LCP: 'Largest Contentful Paint',
  CLS: 'Cumulative Layout Shift',
  INP: 'Interaction to Next Paint',
};

function ratingFor(metric: WebVitalData['metric'], value: number): { label: string; className: string } {
  const t = THRESHOLDS[metric];
  if (value <= t.good) return { label: 'Good', className: 'bg-success/10 text-success hover:bg-success/10 border-none shadow-none' };
  if (value <= t.poor) return { label: 'Needs Improvement', className: 'bg-warning/10 text-warning hover:bg-warning/10 border-none shadow-none' };
  return { label: 'Poor', className: 'bg-danger/10 text-danger hover:bg-danger/10 border-none shadow-none' };
}

export const WebVitalsPanel: React.FC<WebVitalsPanelProps> = ({ webVitals }) => {
  if (!webVitals.length) return null;

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-foreground">Web Vitals</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {webVitals.map((v) => {
          const rating = ratingFor(v.metric, v.p75);
          return (
            <div key={v.metric} className="p-3 rounded-lg bg-surface-secondary">
              <p className="text-xs text-muted-foreground mb-1">{METRIC_LABELS[v.metric]}</p>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold text-foreground tabular-nums">
                  {THRESHOLDS[v.metric].format(v.p75)}
                </span>
                <Badge className={`text-xs font-medium ${rating.className}`}>
                  {rating.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">p75 · {v.samples.toLocaleString()} samples</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
