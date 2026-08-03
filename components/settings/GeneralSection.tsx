import React, { useState, useEffect } from 'react';
import { Project } from '../../types/settings';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LinkIcon, FloppyDiskIcon, CopyIcon, CheckIcon } from '@phosphor-icons/react';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';
import { updateProject } from '@/lib/api/projects';

interface GeneralSectionProps {
  project: Project;
  onProjectUpdate: (updatedProject: Partial<Project>) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const GeneralSection: React.FC<GeneralSectionProps> = ({
  project,
  onProjectUpdate,
  showToast,
}) => {
  const [projectName, setProjectName] = useState(project?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [publicMode, setPublicMode] = useState(project?.publicMode || false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    setProjectName(project?.name || '');
    setPublicMode(project?.publicMode || false);
  }, [project]);

  const handleUpdateProject = async () => {
    if (!project?._id) return;
    if (!projectName.trim()) {
      showToast('error', 'Project name cannot be empty.');
      return;
    }

    setIsUpdating(true);
    try {
      const updatedProject = await updateProject(project._id, { name: projectName });
      onProjectUpdate({ name: updatedProject.name });

      showToast('success', 'Project details updated successfully!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'An error occurred while updating project details.';
      showToast('error', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePublicModeChange = async (enabled: boolean) => {
    if (!project?._id) return;
    setPublicMode(enabled);

    try {
      const updatedProject = await updateProject(project._id, { publicMode: enabled }, 'Failed to update public mode.');
      onProjectUpdate({ publicMode: updatedProject.publicMode });
      showToast('success', `Public dashboard is now ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to update public mode.';
      showToast('error', errorMessage);
      setPublicMode(!enabled);
    }
  };

  const publicDashboardUrl = project?.publicMode ? `/public/${project._id}` : '';
  const fullShareUrl = typeof window !== 'undefined' ? window.location.origin + publicDashboardUrl : publicDashboardUrl;

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
    <SettingsGroup title="General">
      <SettingsRow label="Project Name" description="The name of your project.">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isUpdating}
            placeholder="My Website Analytics"
            aria-label="Project name"
          />
          <Button
            size="sm"
            onClick={handleUpdateProject}
            disabled={isUpdating || projectName === project?.name}
          >
            <FloppyDiskIcon size={14} />
            <span>Save</span>
          </Button>
        </div>
      </SettingsRow>

      <SettingsRow label="Project ID" description="A unique identifier assigned to your project.">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input readOnly value={project?._id || ''} className="font-mono text-xs" aria-label="Project ID" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(project?._id || '', setCopiedId)}
          >
            <span className="icon-crossfade size-3.5">
              <CopyIcon size={14} className={`size-3.5 ${copiedId ? 'icon-crossfade-hidden' : ''}`} />
              <CheckIcon size={14} className={`size-3.5 text-success ${copiedId ? '' : 'icon-crossfade-hidden'}`} />
            </span>
            <span>{copiedId ? 'Copied' : 'Copy'}</span>
          </Button>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Public Dashboard Access"
        description="Allow anyone with the link to view a read-only version of your analytics without requiring a login."
        action={
          <Switch
            checked={publicMode}
            onCheckedChange={(checked) => handlePublicModeChange(checked)}
            aria-label="Public Dashboard Toggle"
          />
        }
      >
        {publicMode && publicDashboardUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Shareable Dashboard Link
              </span>
              <Badge className="bg-success/10 text-success">
                Publicly Accessible
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input readOnly value={fullShareUrl} className="font-mono text-xs" aria-label="Shareable dashboard link" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(fullShareUrl, setCopiedUrl)}
              >
                <span className="icon-crossfade size-3.5">
                  <LinkIcon size={14} className={`size-3.5 ${copiedUrl ? 'icon-crossfade-hidden' : ''}`} />
                  <CheckIcon size={14} className={`size-3.5 text-success ${copiedUrl ? '' : 'icon-crossfade-hidden'}`} />
                </span>
                <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
              </Button>
            </div>
          </div>
        )}
      </SettingsRow>
    </SettingsGroup>
  );
};
