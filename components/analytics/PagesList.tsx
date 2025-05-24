import { FunnelIcon } from '@phosphor-icons/react';
import React, { useState } from 'react';

interface Page {
  path: string;
  users: number;
  views: number;
  percentage?: number;
  projectUrl?: string; 
}

interface PagesListProps {
  pages: Page[];
  projectUrl: string;
}

export default function PagesList({ pages, projectUrl }: PagesListProps) {
  const [showMore, setShowMore] = useState(false);

  // Calculate percentages and prepare data
  const pagesWithPercentages = pages.map(page => ({
    ...page,
    percentage: page.percentage || (pages.length > 0 ? (page.users / pages.reduce((sum, p) => sum + p.users, 0)) * 100 : 0)
  }));

  const maxUsers = Math.max(...pagesWithPercentages.map(p => p.users), 1);
  const displayedPages = showMore ? pagesWithPercentages : pagesWithPercentages.slice(0, 5);

  const EmptyState = () => (
    <div className="p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No pages data</h3>
      <p className="text-gray-500">Start collecting analytics to see your most popular pages.</p>
    </div>
  );

  const handleFilterClick = (pagePath: string) => {
    // TODO: Implement filter functionality
    console.log('Filter by page:', pagePath);
  };

  if (pages.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Pages</h3>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Pages</h3>
      </div>

      {/* Table Header */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center text-xs font-medium text-gray-600 uppercase tracking-wider">
          <div className="flex-1">Page</div>
          <div className="w-20 text-right">Users</div>
        </div>
      </div>

      {/* Pages List */}
      <div className="divide-y divide-gray-100">
        {displayedPages.map((page, index) => {
          const barWidth = (page.users / maxUsers) * 100;
          
          return (
            <div
              key={`${page.path}-${index}`}
              className="group relative bg-white hover:bg-gray-50 transition-all duration-200"
              style={{ 
                animationDelay: `${index * 75}ms`,
                animation: 'fadeIn 0.5s ease-out forwards'
              }}
            >
              <div className="flex items-center px-6 py-4">
                {/* Progress Bar Background */}
                <div 
                  className="absolute left-6 right-6 h-8  opacity-60 group-hover:opacity-30 transition-opacity duration-200"
                  style={{ width: `${Math.max(barWidth, 8)}%` }}
                />
                
                {/* Page Content */}
                <div className="flex-1 relative z-10 min-w-0">
                  <a 
                    href={`https://${projectUrl + page.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200 truncate block"
                    title={page.path}
                  >
                    { page.path}
                  </a>
                  
                </div>

                {/* Users Count */}
                <div className="w-20 text-right relative z-10">
                  <span className="text-sm font-semibold text-gray-900 group-hover:opacity-0 transition-opacity duration-200">
                    {page.users.toLocaleString()}
                  </span>
                </div>

                {/* Filter Button (appears on hover) */}
                <div className="absolute right-6 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <button 
                    onClick={() => handleFilterClick(page.path)}
                    className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    title="Filter by this page"
                  >
                    <FunnelIcon weight="fill" className="w-4 h-4 text-gray-900" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More/Less Button */}
      {pagesWithPercentages.length > 5 && (
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
          <button 
            onClick={() => setShowMore(!showMore)}
            className="w-full py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-md"
          >
            {showMore ? (
              <>
                <span>Show less</span>
                <svg className="w-4 h-4 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                <span>Show {pagesWithPercentages.length - 5} more</span>
                <svg className="w-4 h-4 ml-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}