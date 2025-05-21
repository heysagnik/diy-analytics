"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { WarningIcon } from "@phosphor-icons/react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { getTrackingScript } from "../../../lib/tracking-script";
import type { DateRange, Project, UserFilter as UserFilterType, SourceFilter as SourceFilterType } from "../../../types/analytics";
import { useAnalytics } from "../../../hooks/useAnalytics";
import { defaultTheme } from "../../../utils/theme";

// UI Components
import ProjectHeader from "../../../components/analytics/ProjectHeader";
import DateRangePicker from "../../../components/analytics/DateRangePicker";
import TrackingCodeModal from "../../../components/analytics/TrackingCodeModal";
import StatCard from "../../../components/analytics/StatCard";
import DataTable from "../../../components/analytics/DataTable";
import SourceFilter from "@/components/analytics/SourceFilter";
import UserFilter from "@/components/analytics/UserFilter";
import ErrorBoundary from "../../../components/ErrorBoundary";
import EventsCard from "../../../components/analytics/EventsCard";
import Favicon from "../../../components/analytics/Favicon"; // Import the new Favicon component

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Define a more specific type for user data items in the DataTable
interface UserDataItem {
  users: number;
  [key: string]: string | number | unknown; // Allows for dynamic keys like 'country', 'browser', 'device'
}

