"use client";

import React, { useState, useEffect, use } from 'react';
import {
  WarningCircleIcon,
  CaretDownIcon,
  HardDrivesIcon,
  FadersHorizontalIcon,
  KeyholeIcon,
} from '@phosphor-icons/react';

// Types
import { Project, defaultTheme } from '../../../../types/settings';

// Hooks
import { useToast } from '../../../../hooks/useToast';

// Components
import { ToastContainer } from '../../../../components/ui/Toast';
import { ErrorMessage } from '../../../../components/ui/ErrorMessage';
import { Button } from '../../../../components/ui/Button';
import { GeneralSection } from '../../../../components/settings/GeneralSection';
import { TrackingSection } from '../../../../components/settings/TrackingSection';
import { DangerZoneSection } from '@/components/settings/DangerZoneSection';
import { DataManagementSection } from '@/components/settings/DataManagementSection';
import { SettingsSkeleton } from '@/components/ui/SettingsSkeleton';

// Main Settings Page Component
export default function SettingsPage({ params: promiseParams }: { params: Promise<{ slugs: string[] }> }) {
  // Get route params
  const params = use(promiseParams);
  const projectId = params.slugs; // Extract the project ID from the first slug

  // State
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toasts, showToast } = useToast();
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    essential: true,
    tracking: false,
    dataManagement: false,
    dangerZone: false
  });

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fetch project data
  useEffect(() => {
    if (!projectId) return;
    
    const fetchProject = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch project (status: ${response.status})`);
        }
        
        const data = await response.json();
        setProject(data);
      } catch (err: unknown) {
        console.error("Error fetching project:", err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Could not load project details. An unknown error occurred.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [projectId]);

  // Update project state when changes are made
  const handleProjectUpdate = (updatedFields: Partial<Project>) => {
    setProject(prev => prev ? { ...prev, ...updatedFields } : null);
  };

  // Render skeleton loading state
  if (loading) {
    return <SettingsSkeleton theme={defaultTheme} />;
  }

  // Render error state
  if (error) {
    return (
      <ErrorMessage 
        theme={defaultTheme}
        title="Error Loading Settings"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Render "project not found" state
  if (!project) {
    return (
      <div className="p-8 text-center" style={{ color: defaultTheme.accent }}>
        <WarningCircleIcon size={48} className="mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
        <p className="mb-4">The requested project could not be found.</p>
        <Button
          onClick={() => window.location.href = '/projects'}
          variant="primary"
          theme={defaultTheme}
        >
          Go to Projects Dashboard
        </Button>
      </div>
    );
  }

  // Section header component
  const SectionHeader = ({ title, icon, section }: { title: string; icon: React.ReactNode; section: string }) => (
    <div 
      className="flex items-center justify-between cursor-pointer py-2" 
      onClick={() => toggleSection(section)}
    >
      <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: defaultTheme.accent }}>
        {icon}
        {title}
      </h2>
      <CaretDownIcon 
        size={20} 
        style={{ 
          transform: expandedSections[section] ? 'rotate(180deg)' : 'rotate(0)', 
          transition: 'transform 0.3s ease',
          color: defaultTheme.textLight 
        }} 
      />
    </div>
  );

  // Render the settings page with simplified sections
  return (
    <div style={{ background: defaultTheme.background }} className="min-h-screen">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2" style={{ color: defaultTheme.accent }}>Project Settings</h1>
        <p className="text-xs sm:text-sm mb-4 sm:mb-6" style={{ color: defaultTheme.textLight }}>
          Configure your analytics project settings
        </p>

        {/* Toast messages */}
        <ToastContainer toasts={toasts} />

        {/* Essential Settings - Always shown */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 sm:p-5">
            <SectionHeader 
              title="General Settings" 
              icon={<FadersHorizontalIcon className="size:30" />} 
              section="essential"
            />
            {expandedSections.essential && (
              <div className="mt-3 sm:mt-4">
                <GeneralSection
                  project={project}
                  onProjectUpdate={handleProjectUpdate}
                  theme={defaultTheme}
                  showToast={showToast}
                  simplified={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Tracking Settings - Collapsed by default */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 sm:p-5">
            <SectionHeader 
              title="Privacy & Tracking" 
              icon={<KeyholeIcon size={20} className="size:34" />}
              section="tracking" 
            />
            {expandedSections.tracking && (
              <div className="mt-3 sm:mt-4">
                <TrackingSection
                  project={project}
                  onProjectUpdate={handleProjectUpdate}
                  theme={defaultTheme}
                  showToast={showToast}
                  simplified={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Data Management - Collapsed by default */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 sm:p-5">
            <SectionHeader 
              title="Data Management" 
              icon={<HardDrivesIcon size={20} className="size:30" />}
              section="dataManagement" 
            />
            {expandedSections.dataManagement && (
              <div className="mt-3 sm:mt-4">
                <DataManagementSection
                  project={project}
                  onProjectUpdate={handleProjectUpdate}
                  theme={defaultTheme}
                  showToast={showToast}
                  simplified={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone - No section header, directly shows delete button */}
        <div className="mb-4 sm:mb-6 bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 sm:p-5">
            <DangerZoneSection
              project={project}
              theme={defaultTheme}
              showToast={showToast}
            />
          </div>
        </div>
      </div>
    </div>
  );
}