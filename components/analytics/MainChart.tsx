import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnalyticsData, DateRange } from '@/types/analytics';
import { ChartLineIcon } from '@phosphor-icons/react';
import AreaChart from './AreaChart';
import BarChart from './BarChart';
import { useCompactChart } from './useCompactChart';

interface MainChartProps {
  analyticsData: AnalyticsData;
  dateRange: DateRange;
}

type ChartType = 'area' | 'bar';

export const MainChart: React.FC<MainChartProps> = ({ analyticsData, dateRange }) => {
  const [chartType, setChartType] = useState<ChartType>('area');
  const isCompact = useCompactChart();
  const chartHeight = isCompact ? 224 : 256;
  const labels = analyticsData.uniqueUsers.labels;

  const hasData = analyticsData.pageViews.total > 0 || analyticsData.uniqueUsers.total > 0;

  const areaChartData = [
    {
      name: 'Page Views',
      data: analyticsData.pageViews.data || [],
      color: 'var(--chart-1)'
    },
    {
      name: 'Unique Users',
      data: analyticsData.uniqueUsers.data || [],
      color: 'var(--chart-2)'
    }
  ];

  const barChartData = [
    {
      name: 'Page Views',
      data: labels.map((label, idx) => ({
        date: label,
        value: analyticsData.pageViews.data?.[idx] ?? 0
      })),
      color: 'var(--chart-1)'
    },
    {
      name: 'Unique Users',
      data: labels.map((label, idx) => ({
        date: label,
        value: analyticsData.uniqueUsers.data?.[idx] ?? 0
      })),
      color: 'var(--chart-2)'
    }
  ];

  return (
    <Card className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-balance font-display font-semibold text-xl text-foreground">Traffic Insights</h2>
          <p className="text-xs text-muted-foreground mt-1 font-body">Data overview for {dateRange}</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg border border-border">
            <Button
              size="xs"
              variant={chartType === 'area' ? 'default' : 'ghost'}
              onClick={() => setChartType('area')}
              className="rounded-md font-medium"
            >
              Area
            </Button>
            <Button
              size="xs"
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              onClick={() => setChartType('bar')}
              className="rounded-md font-medium"
            >
              Bar
            </Button>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-1)]" />
              Page Views
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--chart-2)]" />
              Unique Users
            </span>
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="h-56 sm:h-64 w-full">
          {chartType === 'area' ? (
            <AreaChart
              seriesData={areaChartData}
              labels={labels}
              granularity={analyticsData.granularity}
              height={chartHeight}
              showGrid
              showTooltip
              showXAxis
              showYAxis
            />
          ) : (
            <BarChart
              seriesData={barChartData}
              labels={labels}
              granularity={analyticsData.granularity}
              height={chartHeight}
              showGrid
              showTooltip
              showXAxis
              showYAxis
              barWidth={8}
            />
          )}
        </div>
      ) : (
        <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface text-center sm:h-64">
          <ChartLineIcon size={32} className="text-muted-foreground" weight="duotone" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No data for this view</p>
            <p className="text-xs text-muted-foreground">Try a different date range or clear active filters.</p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default MainChart;
