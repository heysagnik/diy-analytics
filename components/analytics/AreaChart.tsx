import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface ChartSeries {
  name: string;
  data: number[]; 
  color: string;
}

interface ChartDataPoint {
  name: string;
  originalName: string;
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
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  className?: string;
  
}

export default function AreaChart({ 
  seriesData,
  labels, 
  height = 300,
  showGrid = true,
  showTooltip = true,
  showXAxis = true,
  showYAxis = true,
  className = "",
}: AreaChartProps) {
  // Format date labels for better display
  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const now = new Date();
    const diffDays = Math.abs((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    // For mobile screens, use shorter format
    if (window.innerWidth < 640) {
      if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 3);
      }
      return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
    }
    
    // For larger screens, use more descriptive format
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      ...(diffDays > 365 && { year: '2-digit' })
    });
  };

  // Transform data for Recharts
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!seriesData.length || !labels.length) return [];
    
    return labels.map((label, index) => {
      const point: ChartDataPoint = { 
        name: formatDateLabel(label),
        originalName: label 
      };
      
      seriesData.forEach(series => {
        point[series.name] = series.data[index] || 0;
      });
      
      return point;
    });
  }, [seriesData, labels]);

  // Format Y-axis values
  const formatYAxis = (value: number) => {
    if (value === undefined || value === null) return '0';
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3 text-sm pointer-events-none z-20">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry: TooltipPayloadEntry, idx: number) => (
            <div key={idx} className="flex items-center gap-2 my-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600">{entry.dataKey}:</span>
              <span className="font-bold text-gray-900">{Number(entry.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Responsive chart margins
  const chartMargin = { 
    top: height < 150 ? 5 : 20, 
    right: height < 150 ? 5 : 15, 
    left: height < 150 ? (showYAxis ? -25 : -5) : (showYAxis ? -10 : 5),
    bottom: height < 150 ? 5 : 40 
  };

  // Handle empty state
  if (!seriesData.length || !chartData.length) {
    return (
      <div className="relative w-full h-full flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-gray-900 mb-1">No Data Available</h3>
          <p className="text-sm text-gray-500">Chart data will appear here once available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`} style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={chartData} margin={chartMargin}>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="4 4" 
              vertical={false} 
              stroke="#e5e7eb" 
            />
          )}
          
          {showXAxis && (
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false}
              tick={{ 
                fontSize: height < 150 ? 9 : 11, 
                fill: '#6b7280', 
                fontWeight: 400 
              }}
              tickMargin={height < 150 ? 3 : 8}
              interval={labels.length > 15 ? 'preserveStartEnd' : 0}
              angle={labels.length > 20 && height >= 250 ? -35 : 0}
              textAnchor={labels.length > 20 && height >= 250 ? 'end' : 'middle'}
              height={labels.length > 20 && height >= 250 ? 60 : 40}
            />
          )}
          
          {showYAxis && height >= 100 && (
            <YAxis 
              tickFormatter={formatYAxis}
              axisLine={false} 
              tickLine={false}
              tick={{ 
                fontSize: height < 150 ? 8 : 10, 
                fill: '#6b7280', 
                fontWeight: 400 
              }}
              tickMargin={3}
              width={height < 150 ? 30 : 35}
              allowDecimals={false}
            />
          )}
          
          {showTooltip && (
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
              animationDuration={150}
              animationEasing="ease-out"
            />
          )}
          
          {seriesData.map((series) => (
            <Area
              key={series.name} 
              type="monotone" 
              dataKey={series.name}
              stroke={series.color} 
              fill={series.color} 
              fillOpacity={height < 150 ? 0.2 : 0.1}
              strokeWidth={height < 150 ? 1.5 : 2}
              activeDot={{ r: height < 150 ? 3 : 4, stroke: series.color, strokeWidth: 1.5, fill: '#fff' }}
              dot={false} 
              animationDuration={600}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}