'use client';

import { TagIcon } from '@phosphor-icons/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { type AnalyticsFilters, fetchEventPropertyKeys, fetchEventPropertyValues } from '@/lib/api/analytics';
import type { DateRange, EventData, EventPropertyKeyData, EventPropertyValueData } from '@/types/analytics';
import type { CustomDateRange } from './DateRangePicker';

interface EventPropertyDrilldownProps {
  events: EventData[];
  projectId: string;
  dateRange: DateRange;
  customRange?: CustomDateRange | null;
  filters?: AnalyticsFilters;
  rowsToShow?: number;
}

function ValueRow({
  item,
  maxCount,
  totalCount,
}: {
  item: EventPropertyValueData;
  maxCount: number;
  totalCount: number;
}) {
  const pct = Math.max((item.count / maxCount) * 100, 2);
  const share = ((item.count / totalCount) * 100).toFixed(1);

  return (
    <div className="relative">
      <div
        className="absolute inset-y-0 left-0 rounded-r-[3px] bg-accent/10 transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
      <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-xs">
        <span className="truncate font-medium text-foreground max-w-[55%]" title={item.value}>
          {item.value}
        </span>
        <span className="flex items-center gap-2 text-muted-foreground tabular-nums flex-shrink-0">
          <span className="text-xs">{share}%</span>
          <span className="font-display text-sm text-foreground">{item.count.toLocaleString()}</span>
        </span>
      </div>
    </div>
  );
}

export const EventPropertyDrilldown: React.FC<EventPropertyDrilldownProps> = ({
  events,
  projectId,
  dateRange,
  customRange,
  filters,
  rowsToShow = 8,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [keys, setKeys] = useState<EventPropertyKeyData[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [values, setValues] = useState<EventPropertyValueData[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingValues, setLoadingValues] = useState(false);

  // Fetch the property keys for the event whenever the dialog opens on a
  // new event — reset downstream key/value selection so a stale key from
  // the previous event isn't shown mid-fetch.
  useEffect(() => {
    if (!selectedEvent) return;
    let cancelled = false;
    setKeys([]);
    setSelectedKey(null);
    setValues([]);
    setLoadingKeys(true);

    fetchEventPropertyKeys({ projectId, eventName: selectedEvent, dateRange, customRange, filters })
      .then((data) => {
        if (cancelled) return;
        setKeys(data);
        if (data.length > 0) setSelectedKey(data[0].key);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingKeys(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEvent, projectId, dateRange, customRange, filters]);

  useEffect(() => {
    if (!selectedEvent || !selectedKey) return;
    let cancelled = false;
    setLoadingValues(true);

    fetchEventPropertyValues({
      projectId,
      eventName: selectedEvent,
      propertyKey: selectedKey,
      dateRange,
      customRange,
      filters,
    })
      .then((data) => {
        if (!cancelled) setValues(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingValues(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEvent, selectedKey, projectId, dateRange, customRange, filters]);

  const sorted = [...events].sort((a, b) => b.count - a.count);
  const shown = sorted.slice(0, rowsToShow);
  const maxVal = Math.max(...shown.map((e) => e.count), 1);
  const total = shown.reduce((acc, e) => acc + e.count, 0) || 1;

  const maxValueCount = Math.max(...values.map((v) => v.count), 1);
  const totalValueCount = values.reduce((acc, v) => acc + v.count, 0) || 1;

  return (
    <Card className="p-3.5 flex flex-col gap-3 font-body">
      <div className="flex items-center gap-2">
        <h3 className="font-display font-semibold text-sm text-foreground">Top Events</h3>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm text-muted-foreground">No events recorded yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {shown.map((event) => {
            const pct = Math.max((event.count / maxVal) * 100, 2);
            const share = ((event.count / total) * 100).toFixed(1);
            return (
              <button
                type="button"
                key={event.name}
                onClick={() => setSelectedEvent(event.name)}
                className="relative w-full min-h-10 text-left rounded-md hover:bg-muted/60 transition-colors duration-150 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`View properties for ${event.name}`}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-r-[3px] bg-accent/10 transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-3 px-2.5 py-1 text-xs">
                  <span className="truncate font-medium text-foreground max-w-[65%]" title={event.name}>
                    {event.name}
                  </span>
                  <span className="flex items-center gap-2 text-muted-foreground tabular-nums flex-shrink-0">
                    <span className="text-xs">{share}%</span>
                    <span className="font-display text-sm text-foreground">{event.count.toLocaleString()}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog
        open={selectedEvent !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setSelectedEvent(null);
        }}
      >
        <DialogContent className="sm:max-w-lg h-[min(32rem,80vh)] grid-rows-[auto_1fr] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border gap-3">
            <DialogTitle className="flex items-center gap-2 font-display text-sm">{selectedEvent}</DialogTitle>

            {keys.length > 0 && (
              <Select value={selectedKey ?? undefined} onValueChange={(v: unknown) => setSelectedKey(v as string)}>
                <SelectTrigger aria-label="Select property" className="w-full">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {keys.map((k) => (
                    <SelectItem key={k.key} value={k.key}>
                      {k.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </DialogHeader>

          <div className="overflow-y-auto scrollbar-thin p-4">
            {loadingKeys ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="size-5 text-accent" />
              </div>
            ) : keys.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <TagIcon size={32} className="text-muted-foreground" weight="duotone" />
                <p className="text-sm text-muted-foreground">No structured properties recorded for this event.</p>
              </div>
            ) : loadingValues ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="size-5 text-accent" />
              </div>
            ) : values.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <TagIcon size={32} className="text-muted-foreground" weight="duotone" />
                <p className="text-sm text-muted-foreground">No data for this property in the selected range.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {values.map((v) => (
                  <ValueRow key={v.value} item={v} maxCount={maxValueCount} totalCount={totalValueCount} />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EventPropertyDrilldown;
