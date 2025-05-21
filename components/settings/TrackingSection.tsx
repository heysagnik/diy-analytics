import React, { useState, useEffect } from 'react';
import { Project, Theme } from '../../types/settings';
import { Button } from '../ui/Button';
import { CaretRightIcon, CodeIcon } from '@phosphor-icons/react';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { InputField } from '../ui/InputField';

interface TrackingSectionProps {
  project: Project;
  onProjectUpdate: (updatedProject: Partial<Project>) => void;
  theme: Theme;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  simplified?: boolean;
}

export const TrackingSection: React.FC<TrackingSectionProps> = ({ 
  project, 
  onProjectUpdate, 
  theme, 
  showToast,
}) => {
  const [excludedPaths, setExcludedPaths] = useState(project?.excludedPaths?.join(', ') || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [excludeMyIP, setExcludeMyIP] = useState(false);
  const [myIP, setMyIP] = useState('');
  
  useEffect(() => {
    setExcludedPaths(project?.excludedPaths?.join(', ') || '');
    
    // Check if user's IP is in excluded IPs
    fetch('https://api.ipify.org?format=json')
      .then(response => response.json())
      .then(data => {
        setMyIP(data.ip);
        setExcludeMyIP(project?.excludedIPs?.includes(data.ip) || false);
      })
      .catch(err => console.error("Could not fetch IP", err));
  }, [project]);

  const handleExcludeMyIP = async (checked: boolean) => {
    if (!project?._id || !myIP) return;
    
    setExcludeMyIP(checked);
    setIsUpdating(true);
    
    try {
      // Get current IPs
      const currentIPs = project.excludedIPs || [];
      
      // Add or remove the user's IP
      let newIPs = [...currentIPs];
      if (checked) {
        if (!newIPs.includes(myIP)) {
          newIPs.push(myIP);
        }
      } else {
        newIPs = newIPs.filter(ip => ip !== myIP);
      }
      
      const response = await fetch(`/api/projects/${project._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedIPs: newIPs }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update tracking settings');
      }
      
      const updatedProject = await response.json();
      onProjectUpdate({ excludedIPs: updatedProject.excludedIPs });
      
      showToast('success', `Your visits will ${checked ? 'no longer' : 'now'} be tracked`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An error occurred';
      showToast('error', errorMessage);
      setExcludeMyIP(!checked); // Revert on error
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateExclusions = async () => {
    if (!project?._id) return;
    
    // Parse comma-separated paths into array
    const parsedPaths = excludedPaths
      .split(',')
      .map(path => path.trim())
      .filter(path => path);
    
    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/projects/${project._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          excludedPaths: parsedPaths
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update tracking exclusions');
      }
      
      const updatedProject = await response.json();
      onProjectUpdate({ 
        excludedPaths: updatedProject.excludedPaths
      });
      
      showToast('success', 'Exclusion settings saved');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An error occurred';
      showToast('error', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Exclude My Visits - Primary Setting */}
      <div className="p-3 sm:p-5 bg-white rounded-lg border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-medium">Privacy Settings</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-3 rounded-md gap-2">
          <div>
            <p className="font-medium text-sm">Don&apos;t track my own visits</p>
            <p className="text-xs text-gray-500">
              Your IP: {myIP || "Loading..."}
            </p>
          </div>
          <ToggleSwitch
            enabled={excludeMyIP}
            onChange={handleExcludeMyIP}
            theme={theme}
            label=''
            disabled={isUpdating || !myIP}
          />
        </div>
      </div>
      
      {/* Advanced settings toggle */}
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
        Advanced exclusion rules
      </button>
      
      {/* Advanced settings (hidden by default) */}
      {showAdvanced && (
        <div className="p-3 sm:p-5 bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            
            <h3 className="font-medium">URL Path Exclusions</h3>
          </div>
          
          <div className="mb-5">
            <InputField
              label="Excluded Paths"
              value={excludedPaths}
              onChange={(e) => setExcludedPaths(e.target.value)}
              placeholder="/admin, /login, /internal"
              theme={theme}
              hint="Comma-separated list of URL paths that won't be tracked"
              disabled={isUpdating}
            />
          </div>
          
          <Button
            onClick={handleUpdateExclusions}
            variant="secondary"
            isLoading={isUpdating}
            disabled={isUpdating}
            theme={theme}
            size="sm"
          >
            Save Exclusions
          </Button>
          
          {/* Tip box */}
          <div className="mt-5 bg-blue-50 p-2 sm:p-3 rounded-md flex items-start gap-2 text-xs">
            <CodeIcon size={16} className="mt-0.5" style={{ color: theme.accent }} />
            <div className="text-gray-600">
              <p className="font-medium mb-0.5">Tip: You can use patterns with wildcards</p>
              <p>Example: <code>/admin/*</code> will exclude all pages in the admin section</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};