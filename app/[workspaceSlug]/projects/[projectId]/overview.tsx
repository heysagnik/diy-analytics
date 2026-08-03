"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { DateRange, AnalyticsData } from "@/types/analytics";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useProjectContext } from "./project-context";
import ProjectPageShell from "@/components/project/ProjectPageShell";
import {
  createEmptyAnalyticsData,
  validateAnalyticsData,
} from "@/utils/analytics";
import ErrorState from "@/components/common/ErrorState";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { MainChart } from "@/components/analytics/MainChart";
import { MetricsGrid } from "@/components/analytics/MetricsGrid";
import { BreakdownPanel } from "@/components/analytics/BreakdownPanel";
import { GoalsPanel } from "@/components/analytics/GoalsPanel";
import { WebVitalsPanel } from "@/components/analytics/WebVitalsPanel";
import { FilterBar } from "@/components/analytics/FilterBar";
import OnboardingHero from "@/components/analytics/OnboardingHero";
import type { CustomDateRange } from "@/components/analytics/DateRangePicker";
import { ActiveFilter, filtersToQuery } from "@/types/filters";
import { getCountryName } from "@/utils/country";
import {
  FileTextIcon,
  ArrowSquareOutIcon,
  GlobeIcon,
  DesktopIcon,
  BrowserIcon,
  LightningIcon,
} from "@phosphor-icons/react";

const DEFAULT_DATE_RANGE: DateRange = "Last 30 days";
const ANALYTICS_LOAD_ERROR = "We couldn't load analytics for this project. Please try again.";

const ErrorDisplay = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="w-full px-6 py-8">
    <ErrorState message={message} onRetry={onRetry} />
  </div>
);

const PageSpinner = () => (
  <div className="w-full flex items-center justify-center py-16" role="status" aria-label="Loading analytics">
    <div className="h-7 w-7 rounded-full border-2 border-border border-t-accent animate-spin" />
  </div>
);

