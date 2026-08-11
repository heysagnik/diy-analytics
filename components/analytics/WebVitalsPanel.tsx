import { ArrowsOutSimpleIcon, GaugeIcon } from '@phosphor-icons/react';
import type React from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WebVitalBreakdown, WebVitalData, WebVitalDimension } from '@/types/analytics';
import { WEB_VITAL_BREAKDOWN_DIMENSIONS } from '@/types/analytics';
import { getCountryName } from '@/utils/country';

interface WebVitalsPanelProps {
  webVitals: WebVitalData[];
  webVitalsBreakdown?: WebVitalBreakdown;
}

const DIMENSION_LABELS: Record<WebVitalDimension, string> = {
  page: 'By page',
  country: 'By country',
  device: 'By device',
  browser: 'By browser',
};

const DIMENSION_ROW_LABELS: Record<WebVitalDimension, string> = {
  page: 'Page',
  country: 'Country',
  device: 'Device',
  browser: 'Browser',
};

function keyLabel(dimension: WebVitalDimension, key: string): string {
  return dimension === 'country' ? getCountryName(key) : key;
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
  if (value <= t.good)
    return { label: 'Good', className: 'bg-success/10 text-success hover:bg-success/10 border-none shadow-none' };
  if (value <= t.poor)
    return {
      label: 'Needs Improvement',
      className: 'bg-warning/10 text-warning hover:bg-warning/10 border-none shadow-none',
    };
  return { label: 'Poor', className: 'bg-danger/10 text-danger hover:bg-danger/10 border-none shadow-none' };
}

function BreakdownValue({ metric, value }: { metric: WebVitalData['metric']; value?: number }) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>;
  const rating = ratingFor(metric, value);
  return (
    <span className="inline-flex items-center justify-end gap-1.5 w-full">
      <span className="tabular-nums">{THRESHOLDS[metric].format(value)}</span>
      <span
        className={`inline-block size-1.5 rounded-full shrink-0 ${
          rating.label === 'Good' ? 'bg-success' : rating.label === 'Needs Improvement' ? 'bg-warning' : 'bg-danger'
        }`}
        aria-hidden="true"
      />
    </span>
  );
}

function VitalsBreakdownTable({
  dimension,
  breakdown,
}: {
  dimension: WebVitalDimension;
  breakdown: WebVitalBreakdown;
}) {
  const items = breakdown[dimension];
  if (!items.length) {
    return <p className="text-xs text-muted-foreground py-6 text-center">Not enough data yet.</p>;
  }
  return (
    <table className="w-full text-xs border-separate border-spacing-0">
      <thead>
        <tr className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          <th className="px-2.5 py-1 text-left font-medium sticky top-0 bg-card">{DIMENSION_ROW_LABELS[dimension]}</th>
          <th className="px-2.5 py-1 w-16 text-right font-medium sticky top-0 bg-card">LCP</th>
          <th className="px-2.5 py-1 w-16 text-right font-medium sticky top-0 bg-card">CLS</th>
          <th className="px-2.5 py-1 w-16 text-right font-medium sticky top-0 bg-card">INP</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.key} className="hover:bg-surface-tertiary">
            <td className="px-2.5 py-1.5 rounded-l-md max-w-0">
              <span className="block truncate font-medium text-foreground" title={keyLabel(dimension, item.key)}>
                {keyLabel(dimension, item.key)}
              </span>
            </td>
            <td className="px-2.5 py-1.5 text-right">
              <BreakdownValue metric="LCP" value={item.lcp} />
            </td>
            <td className="px-2.5 py-1.5 text-right">
              <BreakdownValue metric="CLS" value={item.cls} />
            </td>
            <td className="px-2.5 py-1.5 rounded-r-md text-right">
              <BreakdownValue metric="INP" value={item.inp} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabSwitcher({
  dimensions,
  activeDimension,
  onChange,
}: {
  dimensions: WebVitalDimension[];
  activeDimension: WebVitalDimension;
  onChange: (d: WebVitalDimension) => void;
}) {
  if (dimensions.length <= 1) return null;
  return (
    <>
      <div className="min-w-0 flex-1 sm:hidden">
        <Select value={activeDimension} onValueChange={(v: unknown) => onChange(v as WebVitalDimension)}>
          <SelectTrigger aria-label="Select dimension" className="w-full">
            <SelectValue placeholder={DIMENSION_LABELS[activeDimension]}>
              {DIMENSION_LABELS[activeDimension]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {dimensions.map((d) => (
              <SelectItem key={d} value={d}>
                {DIMENSION_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden sm:block max-w-full overflow-x-auto scrollbar-hide">
        <div className="bg-muted/80 backdrop-blur-sm p-0.5 rounded-lg flex items-center gap-0.5 border border-border/40 w-max">
          {dimensions.map((d) => (
            <Button
              key={d}
              size="xs"
              variant={d === activeDimension ? 'default' : 'ghost'}
              onClick={() => onChange(d)}
              className="rounded-md font-medium shrink-0 active:scale-[0.96] transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out"
            >
              {DIMENSION_LABELS[d]}
            </Button>
          ))}
        </div>
      </div>
    </>
  );
}

const EMPTY_BREAKDOWN: WebVitalBreakdown = { page: [], country: [], device: [], browser: [] };

export const WebVitalsPanel: React.FC<WebVitalsPanelProps> = ({ webVitals, webVitalsBreakdown = EMPTY_BREAKDOWN }) => {
  const [open, setOpen] = useState(false);
  const availableDimensions = WEB_VITAL_BREAKDOWN_DIMENSIONS.filter((d) => webVitalsBreakdown[d].length > 0);
  const [activeDimension, setActiveDimension] = useState<WebVitalDimension | null>(availableDimensions[0] ?? null);
  if (!webVitals.length) return null;

  const selectedDimension =
    activeDimension && webVitalsBreakdown[activeDimension].length > 0 ? activeDimension : availableDimensions[0];

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-foreground">Web Vitals</h3>
          {availableDimensions.length > 0 && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setOpen(true)}
              className="rounded-full"
              aria-haspopup="dialog"
            >
              <ArrowsOutSimpleIcon size={12} />
              <span>Breakdown</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {webVitals.map((v) => {
            const rating = ratingFor(v.metric, v.p75);
            return (
              <div key={v.metric} className="p-3 rounded-lg bg-surface-tertiary">
                <p className="text-xs text-muted-foreground mb-1">{METRIC_LABELS[v.metric]}</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold text-foreground tabular-nums">
                    {THRESHOLDS[v.metric].format(v.p75)}
                  </span>
                  <Badge className={`text-xs font-medium ${rating.className}`}>{rating.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  p75 · median {THRESHOLDS[v.metric].format(v.p50)} · {v.samples.toLocaleString()} samples
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {selectedDimension && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg h-[min(38rem,80vh)] grid-rows-[auto_1fr] p-0 gap-0 overflow-hidden">
            <DialogHeader className="p-4 pb-3 border-b border-border gap-3">
              <div className="flex items-center justify-between gap-4 pr-8">
                <DialogTitle className="flex items-center gap-2 font-display text-sm">
                  <span className="icon-chip size-6 rounded-md">
                    <GaugeIcon size={14} weight="bold" />
                  </span>
                  Web Vitals breakdown
                </DialogTitle>
              </div>
              <TabSwitcher
                dimensions={availableDimensions}
                activeDimension={selectedDimension}
                onChange={setActiveDimension}
              />
            </DialogHeader>

            <div className="overflow-y-auto scrollbar-thin p-4">
              <VitalsBreakdownTable dimension={selectedDimension} breakdown={webVitalsBreakdown} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
