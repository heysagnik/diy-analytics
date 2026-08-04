import React, { useId, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useCompactChart } from './useCompactChart';
import { formatAxisLabel, formatTooltipLabel, type ChartGranularity } from './chartLabels';

interface ChartSeries {
  name: string;
  data: number[];
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

interface AreaChartProps {
  seriesData: ChartSeries[];
  labels: string[];
  granularity?: ChartGranularity;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  className?: string;
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

export default function AreaChart({
  seriesData,
  labels,
  granularity = 'day',
  height = 300,
  showGrid = true,
  showTooltip = true,
  showXAxis = true,
  showYAxis = true,
  className = "",
}: AreaChartProps) {
  const isCompact = useCompactChart();
  const gradientIdPrefix = useId();

  const chartData = useMemo((): ChartDataPoint[] => {
    if (!seriesData.length || !labels.length) return [];

    return labels.map((label, index) => {
      const point: ChartDataPoint = {
        name: formatAxisLabel(label, granularity, isCompact),
        tooltipLabel: formatTooltipLabel(label, granularity)
      };

      seriesData.forEach(series => {
        point[series.name] = series.data[index] || 0;
      });

      return point;
    });
  }, [seriesData, labels, granularity, isCompact]);

  const chartSummary = useMemo(() => {
    const seriesSummary = seriesData.map((series) => {
      const values = series.data.slice(0, labels.length);
      const total = values.reduce((sum, value) => sum + value, 0);
      return `${series.name}: ${total.toLocaleString()} total`;
    }).join('; ');
    const range = labels.length > 1 ? ` from ${labels[0]} to ${labels[labels.length - 1]}` : '';
    return `Area chart with ${labels.length} data ${labels.length === 1 ? 'point' : 'points'}${range}. ${seriesSummary}.`;
  }, [labels, seriesData]);

  // Cap the number of visible x-axis ticks so dense ranges (30/90 points)
  // don't render an illegible wall of overlapping date labels.
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
      className={`w-full h-full ${className}`}
      style={{ height: `${height}px` }}
      role="region"
      aria-label="Traffic area chart"
    >
      <p className="sr-only">{chartSummary}</p>
      <div className="h-full w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={chartData} margin={chartMargin}>
          <defs>
            {seriesData.map((series, index) => (
              <linearGradient key={series.name} id={`${gradientIdPrefix}-gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={series.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={series.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

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
              minTickGap={24}
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
              cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
              animationDuration={150}
              animationEasing="ease-out"
            />
          )}

          {seriesData.map((series, index) => (
            <Area
              key={series.name}
              type="monotone"
              dataKey={series.name}
              stroke={series.color}
              fill={`url(#${gradientIdPrefix}-gradient-${index})`}
              strokeWidth={height < 150 ? 1.5 : 2}
              activeDot={{ r: height < 150 ? 3 : 4, stroke: series.color, strokeWidth: 2, fill: 'var(--background)' }}
              dot={false}
              animationDuration={500}
            />
          ))}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
