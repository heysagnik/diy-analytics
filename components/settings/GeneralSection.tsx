import React, { useState, useEffect } from 'react';
import { Project, Theme } from '../../types/settings';
import { InputField } from '../ui/InputField';
import { Button } from '../ui/Button';
import { CopyableField } from '../ui/CopyableField';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { CaretRightIcon, LinkIcon, FloppyDiskIcon } from '@phosphor-icons/react';

interface GeneralSectionProps {
  project: Project;
  onProjectUpdate: (updatedProject: Partial<Project>) => void;
  theme: Theme;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  simplified?: boolean;
}

export const GeneralSection: React.FC<GeneralSectionProps> = ({ 
  project, 
  onProjectUpdate, 
  theme, 
  showToast,
  simplified = false
}) => {
  const [projectName, setProjectName] = useState(project?.name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [publicMode, setPublicMode] = useState(project?.publicMode || false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      const response = await fetch(`/api/projects/${project._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project details.');
      }
      
      const updatedProject = await response.json();
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
    setPublicMode(enabled); // Optimistic update
    
    try {
      const response = await fetch(`/api/projects/${project._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicMode: enabled }),
      });
      
      if (!response.ok) throw new Error('Failed to update public mode.');
      
      const updatedProject = await response.json();
      onProjectUpdate({ publicMode: updatedProject.publicMode });
      showToast('success', `Public dashboard is now ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to update public mode.';
      showToast('error', errorMessage);
      setPublicMode(!enabled); // Revert on error
    }
  };

  const publicDashboardUrl = project?.publicMode ? 
    `/public/${project._id}` : 
    '';

  // Render different layouts based on simplified prop
  return (
    <div className={`space-y-${simplified ? '4' : '5'}`}>
      {/* Project Name */}
      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm">
        <div className="mb-4">
          <InputField
            label="Project Name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            theme={theme}
            disabled={isUpdating}
            placeholder="My Website Analytics"
          />
        </div>
        
        <Button 
          onClick={handleUpdateProject} 
          variant="primary" 
          disabled={isUpdating || (projectName === project?.name)}
          isLoading={isUpdating} 
          theme={theme}
          icon={<FloppyDiskIcon size={16} />}
          size="sm"
        >
          Save Changes
        </Button>
      </div>
      
      {/* Public Dashboard Toggle */}
      <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-medium mb-1">Public Dashboard</h3>
            <p className="text-sm text-gray-600">Make analytics visible without login</p>
          </div>
          
          <ToggleSwitch
            label="" 
            enabled={publicMode}
            onChange={handlePublicModeChange}
            theme={theme}
          />
        </div>
        
        {project?.publicMode && publicDashboardUrl && (
          <div className="mt-3 bg-white p-2 sm:p-3 rounded border border-blue-100">
            <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
              <LinkIcon size={14} />
              <span>Share your analytics</span>
            </div>
            <CopyableField
              label="" // Added empty label to satisfy required prop
              value={window.location.origin + publicDashboardUrl}
              theme={theme}
            />
          </div>
        )}
      </div>
      
      {/* Show advanced section only when not in simplified mode unless expanded */}
      {(!simplified || showAdvanced) && (
        <button
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: theme.accent }}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <CaretRightIcon 
            size={16} 
            style={{ 
              transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0)', 
              transition: 'transform 0.2s ease' 
            }} 
          />
          Advanced settings
        </button>
      )}
      
      {/* Project ID (simplified token) */}
      {showAdvanced && (
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg shadow-sm">
          <p className="text-sm mb-2 font-medium">Project ID</p>
          <CopyableField
            value={project?._id || ''}
            theme={theme}
            label=''
            hint="Use this ID in your tracking script"
          />
        </div>
      )}
    </div>
  );
};