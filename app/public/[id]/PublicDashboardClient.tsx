'use client';

import { LinkBreakIcon, WarningCircleIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BreakdownPanel } from '@/components/analytics/BreakdownPanel';
import { FilterBar } from '@/components/analytics/FilterBar';
import { MainChart } from '@/components/analytics/MainChart';
import { MetricsGrid } from '@/components/analytics/MetricsGrid';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DATE_RANGE_OPTIONS, fetchAnalytics, isDateRange, normalizeAnalyticsError } from '@/lib/api/analytics';
import { isValidUuid } from '@/lib/uuid';
import type { AnalyticsData, DateRange, Project } from '@/types/analytics';
import { type ActiveFilter, filtersToQuery } from '@/types/filters';
import { getCountryName } from '@/utils/country';
import { normalizeProjectUrl } from '@/utils/url';

function ProjectLogo({ name, url }: { name: string; url: string }) {
  const [failed, setFailed] = useState(false);
  const hostname = normalizeProjectUrl(url)?.hostname;

  if (hostname && !failed) {
    return (
      <div className="w-9 h-9 rounded-xl flex-shrink-0 relative overflow-hidden bg-surface-secondary outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
        {/* biome-ignore lint/performance/noImgElement: needs onError fallback for a favicon that may 404; next/image can't do that */}
        <img
          src={`/api/site-icon?domain=${encodeURIComponent(hostname)}`}
          alt=""
          width={36}
          height={36}
          className="rounded-xl size-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-accent text-accent-foreground text-sm font-semibold flex-shrink-0">
      {name ? name.charAt(0).toUpperCase() : '#'}
    </div>
  );
}

function formatPageMeta(bounceRate?: number, avgTimeOnPage?: number): string | undefined {
  const parts: string[] = [];
  if (typeof bounceRate === 'number') parts.push(`${bounceRate}% bounce`);
  if (typeof avgTimeOnPage === 'number') {
    const m = Math.floor(avgTimeOnPage / 60);
    const s = Math.round(avgTimeOnPage % 60);
    parts.push(`${m > 0 ? `${m}m ` : ''}${s}s avg`);
  }
  return parts.length ? parts.join(' · ') : undefined;
}

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

  const fetchData = useCallback(
    async (range: DateRange, query: ReturnType<typeof filtersToQuery>, signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAnalytics(
          '/api/public/analytics',
          { projectId, dateRange: range, filters: query },
          signal,
        );
        setAnalyticsData(data);
      } catch (e) {
        const message = normalizeAnalyticsError(e);
        if (message) setError(message);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [projectId],
  );

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

  const addFilter = useCallback((dimension: ActiveFilter['dimension'], value: string) => {
    setFilters((prev) =>
      prev.some((f) => f.dimension === dimension && f.value === value) ? prev : [...prev, { dimension, value }],
    );
  }, []);

  const removeFilter = useCallback((filter: ActiveFilter) => {
    setFilters((prev) => prev.filter((f) => !(f.dimension === filter.dimension && f.value === filter.value)));
  }, []);

  const clearFilters = useCallback(() => setFilters([]), []);

  const rangePicker = useMemo(
    () => (
      <Select
        value={dateRange}
        onValueChange={(v: unknown) => {
          if (isDateRange(v)) setDateRange(v);
        }}
        disabled={loading}
      >
        <SelectTrigger aria-label="Date range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_OPTIONS.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ),
    [dateRange, loading],
  );

  if (!projectId || !isValidUuid(projectId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full p-8 text-center animate-fade-in">
          <div className="icon-chip size-12 mx-auto mb-4">
            <LinkBreakIcon size={22} weight="bold" />
          </div>
          <h1 className="font-display text-xl font-semibold text-foreground mb-1 text-balance">
            Invalid dashboard link
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">The dashboard URL is malformed.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProjectLogo name={project.name} url={project.domain || project.url} />
            <div>
              <h1 className="text-lg font-semibold leading-tight">{project.name}</h1>
              <p className="text-xs text-muted-foreground">Public dashboard · {project.domain || project.url}</p>
            </div>
          </div>
          <Badge variant="secondary">Read-only</Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 gap-3">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-foreground text-balance">Analytics</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 tabular-nums">
              Data from {dateRange}
              {loading && (
                <span
                  className="h-3 w-3 rounded-full border-2 border-border border-t-accent animate-spin"
                  aria-hidden="true"
                />
              )}
            </p>
          </div>
          {rangePicker}
        </div>

        <div className="mb-6">
          <FilterBar filters={filters} onRemove={removeFilter} onClearAll={clearFilters} />
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/10 text-warning p-4 text-sm animate-fade-in">
            <WarningCircleIcon size={16} weight="bold" className="shrink-0" />
            {error}
          </div>
        )}

        {!error && (
          <div
            className={`flex flex-col gap-4 transition-opacity duration-200 ease-out ${loading ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}
            aria-busy={loading}
          >
            <MetricsGrid analyticsData={analyticsData} />
            <MainChart analyticsData={analyticsData} dateRange={dateRange} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BreakdownPanel
                defaultTabId="pages"
                onFilter={addFilter}
                activeValues={filterQuery}
                tabs={[
                  {
                    id: 'pages',
                    label: 'Pages',
                    dimension: 'page',
                    items: analyticsData.pages.map((p) => ({
                      name: p.path,
                      value: p.views,
                      meta: formatPageMeta(p.bounceRate, p.avgTimeOnPage),
                    })),
                  },
                  {
                    id: 'entry-pages',
                    label: 'Entry Pages',
                    items: analyticsData.entryPages.map((p) => ({ name: p.path, value: p.views })),
                  },
                  {
                    id: 'exit-pages',
                    label: 'Exit Pages',
                    items: analyticsData.exitPages.map((p) => ({ name: p.path, value: p.views })),
                  },
                ]}
              />

              <BreakdownPanel
                defaultTabId="sources"
                onFilter={addFilter}
                activeValues={filterQuery}
                tabs={[
                  {
                    id: 'sources',
                    label: 'Sources',
                    dimension: 'source',
                    items: analyticsData.sources.map((s) => ({ name: s.name, value: s.users })),
                  },
                  {
                    id: 'campaigns',
                    label: 'Campaigns',
                    dimension: 'utmCampaign',
                    items: analyticsData.campaigns.map((c) => ({ name: c.name, value: c.users })),
                  },
                  {
                    id: 'utm',
                    label: 'UTM',
                    items: analyticsData.utmBreakdown.map((u) => ({
                      name: `${u.source} / ${u.medium} / ${u.campaign}`,
                      value: u.users,
                    })),
                  },
                ]}
              />

              <BreakdownPanel
                defaultTabId="countries"
                onFilter={addFilter}
                activeValues={filterQuery}
                tabs={[
                  {
                    id: 'countries',
                    label: 'Countries',
                    dimension: 'country',
                    items: analyticsData.countries.map((c) => ({ name: c.country, value: c.users })),
                    format: getCountryName,
                  },
                  {
                    id: 'cities',
                    label: 'Cities',
                    dimension: 'city',
                    items: analyticsData.cities.map((c) => ({
                      name: c.region ? `${c.city}, ${c.region}` : c.city,
                      value: c.users,
                      meta: c.country,
                    })),
                  },
                ]}
              />

              <BreakdownPanel
                defaultTabId="devices"
                onFilter={addFilter}
                activeValues={filterQuery}
                tabs={[
                  {
                    id: 'devices',
                    label: 'Devices',
                    dimension: 'device',
                    items: analyticsData.devices.map((d) => ({ name: d.device, value: d.users, meta: d.detail })),
                    format: (s) => s.charAt(0).toUpperCase() + s.slice(1),
                  },
                  {
                    id: 'browsers',
                    label: 'Browsers',
                    dimension: 'browser',
                    items: analyticsData.browsers.map((b) => ({ name: b.browser, value: b.users, meta: b.version })),
                  },
                  {
                    id: 'os',
                    label: 'OS',
                    dimension: 'os',
                    items: analyticsData.os.map((o) => ({ name: o.os, value: o.users, meta: o.version })),
                  },
                ]}
              />
            </div>
          </div>
        )}

        <footer className="mt-12 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          Powered by
          <a
            href="https://github.com/heysagnik/diy-analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <Image
              src="/brand/logo.svg"
              alt="DIY Analytics"
              width={91}
              height={12}
              className="h-3 w-auto dark:hidden"
            />
            <Image
              src="/brand/logo-dark.svg"
              alt="DIY Analytics"
              width={91}
              height={12}
              className="hidden h-3 w-auto dark:block"
            />
          </a>
        </footer>
      </main>
    </div>
  );
}
