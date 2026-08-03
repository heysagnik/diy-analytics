'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
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
            <SelectValue>{(v: string) => tabs.find((t) => t.id === v)?.label ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.id} value={tab.id}>{tab.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden sm:block max-w-full overflow-x-auto scrollbar-hide">
        <div className="bg-muted p-0.5 rounded-lg flex items-center gap-0.5 border border-border w-max">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              size="xs"
              variant={tab.id === activeId ? 'default' : 'ghost'}
              onClick={() => onChange(tab.id)}
              className="rounded-md font-medium shrink-0"
            >
              {tab.label}
            </Button>
          ))}
        </div>
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
    <div className="space-y-1.5">
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
            <div className="relative flex items-center justify-between gap-3 px-2.5 py-1 text-xs">
              <span
                className={`truncate font-medium max-w-[65%] ${isActive ? 'text-accent' : 'text-foreground'}`}
                title={label}
              >
                {label}
              </span>
              <span className="flex items-center gap-2 text-muted-foreground tabular-nums flex-shrink-0">
                <span className="text-xs">{share}%</span>
                <span className="font-display text-sm text-foreground">
                  {item.value.toLocaleString()}
                </span>
              </span>
            </div>
          </>
        );

        if (clickable) {
          return (
            <button
              key={`${active.id}:${item.name}:${item.meta ?? ''}`}
              onClick={() => onFilter!(active.dimension!, item.name)}
              className="relative w-full min-h-10 text-left rounded-md hover:bg-muted/60 transition-colors duration-150 cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Filter by ${label}`}
            >
              {row}
            </button>
          );
        }

        return (
          <div key={`${active.id}:${item.name}:${item.meta ?? ''}`} className="relative">
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
    <Card id={id} className={`relative p-3.5 space-y-3 font-body ${hasMore ? 'pb-12' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <div className="relative">
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
                <span className="text-xs font-normal text-muted-foreground">
                  ({sorted.length.toLocaleString()})
                </span>
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
