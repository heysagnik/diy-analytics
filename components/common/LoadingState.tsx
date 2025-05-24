import React from 'react';

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <p className="mt-4 text-gray-600">Loading analytics data...</p>
    </div>
  );
}