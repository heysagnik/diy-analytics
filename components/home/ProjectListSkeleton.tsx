import React from 'react';

export const ProjectListSkeleton: React.FC = () => {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="space-y-4 w-full max-w-md">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3 mx-auto"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 rounded-lg bg-gray-200 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
          ))}
        </div>
      </div>
    </div>
  );
};