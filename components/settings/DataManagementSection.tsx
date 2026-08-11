import { DownloadSimpleIcon } from '@phosphor-icons/react';
import type React from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Project } from '../../types/settings';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

interface DataManagementSectionProps {
  project: Project;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface RawPageView {
  id: string;
  timestamp: string;
  sessionId: string;
  userId: string | null;
  url: string;
  path: string;
  referrer: string | null;
  source: string;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  device: string | null;
  deviceVendor: string | null;
  deviceModel: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
}

interface RawEvent {
  id: string;
  timestamp: string;
  name: string;
  sessionId: string;
  userId: string | null;
  url: string;
  path: string;
  referrer: string | null;
  source: string;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  device: string | null;
  deviceVendor: string | null;
  deviceModel: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  data: Record<string, unknown> | null;
}

function escapeCsvValue(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsvSection(title: string, headers: string[], rows: (string | number | null | undefined)[][]): string {
  if (rows.length === 0) return `${title}\nNo records found`;
  const lines = [title, headers.join(','), ...rows.map((r) => r.map(escapeCsvValue).join(','))];
  return lines.join('\n');
}

export const DataManagementSection: React.FC<DataManagementSectionProps> = ({ project, showToast }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    if (!project?._id) return;
    setIsExporting(true);
    try {
      const response = await fetch(`/api/projects/${project._id}/raw-data`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to export raw data (${response.status})`);
      }
      const result = (await response.json()) as { pageViews: RawPageView[]; events: RawEvent[] };
      const { pageViews = [], events = [] } = result;

      const pageViewHeaders = [
        'ID',
        'Timestamp',
        'Session ID',
        'User ID',
        'URL',
        'Path',
        'Referrer',
        'Source',
        'Browser',
        'Browser Version',
        'OS',
        'OS Version',
        'Device',
        'Device Vendor',
        'Device Model',
        'Country',
        'Region',
        'City',
        'UTM Source',
        'UTM Medium',
        'UTM Campaign',
        'UTM Term',
        'UTM Content',
      ];

      const pageViewRows = pageViews.map((pv) => [
        pv.id,
        pv.timestamp,
        pv.sessionId,
        pv.userId,
        pv.url,
        pv.path,
        pv.referrer,
        pv.source,
        pv.browser,
        pv.browserVersion,
        pv.os,
        pv.osVersion,
        pv.device,
        pv.deviceVendor,
        pv.deviceModel,
        pv.country,
        pv.region,
        pv.city,
        pv.utmSource,
        pv.utmMedium,
        pv.utmCampaign,
        pv.utmTerm,
        pv.utmContent,
      ]);

      const eventHeaders = [
        'ID',
        'Timestamp',
        'Event Name',
        'Session ID',
        'User ID',
        'URL',
        'Path',
        'Referrer',
        'Source',
        'Browser',
        'Browser Version',
        'OS',
        'OS Version',
        'Device',
        'Device Vendor',
        'Device Model',
        'Country',
        'Region',
        'City',
        'UTM Source',
        'UTM Medium',
        'UTM Campaign',
        'UTM Term',
        'UTM Content',
        'Event Data (JSON)',
      ];

      const eventRows = events.map((e) => [
        e.id,
        e.timestamp,
        e.name,
        e.sessionId,
        e.userId,
        e.url,
        e.path,
        e.referrer,
        e.source,
        e.browser,
        e.browserVersion,
        e.os,
        e.osVersion,
        e.device,
        e.deviceVendor,
        e.deviceModel,
        e.country,
        e.region,
        e.city,
        e.utmSource,
        e.utmMedium,
        e.utmCampaign,
        e.utmTerm,
        e.utmContent,
        e.data ? JSON.stringify(e.data) : '',
      ]);

      const sections = [
        toCsvSection('Raw Page Views', pageViewHeaders, pageViewRows),
        toCsvSection('Raw Custom Events', eventHeaders, eventRows),
      ];

      const csv = sections.join('\n\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics-${project.name}-raw-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('success', 'All-time raw telemetry exported successfully.');
    } catch (error: unknown) {
      console.error('Could not export raw analytics data:', error);
      showToast('error', 'Could not export raw analytics data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SettingsGroup
      title="Data"
      headerAction={
        <Badge variant="secondary" className="hidden sm:inline-flex">
          Raw Snapshot
        </Badge>
      }
    >
      <SettingsRow
        label="Export All Data"
        description="Download an all-time CSV file containing structured raw telemetry records, including every page view and custom event with full session, user identity, browser, location, and UTM parameters."
        action={
          <Button size="sm" onClick={handleExportData} disabled={isExporting}>
            <DownloadSimpleIcon size={14} />
            <span>{isExporting ? 'Preparing...' : 'Export All Data'}</span>
          </Button>
        }
      >
        <p className="text-xs text-muted-foreground">Generated on demand; may take a moment for large datasets.</p>
      </SettingsRow>
    </SettingsGroup>
  );
};
