import { CheckIcon, CopyIcon } from '@phosphor-icons/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { updateProject } from '@/lib/api/projects';
import type { Project } from '../../types/settings';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

interface TrackingSectionProps {
  project: Project;
  onProjectUpdate: (updatedProject: Partial<Project>) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const TrackingSection: React.FC<TrackingSectionProps> = ({ project, onProjectUpdate, showToast }) => {
  const [excludedPaths, setExcludedPaths] = useState(project?.excludedPaths?.join(', ') || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [excludeMyIP, setExcludeMyIP] = useState(false);
  const [myIP, setMyIP] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    setExcludedPaths(project?.excludedPaths?.join(', ') || '');

    let cancelled = false;
    fetch('/api/whoami')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ip) return;
        setMyIP(data.ip);
        setExcludeMyIP(project?.excludedIPs?.includes(data.ip) || false);
      })
      .catch((err) => console.error('Could not determine visitor IP', err));
    return () => {
      cancelled = true;
    };
  }, [project]);

  const handleExcludeMyIP = async (checked: boolean) => {
    if (!project?._id || !myIP) return;

    setExcludeMyIP(checked);
    setIsUpdating(true);

    try {
      const currentIPs = project.excludedIPs || [];
      let newIPs = [...currentIPs];
      if (checked) {
        if (!newIPs.includes(myIP)) {
          newIPs.push(myIP);
        }
      } else {
        newIPs = newIPs.filter((ip) => ip !== myIP);
      }

      const updatedProject = await updateProject(
        project._id,
        { excludedIPs: newIPs },
        'Failed to update tracking settings',
      );
      onProjectUpdate({ excludedIPs: updatedProject.excludedIPs });

      showToast('success', `Your visits will ${checked ? 'no longer' : 'now'} be tracked`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      showToast('error', errorMessage);
      setExcludeMyIP(!checked);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateExclusions = async () => {
    if (!project?._id) return;

    const parsedPaths = excludedPaths
      .split(',')
      .map((path) => path.trim())
      .filter((path) => path);

    setIsUpdating(true);

    try {
      const updatedProject = await updateProject(
        project._id,
        { excludedPaths: parsedPaths },
        'Failed to update tracking exclusions',
      );
      onProjectUpdate({
        excludedPaths: updatedProject.excludedPaths,
      });

      showToast('success', 'Exclusion settings saved');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      showToast('error', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const getTrackingScript = () => {
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return `<script async defer src="${baseUrl}/api/tracker.js?site-id=${project.trackingCode}"></script>`;
  };

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'Failed to copy');
    }
  };

  return (
    <SettingsGroup title="Tracking & Privacy">
      <SettingsRow
        label="Don't track my own visits"
        description={
          <span className="flex items-center gap-1.5">
            <span>Detected IP:</span>
            <code className="font-mono bg-surface-secondary px-2 py-0.5 rounded-full border border-border text-foreground">
              {myIP || 'Detecting IP...'}
            </code>
          </span>
        }
        action={
          <Switch
            checked={excludeMyIP}
            onCheckedChange={(checked) => handleExcludeMyIP(checked)}
            disabled={isUpdating || !myIP}
            aria-label="Exclude my visits toggle"
          />
        }
      />

      <SettingsRow
        label="URL Path Exclusions"
        description="Comma-separated path patterns that should never record page views or session telemetry."
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={excludedPaths}
            onChange={(e) => setExcludedPaths(e.target.value)}
            placeholder="/admin/*, /login, /internal/*"
            disabled={isUpdating}
            aria-label="Excluded paths"
          />
          <Button size="sm" onClick={handleUpdateExclusions} disabled={isUpdating}>
            Save
          </Button>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Tracking Snippet"
        description="Paste this into your site's HTML <head> tag to start collecting analytics."
        action={
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(getTrackingScript(), setCopiedScript)}>
            <span className="icon-crossfade size-3.5">
              <CopyIcon size={14} className={`size-3.5 ${copiedScript ? 'icon-crossfade-hidden' : ''}`} />
              <CheckIcon size={14} className={`size-3.5 text-success ${copiedScript ? '' : 'icon-crossfade-hidden'}`} />
            </span>
            <span>{copiedScript ? 'Copied' : 'Copy Snippet'}</span>
          </Button>
        }
      >
        <div className="bg-surface-secondary rounded-lg p-3 font-mono text-xs text-foreground break-all border border-border">
          {getTrackingScript()}
        </div>
      </SettingsRow>
    </SettingsGroup>
  );
};
