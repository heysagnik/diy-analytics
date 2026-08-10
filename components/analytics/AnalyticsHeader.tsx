import { CheckIcon, CodeIcon } from '@phosphor-icons/react';
import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { DateRange, Project } from '@/types/analytics';
import { normalizeProjectUrl } from '@/utils/url';
import DateRangePicker, { type CustomDateRange } from './DateRangePicker';
import LiveVisitors from './LiveVisitors';

interface AnalyticsHeaderProps {
  project: Project;
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
  customRange?: CustomDateRange | null;
  onCustomRangeChange?: (range: CustomDateRange | null) => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  project,
  dateRange,
  onDateRangeChange,
  customRange,
  onCustomRangeChange,
}) => {
  const [copied, setCopied] = useState(false);

  const projectUrlHref = normalizeProjectUrl(project.url)?.href;

  const getTrackingScript = () => {
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return `<script async defer src="${baseUrl}/api/tracker.js?site-id=${project.trackingCode}"></script>`;
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(getTrackingScript());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy tracking code:', err);
    }
  };

  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium tracking-kicker text-accent">Overview</p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            Analytics
          </h1>
          <LiveVisitors projectId={project._id} />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1.5 font-body">
          {projectUrlHref ? (
            <a
              href={projectUrlHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium text-foreground truncate max-w-xs"
            >
              {project.domain || project.url}
            </a>
          ) : (
            <span className="font-medium text-foreground truncate max-w-xs">{project.domain || project.url}</span>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyCode}
            aria-label={copied ? 'Copied!' : 'Copy tracking code'}
          >
            <span className="icon-crossfade size-3.5">
              <CodeIcon size={14} className={`size-3.5 ${copied ? 'icon-crossfade-hidden' : ''}`} />
              <CheckIcon size={14} className={`size-3.5 text-success ${copied ? '' : 'icon-crossfade-hidden'}`} />
            </span>
            <span>{copied ? 'Copied' : 'Snippet'}</span>
          </Button>
        </div>
      </div>

      <DateRangePicker
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        customRange={customRange}
        onCustomRangeChange={onCustomRangeChange}
      />
    </header>
  );
};
