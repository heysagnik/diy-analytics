import type React from 'react';
import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface HeatmapDay {
  date: string; // YYYY-MM-DD (UTC)
  count: number;
}

interface ActivityHeatmapProps {
  days: HeatmapDay[];
  selectedYear?: number;
  onYearChange?: (year: number) => void;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function intensityClass(ratio: number): string {
  if (ratio === 0) return 'bg-border/40';
  if (ratio < 0.25) return 'bg-accent/30';
  if (ratio < 0.5) return 'bg-accent/55';
  if (ratio < 0.75) return 'bg-accent/80';
  return 'bg-accent';
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  days,
  selectedYear = new Date().getUTCFullYear(),
  onYearChange,
}) => {
  const currentYear = useMemo(() => new Date().getUTCFullYear(), []);

  const years = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => currentYear - i);
  }, [currentYear]);

  const { weeks, monthMarkers, max, totalActive, filteredCount } = useMemo(() => {
    if (!days || days.length === 0) {
      return { weeks: [], monthMarkers: [], max: 1, totalActive: 0, filteredCount: 0 };
    }

    const firstDate = new Date(`${days[0].date}T00:00:00Z`);
    const leadingEmpty = firstDate.getUTCDay();
    const padded: (HeatmapDay | null)[] = [...Array.from({ length: leadingEmpty }, () => null), ...days];

    const weeksArr: (HeatmapDay | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeksArr.push(padded.slice(i, i + 7));
    }

    const markers: { weekIdx: number; label: string }[] = [];
    let lastMonth = -1;
    weeksArr.forEach((week, weekIdx) => {
      const firstRealDay = week.find((d) => d !== null);
      if (!firstRealDay) return;
      const month = new Date(`${firstRealDay.date}T00:00:00Z`).getUTCMonth();
      if (month !== lastMonth) {
        markers.push({ weekIdx, label: MONTH_LABELS[month] });
        lastMonth = month;
      }
    });

    const maxCount = Math.max(1, ...days.map((d) => d.count));
    const activeCount = days.filter((d) => d.count > 0).length;

    return {
      weeks: weeksArr,
      monthMarkers: markers,
      max: maxCount,
      totalActive: activeCount,
      filteredCount: days.length,
    };
  }, [days]);

  return (
    <div className="flex flex-col gap-3 font-body">
      <Select value={String(selectedYear)} onValueChange={(v: unknown) => onYearChange?.(Number(v as string))}>
        <SelectTrigger className="h-7 min-w-[84px] bg-background px-2 text-xs tabular-nums" aria-label="Select year">
          <SelectValue>{(v: string) => v}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {weeks.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">No activity recorded in {selectedYear}.</div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin pb-1">
          <div className="inline-block min-w-full">
            <div className="flex gap-[3px] mb-1.5 relative h-3">
              {monthMarkers.map((m) => (
                <span
                  key={`${m.label}-${m.weekIdx}`}
                  className="absolute text-xs font-medium text-muted-foreground"
                  style={{ left: `${m.weekIdx * 13}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((week, weekIdx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed calendar grid, position is the identity
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIdx) =>
                    day ? (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: fixed calendar grid, position is the identity
                        key={dayIdx}
                        className={`w-[10px] h-[10px] rounded-[2px] ${intensityClass(day.count / max)} transition-colors`}
                        title={`${day.date}: ${day.count.toLocaleString()} views`}
                      />
                    ) : (
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed calendar grid, position is the identity
                      <div key={dayIdx} className="w-[10px] h-[10px]" />
                    ),
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span className="tabular-nums">
                Active {totalActive} of {filteredCount} days ({selectedYear})
              </span>
              <div className="flex items-center gap-1.5">
                <span>Less</span>
                {[0, 0.2, 0.45, 0.7, 1].map((r) => (
                  <div key={r} className={`w-2.5 h-2.5 rounded-sm ${intensityClass(r)}`} />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
