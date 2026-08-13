'use client';

import type { Icon } from '@phosphor-icons/react';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { FilterDimension } from '@/types/filters';

export interface BreakdownItem {
  name: string;
  value: number;
  meta?: string;
}

export interface BreakdownTab {
  id: string;
  label: string;
  icon?: Icon;
  items: BreakdownItem[];
  format?: (raw: string) => string;
  valueLabel?: string;
  /** When set (and `onFilter` is passed to the panel), rows in this tab become click-to-filter. */
  dimension?: FilterDimension;
}

interface BreakdownPanelProps {
  tabs: BreakdownTab[];
  defaultTabId?: string;
  rowsToShow?: number;
  id?: string;
  /** Adds click-to-filter: clicking a row scopes the whole dashboard to that value. */
  onFilter?: (dimension: FilterDimension, value: string) => void;
  /** Currently-active filter values, keyed by dimension — used to highlight the selected row. */
  activeValues?: Partial<Record<FilterDimension, string[]>>;
}

function TabSwitcher({
  tabs,
  activeId,
  onChange,
}: {
  tabs: BreakdownTab[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  if (tabs.length <= 1) return null;
  return (
    <>
      <div className="min-w-0 flex-1 sm:hidden">
        <Select value={activeId} onValueChange={(v: unknown) => onChange(v as string)}>
          <SelectTrigger aria-label="Select breakdown" className="w-full">
            <SelectValue placeholder={tabs.find((t) => t.id === activeId)?.label ?? activeId}>
              {tabs.find((t) => t.id === activeId)?.label ?? activeId}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.id} value={tab.id}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden sm:block max-w-full overflow-x-auto scrollbar-hide">
        <Tabs value={activeId} onValueChange={(v) => typeof v === 'string' && onChange(v)}>
          <TabsList className="w-max">
            <TabsIndicator />
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="shrink-0 px-2.5 py-1 text-[11px]">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </>
  );
}

function RowList({
  items,
  active,
  clickable,
  activeForDimension,
  onFilter,
}: {
  items: BreakdownItem[];
  active: BreakdownTab;
  clickable: boolean;
  activeForDimension: string[] | undefined;
  onFilter?: (dimension: FilterDimension, value: string) => void;
}) {
  const ActiveIcon = active.icon;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        {ActiveIcon && <ActiveIcon size={32} className="text-muted-foreground" weight="duotone" />}
        <p className="text-sm text-muted-foreground">No {active.label.toLowerCase()} recorded yet.</p>
      </div>
    );
  }

  const maxVal = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((acc, i) => acc + i.value, 0) || 1;

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item) => {
        const pct = Math.max((item.value / maxVal) * 100, 2);
        const share = ((item.value / total) * 100).toFixed(1);
        const label = active.format ? active.format(item.name) : item.name;
        const isActive = activeForDimension?.includes(item.name);

        const row = (
          <>
            <div
              className={`absolute inset-y-0 left-0 rounded-r-[3px] transition-[width,background-color] duration-500 ease-out ${
                isActive ? 'bg-accent/25' : 'bg-accent/10'
              }`}
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-xs h-full">
              <span className="min-w-0 max-w-[65%] flex flex-col justify-center">
                <span
                  className={`block truncate font-medium ${isActive ? 'text-accent' : 'text-foreground'}`}
                  title={label}
                >
                  {label}
                </span>
                {item.meta ? (
                  <span className="block truncate text-[11px] text-muted-foreground" title={item.meta}>
                    {item.meta}
                  </span>
                ) : (
                  <span className="block truncate text-[11px] opacity-0 select-none" aria-hidden="true">
                    &nbsp;
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 text-muted-foreground tabular-nums flex-shrink-0">
                <span className="text-xs">{share}%</span>
                <span className="font-display text-sm text-foreground">{item.value.toLocaleString()}</span>
              </span>
            </div>
          </>
        );

        // `clickable` (Boolean(onFilter && active.dimension)) guarantees
        // active.dimension is set here, but that's not narrowable through a
        // separate prop — re-check it directly instead of asserting past it.
        if (clickable && active.dimension) {
          const dimension = active.dimension;
          return (
            <button
              type="button"
              key={`${active.id}:${item.name}:${item.meta ?? ''}`}
              onClick={() => onFilter?.(dimension, item.name)}
              className="relative w-full h-[44px] text-left rounded-md hover:bg-muted/60 transition-colors duration-150 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Filter by ${label}`}
            >
              {row}
            </button>
          );
        }

        return (
          <div key={`${active.id}:${item.name}:${item.meta ?? ''}`} className="relative h-[44px]">
            {row}
          </div>
        );
      })}
    </div>
  );
}

export const BreakdownPanel: React.FC<BreakdownPanelProps> = ({
  tabs,
  defaultTabId,
  rowsToShow = 5,
  id,
  onFilter,
  activeValues,
}) => {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const [expanded, setExpanded] = useState(false);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  if (!active) return null;

  const sorted = [...active.items].sort((a, b) => b.value - a.value);
  const shown = sorted.slice(0, rowsToShow);
  const ActiveIcon = active.icon;
  const clickable = Boolean(onFilter && active.dimension);
  const activeForDimension = active.dimension ? activeValues?.[active.dimension] : undefined;
  const hasMore = sorted.length > shown.length;

  return (
    <Card id={id} className="relative p-3.5 flex flex-col gap-3 font-body h-[340px]">
      <div className="flex flex-wrap items-center justify-between gap-3 min-h-8 sm:h-8 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          {ActiveIcon && (
            <span className="icon-chip size-6 rounded-md">
              <ActiveIcon size={14} weight="bold" />
            </span>
          )}
          <h3 className="font-display font-semibold text-sm text-foreground">{active.label}</h3>
        </div>

        <div className="min-w-0 basis-full sm:basis-auto">
          <TabSwitcher tabs={tabs} activeId={activeId} onChange={setActiveId} />
        </div>
      </div>

      <div className="relative flex-1 flex flex-col justify-start pb-10">
        <RowList
          items={shown}
          active={active}
          clickable={clickable}
          activeForDimension={activeForDimension}
          onFilter={onFilter}
        />

        {hasMore && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card via-card/90 to-transparent"
          />
        )}
      </div>

      {hasMore && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExpanded(true)}
          aria-label={`Expand ${active.label}`}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card font-medium shadow-[var(--overlay-shadow)] before:absolute before:-inset-1.5 before:content-['']"
        >
          <ArrowsOutSimpleIcon size={13} />
          <span>View all</span>
        </Button>
      )}

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="sm:max-w-lg h-[min(38rem,80vh)] grid-rows-[auto_1fr] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border gap-3">
            <div className="flex items-center justify-between gap-4 pr-8">
              <DialogTitle className="flex items-center gap-2 font-display text-sm">
                {ActiveIcon && (
                  <span className="icon-chip size-6 rounded-md">
                    <ActiveIcon size={14} weight="bold" />
                  </span>
                )}
                {active.label}
                <span className="text-xs font-normal text-muted-foreground">({sorted.length.toLocaleString()})</span>
              </DialogTitle>
            </div>
            <TabSwitcher tabs={tabs} activeId={activeId} onChange={setActiveId} />
          </DialogHeader>
          <div className="overflow-y-auto scrollbar-thin p-4">
            <RowList
              items={sorted}
              active={active}
              clickable={clickable}
              activeForDimension={activeForDimension}
              onFilter={onFilter}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BreakdownPanel;