// Skeleton Components
const SkeletonPlaceholder: React.FC<{ className?: string }> = ({ className = "h-full w-full" }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`}></div>
);

const StatCardSkeleton: React.FC = () => (
  <div className="p-5 bg-white border border-gray-100 rounded-xl shadow-sm">
    <SkeletonPlaceholder className="h-5 w-1/3 mb-2" />
    <SkeletonPlaceholder className="h-8 w-1/2 mb-4" />
    <SkeletonPlaceholder className="h-20 w-full" />
  </div>
);

const DataTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-100">
      <SkeletonPlaceholder className="h-5 w-1/4" />
    </div>
    <div className="p-5 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonPlaceholder key={i} className="h-8 w-full" />
      ))}
    </div>
  </div>
);

const EventsCardSkeleton: React.FC = () => (
    <div className="p-5 bg-white border border-gray-100 rounded-xl shadow-sm">
        <SkeletonPlaceholder className="h-5 w-1/3 mb-4" />
        <SkeletonPlaceholder className="h-10 w-full mb-2" />
        <SkeletonPlaceholder className="h-10 w-full" />
    </div>
);


export default function ProjectAnalytics() {
  const params = useParams();
  const rawSlug = Array.isArray(params.slugs) ? params.slugs[0] : params.slugs;
  const theme = defaultTheme;
  
  // State variables for functionality
  const [dateRange, setDateRange] = useState<DateRange>("Last 30 days");
  const [activeSourceFilter, setActiveSourceFilter] = useState<SourceFilterType>("Referrer");
  const [activeUserFilter, setActiveUserFilter] = useState<UserFilterType>("Country");
  const [showTrackingCode, setShowTrackingCode] = useState(false);

  // Project data
  const [project, setProject] = useState<Project | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  
  // Ensure projectId is defined before calling hooks that depend on it.
  // We can use a placeholder or skip execution within hooks if projectId is not yet available.
  const projectId = rawSlug || ""; // Use an empty string or handle appropriately if rawSlug can be undefined

  // Fetch analytics data using our custom hook - MOVED TO TOP LEVEL
  const { 
    analyticsData, 
    loading, 
    refreshing  } = useAnalytics(projectId, dateRange);
  
  // Fetch project data - MOVED TO TOP LEVEL
  useEffect(() => {
    if (!projectId) { // Guard clause if projectId is not available
      setProject(null); // Reset project data if no ID
      setProjectError("Project ID is missing."); // Optionally set an error
      return;
    }
    const fetchProject = async () => {
      try {
        setProjectError(null);
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch project');
        }
        const data = await response.json();
        setProject(data);
        document.title = `${data.name} - Analytics`;
      } catch (error) {
        console.error('Error fetching project:', error);
        setProjectError(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    };
    
    fetchProject();
  }, [projectId]);
  
  // Close popups when clicking outside - MOVED TO TOP LEVEL
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.date-picker-container')) {
        // Code to close any open dropdown
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle missing project ID - This check can now happen after hooks are declared
  if (!rawSlug) {
    return (
      <div className="flex justify-center items-center p-10">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="flex items-center gap-2 mb-4">
            <WarningIcon size={24} className="text-red-500" />
            <h2 className="text-lg font-medium text-red-700">Project not found</h2>
          </div>
          <p className="text-red-600 mb-2">Please select a valid project</p>
        </div>
      </div>
    );
  }
  
  // Get tracking script
  const trackingScript = getTrackingScript();
  
  // Filter sources based on activeSourceFilter
  const getSourcesData = () => {
    if (!analyticsData || !analyticsData.sources) return [];
    // Ensure all source items have a name, defaulting to 'Unknown'
    const allSources = analyticsData.sources.map(s => ({ ...s, name: s.name || 'Unknown' }));

    switch (activeSourceFilter) {
      case 'Referrer':
        return allSources; // Shows all referrers
      case 'Ref':
        return allSources.filter(s => s.name.includes('ref='));
      case 'UTM':
        return allSources.filter(s => 
          s.name.includes('utm_source=') || 
          s.name.includes('utm_medium=') || 
          s.name.includes('utm_campaign=')
        );
      default:
        return allSources;
    }
  };
  
  // Get user data based on active filter
  const getUsersData = () => {
    if (!analyticsData) return [];
    
    switch (activeUserFilter) {
      case 'Country':
        return analyticsData.usersByCountry || [];
      case 'Browser':
        return analyticsData.usersByBrowser || [];
      case 'Device':
        return analyticsData.usersByDevice || [];
      default:
        return analyticsData.usersByCountry || [];
    }
  };
  
  // Helper function to get icon for source - REMOVED as Favicon component handles this

  // Define columns for data tables
  const sourceColumns = [
    {
      key: 'name',
      label: 'Source',
      renderCell: (item: { name?: string; users: number }) => {
        const sourceName = item.name || 'Unknown';
        return (
          <div className="flex items-center">
            <Favicon sourceName={sourceName} />
            <span className="truncate" title={sourceName}>{sourceName}</span>
          </div>
        );
      }
    },
    {
      key: 'users',
      label: 'Users'
    }
  ];
  
  const pageColumns = [
    {
      key: 'path',
      label: 'Page'
    },
    {
      key: 'users',
      label: 'Users'
    }
  ];
  
  // Define dynamic columns for users table based on active filter
  const getUserColumns = () => {
    return [
      {
        key: activeUserFilter.toLowerCase(),
        label: activeUserFilter
      },
      {
        key: 'users',
        label: 'Users'
      }
    ];
  };

  // Display project error if there is one
  if (projectError) {
    return (
      <div className="flex justify-center items-center p-10">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="flex items-center gap-2 mb-4">
            <WarningIcon size={24} className="text-red-500" />
            <h2 className="text-lg font-medium text-red-700">Error Loading Project</h2>
          </div>
          <p className="text-red-600 mb-2">{projectError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-col">
        <div>
          <div className="w-full mx-auto pb-8">
            {/* Project Header */}
            <ProjectHeader project={project} />
            
            {/* Date range selector with auto-refresh controls */}
            <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6 gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Date picker container */}
                <DateRangePicker 
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              </div>
              
              <div className="flex items-center gap-3">
                {/* Get tracking code button */}
                <button 
                  className="text-sm font-medium px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90 active:opacity-80"
                  style={{ backgroundColor: theme.primary }}
                  onClick={() => setShowTrackingCode(true)}
                >
                  Get tracking code
                </button>
              </div>
            </div>
            
            {/* Loading state for Analytics Data */}
            {loading && !refreshing ? ( // Show full skeleton only on initial load, not on refresh
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-5`}>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <DataTableSkeleton />
                <DataTableSkeleton />
                <DataTableSkeleton />
                <EventsCardSkeleton />
              </div>
            ) : !analyticsData && !loading ? ( // Added !loading to ensure this shows after loading attempt
              <div className="flex justify-center items-center py-12">
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-700">No analytics data available for this date range.</p>
                </div>
              </div>
            ) : analyticsData ? ( // Only render if analyticsData is available
              // Analytics Grid
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-5 ${refreshing ? 'opacity-90' : ''}`}>
                {/* Users Card */}
                <StatCard
                  title="Users"
                  value={analyticsData.uniqueUsers?.total || 0}
                  changePercentage={analyticsData.uniqueUsers?.change || 0}
                  chartData={analyticsData.uniqueUsers?.monthly || []}
                  chartLabels={analyticsData.months || []}
                  chartColor={theme.primary}
                />
                
                {/* Page Views Card */}
                <StatCard
                  title="Page Views"
                  value={analyticsData.pageViews?.total || 0}
                  changePercentage={analyticsData.pageViews?.change || 0}
                  chartData={analyticsData.pageViews?.monthly || []}
                  chartLabels={analyticsData.months || []}
                  chartColor={theme.secondary}
                />
                
                {/* Pages Table */}
                <DataTable
                  title="Pages"
                  columns={pageColumns}
                  data={analyticsData.pages || []}
                  onRowClick={(page: { path: string; users: number }) => alert(`Viewing details for page: ${page.path}`)}
                />
                
                {/* Sources Table */}
                <DataTable
                  title="Sources"
                  columns={sourceColumns} // Uses updated columns with Favicon component
                  data={getSourcesData()} 
                  filterComponent={
                    <SourceFilter 
                      activeFilter={activeSourceFilter} 
                      onFilterChange={setActiveSourceFilter}
                    />
                  }
                  onRowClick={(source: { name?: string; users: number }) => alert(`Viewing details for source: ${source.name}`)}
                />
                
                {/* Users Table - uses dynamic columns */}
                <DataTable
                  title="Users"
                  columns={getUserColumns()}
                  data={getUsersData()}
                  filterComponent={
                    <UserFilter
                      activeFilter={activeUserFilter}
                      onFilterChange={setActiveUserFilter}
                    />
                  }
                  onRowClick={(item: UserDataItem) => { // Use the more specific UserDataItem type
                    const property = activeUserFilter.toLowerCase();
                    const value = item[property];
                    alert(`Viewing details for ${activeUserFilter}: ${value}`);
                  }}
                />

                {/* Events Card */}
                <EventsCard /> {/* Added EventsCard here */}
              </div>
            ) : null /* Fallback for initial state before loading or data check */}
          </div>
        </div>
        
        {/* Tracking Code Modal */}
        <TrackingCodeModal 
          isOpen={showTrackingCode}
          onClose={() => setShowTrackingCode(false)}
          trackingScript={trackingScript}
        />
      </div>
    </ErrorBoundary>
  );
}