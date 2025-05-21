import React, { useState } from 'react';
import { Project, Theme } from '../../types/settings';
import { Button } from '../ui/Button';
import { FileCsvIcon, CaretRightIcon } from '@phosphor-icons/react';

interface DataManagementSectionProps {
  project: Project;
  onProjectUpdate: (updatedProject: Partial<Project>) => void;
  theme: Theme;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  simplified?: boolean;
}

export const DataManagementSection: React.FC<DataManagementSectionProps> = ({ 
  project, 
  onProjectUpdate, 
  theme, 
  showToast,
  simplified = false
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportTimeframe, setExportTimeframe] = useState('last30days');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [retentionDays, setRetentionDays] = useState(project?.dataRetentionDays?.toString() || '90');
  const [isUpdatingRetention, setIsUpdatingRetention] = useState(false);
  
  // Export data based on selected timeframe
  const handleExportData = async () => {
    if (!project?._id) return;
    
    setIsExporting(true);
    
    try {
      // Calculate date parameters based on selection
      let startDate = '';
      let endDate = '';
      
      const today = new Date();
      
      switch(exportTimeframe) {
        case 'last7days':
          startDate = getDateNDaysAgo(7);
          break;
        case 'last30days':
          startDate = getDateNDaysAgo(30);
          break;
        case 'last90days':
          startDate = getDateNDaysAgo(90);
          break;
        case 'thisMonth': {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          startDate = firstDay.toISOString().split('T')[0];
          break;
        }
        case 'lastMonth': {
          const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          startDate = firstDayLastMonth.toISOString().split('T')[0];
          endDate = lastDayLastMonth.toISOString().split('T')[0];
          break;
        }
      }
      
      // Create API URL with parameters
      let url = `/api/projects/${project._id}/export`;
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export data');
      }
      
      // Download the file
      const blob = await response.blob();
      const url2 = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url2;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `analytics-${project.name}-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url2);
      document.body.removeChild(a);
      
      showToast('success', 'Your data has been exported successfully!');
    } catch (error: unknown) {
      showToast('error', error instanceof Error ? error.message : 'Could not export data');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Helper to get date string for N days ago
  const getDateNDaysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };
  
  // Update data retention setting
  const handleUpdateRetention = async () => {
    if (!project?._id) return;
    
    const days = parseInt(retentionDays);
    if (isNaN(days) || days < 0) {
      showToast('error', 'Please select a valid retention period');
      return;
    }
    
    setIsUpdatingRetention(true);
    
    try {
      const response = await fetch(`/api/projects/${project._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataRetentionDays: days }),
      });
      
      if (!response.ok) {
        throw new Error('Could not update data retention setting');
      }
      
      const updatedProject = await response.json();
      onProjectUpdate({ dataRetentionDays: updatedProject.dataRetentionDays });
      
      showToast('success', `Data retention period updated`);
    } catch (error: unknown) {
      showToast('error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsUpdatingRetention(false);
    }
  };

  // Super simplified version
  return (
    <div className={`space-y-${simplified ? '3' : '4'}`}>
      {/* Export Section - Simplified UI */}
      <div className="bg-white p-3 sm:p-5 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <FileCsvIcon size={20} style={{ color: theme.accent }} weight="fill" />
          <h3 className="font-medium">Export Analytics</h3>
        </div>
        
        {/* Simple Time Period Selection */}
        <div className="mb-4">
          <label className="block text-sm mb-1 text-gray-500">
            Select time period
          </label>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2">
            <TimeButton 
              active={exportTimeframe === 'last7days'} 
              onClick={() => setExportTimeframe('last7days')}
              theme={theme}
            >
              Last 7 days
            </TimeButton>
            <TimeButton 
              active={exportTimeframe === 'last30days'} 
              onClick={() => setExportTimeframe('last30days')}
              theme={theme}
            >
              Last 30 days
            </TimeButton>
            <TimeButton 
              active={exportTimeframe === 'last90days'} 
              onClick={() => setExportTimeframe('last90days')}
              theme={theme}
            >
              Last 90 days
            </TimeButton>
            <TimeButton 
              active={exportTimeframe === 'thisMonth'} 
              onClick={() => setExportTimeframe('thisMonth')}
              theme={theme}
            >
              This month
            </TimeButton>
            <TimeButton 
              active={exportTimeframe === 'lastMonth'} 
              onClick={() => setExportTimeframe('lastMonth')}
              theme={theme}
            >
              Last month
            </TimeButton>
            <TimeButton 
              active={exportTimeframe === 'all'} 
              onClick={() => setExportTimeframe('all')}
              theme={theme}
            >
              All time
            </TimeButton>
          </div>
        </div>

        {/* Download Button */}
        <Button
          onClick={handleExportData}
          variant="primary"
          isLoading={isExporting}
          disabled={isExporting}
          theme={theme}
          icon={<FileCsvIcon size={16} />}
          fullWidth
        >
          Download CSV
        </Button>
      </div>

      {/* Advanced Toggle */}
      <button
        className="flex items-center gap-2 text-sm font-medium mt-2"
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
      
      {/* Data Retention - Hidden by Default */}
      {showAdvanced && (
        <div className="bg-white p-3 sm:p-5 rounded-lg shadow-sm border border-gray-100">
          <h3 className="text-base font-medium mb-3">Data Retention</h3>
          
          <div className="mb-4">
            <label className="block text-sm mb-1 text-gray-500">
              Keep analytics data for
            </label>
            <select 
              className="w-full p-2 border rounded-md"
              style={{ 
                borderColor: theme.cardBorder,
              }}
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value)}
              disabled={isUpdatingRetention}
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">6 months</option>
              <option value="365">1 year</option>
              <option value="0">Forever</option>
            </select>
          </div>
          
          <Button
            onClick={handleUpdateRetention}
            variant="secondary"
            isLoading={isUpdatingRetention}
            disabled={isUpdatingRetention}
            theme={theme}
            size="sm"
          >
            Save Setting
          </Button>
          
          <p className="text-xs text-gray-500 mt-2">
            Data older than the selected period will be automatically removed
          </p>
        </div>
      )}
    </div>
  );
};

// Helper component for time period selection
interface TimeButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  theme: Theme;
}

const TimeButton: React.FC<TimeButtonProps> = ({ active, onClick, children, theme }) => (
  <button
    onClick={onClick}
    className={`text-sm p-2 rounded-md text-center transition-colors ${
      active 
        ? 'bg-blue-50 border-blue-200 font-medium' 
        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
    }`}
    style={{ 
      borderWidth: '1px',
      color: active ? theme.accent : theme.textLight
    }}
    type="button"
  >
    {children}
  </button>
);