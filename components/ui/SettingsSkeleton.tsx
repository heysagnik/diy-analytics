import React from 'react';
import { Theme } from '../../types/settings';

interface SettingsSkeletonProps {
  theme: Theme;
}

export const SettingsSkeleton: React.FC<SettingsSkeletonProps> = ({ theme }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-pulse">
      {/* Page title skeleton */}
      <div className="h-8 bg-gray-200 rounded-md w-2/3 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded-md w-5/6 mb-6"></div>
      
      {/* Essential Settings card skeleton */}
      <div className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gray-200"></div>
              <div className="h-6 bg-gray-200 rounded-md w-36"></div>
            </div>
            <div className="h-5 w-5 rounded-full bg-gray-200"></div>
          </div>
          
          {/* Content skeleton - Essential settings are expanded by default */}
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded-md w-24"></div>
              <div className="h-10 bg-gray-100 rounded-md w-full"></div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded-md w-20"></div>
              <div className="h-10 bg-gray-100 rounded-md w-full"></div>
            </div>
            
            <div className="h-10 bg-gray-200 rounded-md w-36"></div>
            
            <div className="pt-4 border-t" style={{ borderColor: theme.cardBorder }}>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded-md w-28"></div>
                <div className="h-10 bg-gray-100 rounded-md w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Other section cards (collapsed by default) */}
      {Array(3).fill(0).map((_, i) => (
        <div key={i} className="mb-6 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-gray-200"></div>
                <div className="h-6 bg-gray-200 rounded-md w-40"></div>
              </div>
              <div className="h-5 w-5 rounded-full bg-gray-200"></div>
            </div>
            
            {/* No expanded content for other sections */}
          </div>
        </div>
      ))}
    </div>
  );
};