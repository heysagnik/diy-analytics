import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export const ProjectListSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <Skeleton className="h-3.5 w-1/2 rounded-md" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="pt-4 border-t border-border flex justify-between items-center">
            <div className="flex gap-4">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
};
