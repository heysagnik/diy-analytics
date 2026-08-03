'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { XIcon, FunnelIcon } from '@phosphor-icons/react';
import { ActiveFilter, filterLabel } from '@/types/filters';
import { getCountryName } from '@/utils/country';

interface FilterBarProps {
  filters: ActiveFilter[];
  onRemove: (filter: ActiveFilter) => void;
  onClearAll: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onRemove, onClearAll }) => {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap animate-fade-in">
      <FunnelIcon size={14} className="text-muted-foreground flex-shrink-0" />
      {filters.map((f) => (
        <Badge
          key={`${f.dimension}:${f.value}`}
          variant="secondary"
          className="gap-1.5 pl-2.5"
        >
          <span className="text-muted-foreground">{filterLabel(f.dimension)}:</span>
          <span className="max-w-[160px] truncate">
            {f.dimension === 'country' ? getCountryName(f.value) : f.value}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(f)}
            className="text-muted-foreground hover:text-danger"
            aria-label={`Remove ${filterLabel(f.dimension)} filter`}
          >
            <XIcon size={12} weight="bold" />
          </Button>
        </Badge>
      ))}
      {filters.length > 1 && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs px-2">
          Clear all
        </Button>
      )}
    </div>
  );
};

export default FilterBar;
