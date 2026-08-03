import React, { useState } from 'react';
import { Project } from '../../types/settings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';
import { isAnalyticsResponse } from '@/lib/api/analytics';

interface DataManagementSectionProps {
  project: Project;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

function escapeCsvValue(v: string | number): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsvSection(title: string, headers: string[], rows: (string | number)[][]): string {
  if (rows.length === 0) return '';
  const lines = [title, headers.join(','), ...rows.map((r) => r.map(escapeCsvValue).join(','))];
  return lines.join('\n');
}

export const DataManagementSection: React.FC<DataManagementSectionProps> = ({
  project,
  showToast,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    if (!project?._id) return;
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ projectId: project._id, dateRange: 'ALL_TIME' });
      const response = await fetch(`/api/analytics?${params.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to export data (${response.status})`);
      }
      const result: unknown = await response.json();
      if (typeof result !== 'object' || result === null || !('data' in result) || !isAnalyticsResponse(result.data)) {
        throw new Error('Analytics export returned an invalid response');
      }
      const data = result.data;

      const sections = [
        toCsvSection('Pages', ['Path', 'Views', 'Users'],
          data.pages.map((p) => [p.path, p.views, p.users])),
        toCsvSection('Entry Pages', ['Path', 'Views', 'Users'],
          data.entryPages.map((p) => [p.path, p.views, p.users])),
        toCsvSection('Exit Pages', ['Path', 'Views', 'Users'],
          data.exitPages.map((p) => [p.path, p.views, p.users])),
        toCsvSection('Sources', ['Source', 'Users', 'Sessions'],
          data.sources.map((s) => [s.name, s.users, s.sessions])),
        toCsvSection('Campaigns', ['Campaign', 'Users', 'Sessions'],
          data.campaigns.map((c) => [c.name, c.users, c.sessions])),
        toCsvSection('Countries', ['Country', 'Users', 'Sessions'],
          data.countries.map((c) => [c.country, c.users, c.sessions])),
        toCsvSection('Browsers', ['Browser', 'Users', 'Sessions'],
          data.browsers.map((b) => [b.browser, b.users, b.sessions])),
        toCsvSection('Devices', ['Device', 'Users', 'Sessions'],
          data.devices.map((d) => [d.device, d.users, d.sessions])),
        toCsvSection('Goals', ['Goal', 'Conversions', 'Total Sessions', 'Rate %'],
          data.goals.map((g) => [g.name, g.conversions, g.totalSessions, g.rate])),
        toCsvSection('Top Events', ['Event', 'Count', 'Unique Users'],
          data.topEvents.map((e) => [e.name, e.count, e.uniqueUsers])),
      ].filter(Boolean);

      const csv = sections.join('\n\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics-${project.name}-all-time-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('success', 'All-time aggregate analytics exported successfully.');
    } catch (error: unknown) {
      console.error('Could not export analytics:', error);
      showToast('error', 'Could not export analytics. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SettingsGroup
      title="Data"
      headerAction={
        <Badge variant="secondary" className="hidden sm:inline-flex">
          Aggregate Snapshot
        </Badge>
      }
    >
      <SettingsRow
        label="Export Aggregate Analytics"
        description="Download an all-time CSV snapshot of aggregate pages, acquisition, audience, goals, and top-event metrics. Raw visitor and session telemetry is not included."
        action={
          <Button
            size="sm"
            onClick={handleExportData}
            disabled={isExporting}
          >
            <DownloadSimpleIcon size={14} />
            <span>{isExporting ? 'Preparing...' : 'Download CSV'}</span>
          </Button>
        }
      >
        <p className="text-xs text-muted-foreground">Generated on demand; may take a moment for large datasets.</p>
      </SettingsRow>
    </SettingsGroup>
  );
};