export default function ProjectPage() {
  const { project } = useProjectContext();
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [filters, setFilters] = useState<ActiveFilter[]>([]);

  const projectId = project._id;

  // Distinguishes "this project has never received a single pageview" (show
  // the setup snippet) from "it has history, just none in the selected date
  // range" (show a plain empty state instead) — the per-range analytics
  // totals alone can't tell these apart, so this is checked independently.
  // Defaults to true so a project with real history never flashes the
  // onboarding screen while this check is still in flight.
  const [hasEverTracked, setHasEverTracked] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/has-data`, { cache: "no-store" })
      .then((res) => res.json())
      .then((result) => {
        if (!cancelled && result?.success) setHasEverTracked(!!result.data.hasData);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [projectId]);

  // Stable filter-object identity keyed off the actual filter values, so
  // useAnalytics's fetch effect doesn't refire on every render.
  const filterQuery = useMemo(() => filtersToQuery(filters), [filters]);
  const activeValues = filterQuery;

  const {
    analyticsData: rawAnalyticsData,
    loading: isLoadingAnalytics,
    error: analyticsError,
    retry: retryAnalytics,
  } = useAnalytics(projectId, dateRange, { customRange, filters: filterQuery });

  const analyticsData: AnalyticsData = useMemo(() => {
    if (rawAnalyticsData && validateAnalyticsData(rawAnalyticsData)) {
      return rawAnalyticsData;
    }
    return createEmptyAnalyticsData(dateRange);
  }, [rawAnalyticsData, dateRange]);

  const addFilter = useCallback((dimension: ActiveFilter["dimension"], value: string) => {
    setFilters((prev) =>
      prev.some((f) => f.dimension === dimension && f.value === value)
        ? prev
        : [...prev, { dimension, value }]
    );
  }, []);

  const removeFilter = useCallback((filter: ActiveFilter) => {
    setFilters((prev) => prev.filter((f) => !(f.dimension === filter.dimension && f.value === filter.value)));
  }, []);

  const clearFilters = useCallback(() => setFilters([]), []);

  const noTraffic = analyticsData.pageViews.total === 0 && analyticsData.uniqueUsers.total === 0;

  return (
    <ProjectPageShell>
      <div className="space-y-4">
        <AnalyticsHeader
          project={project}
          dateRange={dateRange}
          onDateRangeChange={(r) => {
            setDateRange(r);
            setCustomRange(null);
          }}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />

        <FilterBar filters={filters} onRemove={removeFilter} onClearAll={clearFilters} />
      </div>

      {isLoadingAnalytics && noTraffic && filters.length === 0 ? (
          <PageSpinner />
        ) : analyticsError ? (
           <ErrorDisplay message={ANALYTICS_LOAD_ERROR} onRetry={retryAnalytics} />
        ) : noTraffic && filters.length === 0 && !hasEverTracked ? (
          <OnboardingHero project={project} />
        ) : (
          <div className="flex flex-col gap-4 animate-fade-in">
            <MetricsGrid analyticsData={analyticsData} />
            <MainChart analyticsData={analyticsData} dateRange={dateRange} />
            <GoalsPanel goals={analyticsData.goals} />
            <WebVitalsPanel webVitals={analyticsData.webVitals} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BreakdownPanel
                defaultTabId="pages"
                onFilter={addFilter}
                activeValues={activeValues}
                tabs={[
                  {
                    id: "pages",
                    label: "Pages",
                    icon: FileTextIcon,
                    dimension: "page",
                    items: analyticsData.pages.map((p) => ({ name: p.path, value: p.views })),
                  },
                  {
                    id: "entry-pages",
                    label: "Entries",
                    icon: FileTextIcon,
                    items: analyticsData.entryPages.map((p) => ({ name: p.path, value: p.views })),
                  },
                  {
                    id: "exit-pages",
                    label: "Exits",
                    icon: FileTextIcon,
                    items: analyticsData.exitPages.map((p) => ({ name: p.path, value: p.views })),
                  },
                  {
                    id: "sources",
                    label: "Sources",
                    icon: ArrowSquareOutIcon,
                    dimension: "source",
                    items: analyticsData.sources.map((s) => ({ name: s.name, value: s.users })),
                  },
                  {
                    id: "campaigns",
                    label: "Campaigns",
                    icon: LightningIcon,
                    dimension: "utmCampaign",
                    items: analyticsData.campaigns.map((c) => ({ name: c.name, value: c.users })),
                  },
                ]}
              />

              <BreakdownPanel
                id="sources-list"
                defaultTabId="countries"
                onFilter={addFilter}
                activeValues={activeValues}
                tabs={[
                  {
                    id: "countries",
                    label: "Countries",
                    icon: GlobeIcon,
                    dimension: "country",
                    items: analyticsData.countries.map((c) => ({ name: c.country, value: c.users })),
                    format: getCountryName,
                  },
                  {
                    id: "devices",
                    label: "Devices",
                    icon: DesktopIcon,
                    dimension: "device",
                    items: analyticsData.devices.map((d) => ({ name: d.device, value: d.users })),
                    format: (s) => s.charAt(0).toUpperCase() + s.slice(1),
                  },
                  {
                    id: "browsers",
                    label: "Browsers",
                    icon: BrowserIcon,
                    dimension: "browser",
                    items: analyticsData.browsers.map((b) => ({ name: b.browser, value: b.users })),
                  },
                ]}
              />
            </div>

            <BreakdownPanel
              defaultTabId="events"
              rowsToShow={8}
              tabs={[
                {
                  id: "events",
                  label: "Top Events",
                  icon: LightningIcon,
                  items: analyticsData.topEvents.map((e) => ({
                    name: e.name,
                    value: e.count,
                  })),
                },
              ]}
            />
          </div>
        )}
    </ProjectPageShell>
  );
}
