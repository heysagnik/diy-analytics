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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
      mainClassName="flex flex-col gap-6"
    >
        <Tabs
          value={activeTab}
          onValueChange={(v) => typeof v === 'string' && setActiveTab(v as SettingsTabId)}
          className="gap-4"
        >
          <div className="max-w-full overflow-x-auto scrollbar-hide">
            <TabsList className="w-max">
              {SETTINGS_TABS.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={tab.id === 'danger' ? 'text-danger data-active:bg-danger data-active:text-white data-active:border-danger/20 data-active:shadow-xs' : ''}
                  >
                    <TabIcon size={14} weight={tab.id === activeTab ? 'bold' : 'regular'} />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="general" className="animate-fade-in">
            <GeneralSection project={project} onProjectUpdate={updateProject} showToast={showToast} />
          </TabsContent>
          <TabsContent value="tracking" className="animate-fade-in">
            <TrackingSection project={project} onProjectUpdate={updateProject} showToast={showToast} />
          </TabsContent>
          <TabsContent value="goals" className="animate-fade-in">
            <GoalsSection project={project} showToast={showToast} />
          </TabsContent>
          <TabsContent value="alerts" className="animate-fade-in">
            <AlertsSection project={project} showToast={showToast} />
          </TabsContent>
          <TabsContent value="data" className="animate-fade-in">
            <DataManagementSection project={project} showToast={showToast} />
          </TabsContent>
          <TabsContent value="danger" className="animate-fade-in">
            <DangerZoneSection project={project} showToast={showToast} />
          </TabsContent>
        </Tabs>
    </ProjectPageShell>
  );
}
