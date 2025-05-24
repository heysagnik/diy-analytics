import React, { useState, useEffect } from 'react';
import { AnalyticsData, DateRange } from '@/types/analytics';
import { MetricsGrid } from './MetricsGrid';
import AreaChart from './AreaChart';
import BarChart from './BarChart';

interface MainChartProps {
  analyticsData: AnalyticsData;
  dateRange: DateRange;
}

type ChartType = 'area' | 'bar';

export const MainChart: React.FC<MainChartProps> = ({ analyticsData, dateRange }) => {
  const [chartType, setChartType] = useState<ChartType>('area');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerWidth < 640 ? 256 : window.innerWidth < 1024 ? 288 : window.innerWidth < 1280 ? 320 : 384
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const hasData = analyticsData.pageViews.total > 0 || analyticsData.uniqueUsers.total > 0;

  // Data format for AreaChart (uses data arrays directly)
  const areaChartData = [
    {
      name: 'Page Views',
      data: analyticsData.pageViews.data || [],
      color: '#007AFF'
    },
    {
      name: 'Unique Users',
      data: analyticsData.uniqueUsers.data || [],
      color: '#34C759'
    }
  ];

  // Data format for BarChart (uses date-value objects)
  const barChartData = [
    {
      name: 'Page Views',
      data: (analyticsData.labels || []).map((label, idx) => ({
        date: label,
        value: analyticsData.pageViews.data?.[idx] ?? 0
      })),
      color: '#007AFF'
    },
    {
      name: 'Unique Users',
      data: (analyticsData.labels || []).map((label, idx) => ({
        date: label,
        value: analyticsData.uniqueUsers.data?.[idx] ?? 0
      })),
      color: '#34C759'
    }
  ];

  const ChartTypeToggle = () => (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setChartType('area')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
          chartType === 'area'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        Area
      </button>
      <button
        onClick={() => setChartType('bar')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
          chartType === 'bar'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <svg className="w-4 h-4 mr-1.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Bar
      </button>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <MetricsGrid analyticsData={analyticsData} dateRange={dateRange} />
      
      <div className="bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-sm border border-gray-100/50 p-4 sm:p-6 lg:p-8 hover:shadow-md transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              Traffic Insights
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Data from {dateRange}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <ChartTypeToggle />
            
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500 shadow-sm"></div>
                <span className="text-xs sm:text-sm font-medium text-gray-600">Page Views</span>
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 shadow-sm"></div>
                <span className="text-xs sm:text-sm font-medium text-gray-600">Unique Users</span>
              </div>
            </div>
          </div>
        </div>
        
        {hasData ? (
          <div className="relative">
            <div className="h-64 sm:h-72 lg:h-80 xl:h-96 w-full">
              {chartType === 'area' ? (
                <AreaChart
                  seriesData={areaChartData}
                  labels={analyticsData.labels || []}
                  height={dimensions.height}
                  showGrid={true}
                  showTooltip={true}
                  showXAxis={true}
                  showYAxis={true}
                 
                />
              ) : (
                <BarChart
                  seriesData={barChartData}
                  labels={analyticsData.labels || []}
                  height={dimensions.height}
                  showGrid={true}
                  showTooltip={true}
                  showXAxis={true}
                  showYAxis={true}
                  dateRange={dateRange}
                  barWidth={8}
                />
              )}
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none rounded-xl"></div>
          </div>
        ) : (
          <div className="h-64 sm:h-72 lg:h-80 xl:h-96 flex items-center justify-center">
            <div className="text-center max-w-sm mx-auto px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-sm">
                <svg 
                  className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" 
                  />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
                No Data Available
              </h3>
              <p className="text-xs sm:text-sm lg:text-base text-gray-500 leading-relaxed">
                Start collecting analytics data to see your beautiful charts here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainChart;