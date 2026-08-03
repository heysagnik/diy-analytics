"use client";

import React, { useState } from 'react';
import {
  SlidersHorizontalIcon,
  EyeSlashIcon,
  TargetIcon,
  BellIcon,
  DownloadSimpleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useToast } from '@/hooks/useToast';
import { GeneralSection } from '@/components/settings/GeneralSection';
import { GoalsSection } from '@/components/settings/GoalsSection';
import { AlertsSection } from '@/components/settings/AlertsSection';
import { TrackingSection } from '@/components/settings/TrackingSection';
import { DangerZoneSection } from '@/components/settings/DangerZoneSection';
import { DataManagementSection } from '@/components/settings/DataManagementSection';
import { Button } from '@/components/ui/button';
import { useProjectContext } from '../project-context';
import ProjectPageShell from '@/components/project/ProjectPageShell';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', icon: SlidersHorizontalIcon },
  { id: 'tracking', label: 'Tracking', icon: EyeSlashIcon },
  { id: 'goals', label: 'Goals', icon: TargetIcon },
  { id: 'alerts', label: 'Alerts', icon: BellIcon },
  { id: 'data', label: 'Data', icon: DownloadSimpleIcon },
  { id: 'danger', label: 'Danger Zone', icon: TrashIcon },
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

export default function SettingsPage() {
  const { project, updateProject } = useProjectContext();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const { showToast } = useToast();

  return (
    <ProjectPageShell
      eyebrow="Configuration"
      title="Project Settings"
      description="Configure site details, privacy exclusions, and data exports."
      className="overflow-hidden"
      mainClassName="space-y-6"
    >
        <div className="space-y-4">
          <div className="max-w-full overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5 w-max">
              {SETTINGS_TABS.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <Button
                    key={tab.id}
                    size="default"
                    variant={isActive ? 'default' : 'ghost'}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 rounded-md font-medium ${tab.id === 'danger' && !isActive ? 'text-danger hover:text-danger' : ''}`}
                  >
                    <TabIcon size={14} weight={isActive ? 'bold' : 'regular'} />
                    <span>{tab.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div key={activeTab} className="animate-fade-in">
            {activeTab === 'general' && (
              <GeneralSection project={project} onProjectUpdate={updateProject} showToast={showToast} />
            )}
            {activeTab === 'tracking' && (
              <TrackingSection project={project} onProjectUpdate={updateProject} showToast={showToast} />
            )}
            {activeTab === 'goals' && <GoalsSection project={project} showToast={showToast} />}
            {activeTab === 'alerts' && <AlertsSection project={project} showToast={showToast} />}
            {activeTab === 'data' && <DataManagementSection project={project} showToast={showToast} />}
            {activeTab === 'danger' && <DangerZoneSection project={project} showToast={showToast} />}
          </div>
        </div>
    </ProjectPageShell>
  );
}
