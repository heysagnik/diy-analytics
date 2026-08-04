import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useCompactChart } from './useCompactChart';
import { formatAxisLabel, formatTooltipLabel, type ChartGranularity } from './chartLabels';

interface SeriesData {
  name: string;
  data: Array<{ date: string; value: number }>;
  color: string;
}

interface ChartDataPoint {
  name: string;
  tooltipLabel: string;
  [seriesName: string]: string | number;
}

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

interface BarChartProps {
  seriesData: SeriesData[];
  labels: string[];
  granularity?: ChartGranularity;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  barWidth?: number;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const tooltipLabel = (payload[0] as unknown as { payload: ChartDataPoint }).payload.tooltipLabel;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs pointer-events-none z-20 min-w-[140px]">
      <p className="font-semibold text-foreground mb-2">{tooltipLabel}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 my-1">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            {entry.dataKey}
          </span>
          <span className="font-semibold text-foreground tabular-nums">{Number(entry.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

const BarChart: React.FC<BarChartProps> = ({
  seriesData,
  labels,
  granularity = 'day',
  height = 300,
  showGrid = true,
  showTooltip = true,
  showXAxis = true,
  showYAxis = true,
  barWidth = 8
}) => {
  const isCompact = useCompactChart();

  const chartData = useMemo((): ChartDataPoint[] => {
    if (!seriesData.length || !labels.length) return [];

    return labels.map((label, index) => {
      const point: ChartDataPoint = {
        name: formatAxisLabel(label, granularity, isCompact),
        tooltipLabel: formatTooltipLabel(label, granularity)
      };

      seriesData.forEach(series => {
        const dataPoint = series.data[index];
        point[series.name] = dataPoint?.value ?? 0;
      });

      return point;
    });
  }, [seriesData, labels, granularity, isCompact]);

  const chartSummary = useMemo(() => {
    const seriesSummary = seriesData.map((series) => {
      const total = series.data.slice(0, labels.length).reduce((sum, point) => sum + point.value, 0);
      return `${series.name}: ${total.toLocaleString()} total`;
    }).join('; ');
    const range = labels.length > 1 ? ` from ${labels[0]} to ${labels[labels.length - 1]}` : '';
    return `Bar chart with ${labels.length} data ${labels.length === 1 ? 'point' : 'points'}${range}. ${seriesSummary}.`;
  }, [labels, seriesData]);

  const tickInterval = useMemo(() => {
    const maxTicks = height < 150 ? 4 : 7;
    return labels.length > maxTicks ? Math.ceil(labels.length / maxTicks) - 1 : 0;
  }, [labels.length, height]);

  const formatYAxis = (value: number) => {
    if (value === undefined || value === null) return '0';
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  };

  const chartMargin = {
    top: height < 150 ? 5 : 12,
    right: height < 150 ? 5 : 8,
    left: height < 150 ? (showYAxis ? -25 : -5) : (showYAxis ? -6 : 0),
    bottom: height < 150 ? 5 : 4
  };

  const getBarSize = () => {
    if (height < 150) return undefined;
    if (labels.length > 30) return 10;
    if (labels.length > 20) return 14;
    return Math.max(barWidth, 8);
  };

  if (!seriesData.length || !chartData.length) {
    return (
      <div className="relative w-full h-full flex items-center justify-center text-muted-foreground" style={{ height: `${height}px` }}>
        <div className="text-center max-w-sm mx-auto px-4">
          <h3 className="text-sm font-medium text-foreground mb-1">No Data Available</h3>
          <p className="text-xs text-muted-foreground">Chart data will appear here once available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full"
      style={{ height: `${height}px` }}
      role="region"
      aria-label="Traffic bar chart"
    >
      <p className="sr-only">{chartSummary}</p>
      <div className="h-full w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={chartData} margin={chartMargin}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
          )}

          {showXAxis && (
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: height < 150 ? 9 : 11,
                fill: 'var(--muted-foreground)',
                fontWeight: 400
              }}
              tickMargin={height < 150 ? 3 : 10}
              interval={tickInterval}
            />
          )}

          {showYAxis && height >= 100 && (
            <YAxis
              tickFormatter={formatYAxis}
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: height < 150 ? 8 : 10,
                fill: 'var(--muted-foreground)',
                fontWeight: 400
              }}
              tickMargin={3}
              width={height < 150 ? 30 : 36}
              allowDecimals={false}
            />
          )}

          {showTooltip && (
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: 'var(--muted)' }}
              animationDuration={150}
              animationEasing="ease-out"
            />
          )}

          {seriesData.map((series) => (
            <Bar
              key={series.name}
              dataKey={series.name}
              fill={series.color}
              radius={height < 150 ? [1, 1, 0, 0] : [3, 3, 0, 0]}
              animationDuration={500}
              barSize={getBarSize()}
            />
          ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BarChart;
