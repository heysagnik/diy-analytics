import { ChartLineIcon } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type { AnalyticsData, DateRange } from '@/types/analytics';
import { useCompactChart } from './useCompactChart';

// recharts is a large dependency — only one of these two renders at a time
// (via the toggle below), so code-split them instead of shipping both in
// every project-dashboard page load.
const ChartSkeleton = () => <Skeleton className="h-full w-full rounded-lg" />;
const AreaChart = dynamic(() => import('./AreaChart'), { loading: ChartSkeleton });
const BarChart = dynamic(() => import('./BarChart'), { loading: ChartSkeleton });

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
      color: 'var(--chart-1)',
    },
    {
      name: 'Unique Visitors',
      data: analyticsData.uniqueUsers.data || [],
      color: 'var(--chart-2)',
    },
  ];

  const toDateValuePairs = (data: number[]) => labels.map((label, idx) => ({ date: label, value: data[idx] ?? 0 }));

  const barChartData = [
    {
      name: 'Page Views',
      data: toDateValuePairs(analyticsData.pageViews.data || []),
      color: 'var(--chart-1)',
    },
    {
      name: 'Unique Visitors',
      data: toDateValuePairs(analyticsData.uniqueUsers.data || []),
      color: 'var(--chart-2)',
    },
  ];

  return (
    <Card className="p-4 sm:p-5 flex flex-col gap-4 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-balance font-display font-semibold text-xl text-foreground">Traffic Insights</h2>
          <p className="text-xs text-muted-foreground mt-1 font-body">Data overview for {dateRange}</p>
        </div>

        <div className="flex items-center gap-1 bg-surface-secondary/50 p-0.5 rounded-lg border border-border w-fit">
          <Button
            variant={chartType === 'area' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChartType('area')}
            className={`rounded-md cursor-pointer ${
              chartType === 'area' ? 'shadow-xs border-border/10 dark:border-border/30' : 'text-muted-foreground'
            }`}
          >
            Area Chart
          </Button>
          <Button
            variant={chartType === 'bar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setChartType('bar')}
            className={`rounded-md cursor-pointer ${
              chartType === 'bar' ? 'shadow-xs border-border/10 dark:border-border/30' : 'text-muted-foreground'
            }`}
          >
            Bar Chart
          </Button>
        </div>
      </div>

      {hasData ? (
        <div className="h-56 w-full sm:h-64">
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
        <Empty className="h-56 bg-surface sm:h-64 border border-border rounded-lg">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="mb-0 flex items-center justify-center text-muted-foreground">
              <ChartLineIcon size={32} weight="duotone" />
            </EmptyMedia>
            <EmptyTitle className="text-sm font-medium text-foreground">No data for this view</EmptyTitle>
            <EmptyDescription className="text-xs text-muted-foreground">
              Try a different date range or clear active filters.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </Card>
  );
};

export default MainChart;
