"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { DateRange, AnalyticsData } from "@/types/analytics";
import { DATE_RANGE_OPTIONS, fetchAnalytics, isDateRange, normalizeAnalyticsError } from "@/lib/api/analytics";
import { MainChart } from "@/components/analytics/MainChart";
import { MetricsGrid } from "@/components/analytics/MetricsGrid";
import { BreakdownPanel } from "@/components/analytics/BreakdownPanel";
import { FilterBar } from "@/components/analytics/FilterBar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Project } from "@/types/analytics";
import { ActiveFilter, filtersToQuery } from "@/types/filters";
import { getCountryName } from "@/utils/country";
import {
  FileTextIcon,
  ArrowSquareOutIcon,
  GlobeIcon,
  DesktopIcon,
  BrowserIcon,
  MegaphoneIcon,
} from "@phosphor-icons/react";

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

interface PublicDashboardClientProps {
  projectId: string;
  project: Pick<Project, 'name' | 'url' | 'domain'>;
  initialData: AnalyticsData;
  initialRange: DateRange;
}

export default function PublicDashboardClient({
  projectId,
  project,
  initialData,
  initialRange,
}: PublicDashboardClientProps) {
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);
  const [filters, setFilters] = useState<ActiveFilter[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterQuery = useMemo(() => filtersToQuery(filters), [filters]);

  const fetchData = useCallback(async (range: DateRange, query: ReturnType<typeof filtersToQuery>, signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalytics('/api/public/analytics', { projectId, dateRange: range, filters: query }, signal);
      setAnalyticsData(data);
    } catch (e) {
      const message = normalizeAnalyticsError(e);
      if (message) setError(message);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [projectId]);

  // Skip the initial mount (server already supplied initialData for the
  // default range/no filters) — only refetch on subsequent changes.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const controller = new AbortController();
    void fetchData(dateRange, filterQuery, controller.signal);
    return () => controller.abort();
  }, [dateRange, filterQuery, fetchData]);

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

  const rangePicker = useMemo(
    () => (
      <Select value={dateRange} onValueChange={(v: unknown) => {
        if (isDateRange(v)) setDateRange(v);
      }} disabled={loading}>
        <SelectTrigger aria-label="Date range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_OPTIONS.map((r) => (
            <SelectItem key={r} value={r}>{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
    [dateRange, loading]
  );

  if (!projectId || !OBJECT_ID_REGEX.test(projectId)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground p-6">
        <div className="text-center max-w-md">
          <h1 className="font-display text-2xl font-semibold text-foreground mb-2">Invalid dashboard link</h1>
          <p className="text-sm">The dashboard URL is malformed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-accent text-accent-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19l-6-2V4l6 2m6 5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">{project.name}</h1>
              <p className="text-xs text-muted-foreground">Public dashboard · {project.domain || project.url}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Read-only</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 gap-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground">Analytics</h2>
            <p className="text-sm text-muted-foreground">Data from {dateRange}</p>
          </div>
          {rangePicker}
        </div>

        <div className="mb-6">
          <FilterBar filters={filters} onRemove={removeFilter} onClearAll={clearFilters} />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 rounded-full border-2 border-border border-t-accent animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-4">
            <MetricsGrid analyticsData={analyticsData} />
            <MainChart analyticsData={analyticsData} dateRange={dateRange} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BreakdownPanel
                defaultTabId="pages"
                onFilter={addFilter}
                activeValues={filterQuery}
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
                    label: "Entry Pages",
                    icon: FileTextIcon,
                    items: analyticsData.entryPages.map((p) => ({ name: p.path, value: p.views })),
                  },
                  {
                    id: "exit-pages",
                    label: "Exit Pages",
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
                    icon: MegaphoneIcon,
                    dimension: "utmCampaign",
                    items: analyticsData.campaigns.map((c) => ({ name: c.name, value: c.users })),
                  },
                ]}
              />

              <BreakdownPanel
                defaultTabId="countries"
                onFilter={addFilter}
                activeValues={filterQuery}
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
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-muted-foreground">
          Powered by{" "}
          <a href="https://github.com/heysagnik/diy-analytics" target="_blank" rel="noopener noreferrer" className="underline">
            DIY Analytics
          </a>
        </footer>
      </main>
    </div>
  );
}
