'use client';

import {
  BellIcon,
  DownloadSimpleIcon,
  EyeSlashIcon,
  SlidersHorizontalIcon,
  TargetIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { AlertsSection } from '@/components/settings/AlertsSection';
import { DangerZoneSection } from '@/components/settings/DangerZoneSection';
import { DataManagementSection } from '@/components/settings/DataManagementSection';
import { GeneralSection } from '@/components/settings/GeneralSection';
import { GoalsSection } from '@/components/settings/GoalsSection';
import { TrackingSection } from '@/components/settings/TrackingSection';
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/useToast';
import { useProjectContext } from '../project-context';

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
            <TabsIndicator className={activeTab === 'danger' ? 'border-danger/20 bg-danger/10 shadow-none' : ''} />
            {SETTINGS_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isDanger = tab.id === 'danger';
              return (
                <div key={tab.id} className="flex items-center">
                  {isDanger && <div aria-hidden className="mx-1 h-4 w-px bg-border/60" />}
                  <TabsTrigger value={tab.id} className={isDanger ? 'text-danger data-active:!text-danger' : ''}>
                    <TabIcon size={14} weight={tab.id === activeTab ? 'bold' : 'regular'} />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                </div>
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
