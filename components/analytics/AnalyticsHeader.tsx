import React, { useState } from 'react';
import { Project, DateRange } from '@/types/analytics';
import DateRangePicker from './DateRangePicker';

interface AnalyticsHeaderProps {
  project: Project;
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  project,
  dateRange,
  onDateRangeChange
}) => {
  const [copied, setCopied] = useState(false);

  const projectUrlHref = project.url.startsWith('http://') || project.url.startsWith('https://') 
    ? project.url 
    : `https://${project.url}`;
  
  const getTrackingScript = () => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return `<script async defer src="${baseUrl}/api/tracker.js?site-id=${project.trackingCode}"></script>`;
  };

  const handleCopyCode = async () => {
    try {
      const trackingScript = getTrackingScript();
      await navigator.clipboard.writeText(trackingScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy tracking code:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = getTrackingScript();
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-end mb-3 sm:mb-4 sm:justify-between gap-4">
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
        <div className="items-center self-center hidden space-x-2 mt-1 text-gray-700 sm:flex">
          <a 
            href={projectUrlHref} 
            target="_blank" 
            rel="noopener noreferrer"
            className="cursor-pointer hover:underline text-sm"
          >
            {project.domain || project.url}
          </a>
          
          {/* Copy Tracking Code Button */}
          <button
            onClick={handleCopyCode}
            className="ml-2 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 group relative"
            title="Copy tracking code"
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            )}
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              {copied ? 'Copied!' : 'Copy tracking code'}
            </div>
          </button>
        </div>
      </div>
      
      <DateRangePicker 
        dateRange={dateRange} 
        onDateRangeChange={onDateRangeChange}
      />
    </div>
  );
};