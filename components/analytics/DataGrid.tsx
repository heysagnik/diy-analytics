import React from 'react';
import { AnalyticsData } from '@/types/analytics';
import PagesList from './PagesList';
import SourcesList from './SourcesList';

interface DataGridProps {
  analyticsData: AnalyticsData;
  projectUrl?: string; 
}

export const DataGrid: React.FC<DataGridProps> = ({ analyticsData, projectUrl }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pages Section */}
        <PagesList pages={analyticsData.pages} projectUrl={projectUrl ?? ''}/>

      

      {/* Sources Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Traffic Sources</h3>
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <button className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-50 border-r border-gray-200">
              Referrer
            </button>
            <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700">
              UTM
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
            <div className="flex-1">Source</div>
            <div className="w-20 text-right">Users</div>
          </div>
          {analyticsData.sources.length > 0 ? (
            <SourcesList sources={analyticsData.sources.slice(0, 6)} />
          ) : (
            <p className="p-6 text-sm text-gray-500 text-center">No source data available.</p>
          )}
          <div className="p-4 text-center">
            <button className="text-sm text-gray-500 hover:text-gray-700 font-medium">
              View All Sources
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 