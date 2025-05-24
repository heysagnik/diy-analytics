"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { DateRange, AnalyticsData } from "@/types/analytics";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useProject } from "@/hooks/useProject";
import { 
  createEmptyAnalyticsData, 
  enrichAnalyticsDataWithLabels, 
  validateAnalyticsData 
} from "@/utils/analytics";
import { 
  ErrorState, 
  AnalyticsHeader, 
  MainChart, 
  DataGrid 
} from "@/components";
import { SpinnerIcon } from "@phosphor-icons/react";

const DEFAULT_DATE_RANGE: DateRange = "Last 30 days";
const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;







const ErrorDisplay = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="w-full px-6 py-8">
    <ErrorState message={message} onRetry={onRetry} />
  </div>
);

export default function ProjectPage() {
  const params = useParams();
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);

  const projectId = useMemo(() => {
    const slug = params?.slugs;
    if (typeof slug === 'string') return slug;
    if (Array.isArray(slug) && slug.length > 0 && typeof slug[0] === 'string') return slug[0];
    return '';
  }, [params?.slugs]);

  const isValidProjectId = useMemo(() => 
    projectId ? OBJECT_ID_REGEX.test(projectId) : false, 
    [projectId]
  );

  const { 
    project, 
    isLoading: isLoadingProject, 
    error: projectError, 
    refetch: refetchProject 
  } = useProject({ projectId, isValidProjectId });

  const { 
    analyticsData: rawAnalyticsData, 
    // loading: isLoadingAnalytics, 
    // error: analyticsError, 
    // retry: retryAnalytics 
  } = useAnalytics(
    isValidProjectId ? projectId : '', 
    dateRange
  );

  const analyticsData: AnalyticsData = useMemo(() => {
    if (rawAnalyticsData && validateAnalyticsData(rawAnalyticsData)) {
      return enrichAnalyticsDataWithLabels(rawAnalyticsData, dateRange);
    }
    return createEmptyAnalyticsData(dateRange);
  }, [rawAnalyticsData, dateRange]);

  const canRetryProject = isValidProjectId && 
    !projectError?.toLowerCase().includes("not found") && 
    !projectError?.toLowerCase().includes("invalid");

  if (isLoadingProject && !projectError) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <SpinnerIcon />
      </div>
    );
  }

  if (projectError) {
    return (
      <ErrorDisplay 
        message={projectError} 
        onRetry={canRetryProject ? refetchProject : undefined}
      />
    );
  }

  if (!project) {
    return (
      <ErrorDisplay message="Project data is unavailable. Please refresh the page." />
    );
  }

  return (
    <div className="w-full px-6 py-8">
      <div className="flex flex-col gap-6">
        <AnalyticsHeader 
          project={project}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        <MainChart analyticsData={analyticsData} dateRange={dateRange} />
        <DataGrid analyticsData={analyticsData} projectUrl={project.url} />

      </div>
    </div>
  );
}