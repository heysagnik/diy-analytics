import React, { useState, useEffect } from 'react';
import { Project, Theme } from '../../types/settings';
import { Button } from '../ui/Button';
import { 
  TrashIcon, 
  WarningCircleIcon} from '@phosphor-icons/react';

interface DangerZoneSectionProps {
  project: Project;
  theme: Theme;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  simplified?: boolean;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({ 
  project, 
  theme, 
  showToast
}) => {
  // State management
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  // Safety countdown timer
  const [countdown, setCountdown] = useState(3);
  const [timerActive, setTimerActive] = useState(false);
  
  // Handle countdown timer
  useEffect(() => {
    if (timerActive && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setTimerActive(false);
    }
  }, [countdown, timerActive]);
  
  const startSafetyTimer = () => {
    setCountdown(3);
    setTimerActive(true);
  };
  
  const handleDeleteProject = async () => {
    if (!project?._id) return;
    
    if (confirmText !== 'delete') {
      showToast('error', 'Please type "delete" to confirm');
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/projects/${project._id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      showToast('success', 'Project deleted successfully. Redirecting...');
      
      // Redirect after short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error: unknown) {
      showToast('error', error instanceof Error ? error.message : 'An error occurred');
      setIsDeleting(false);
    }
  };
  
  // Handle modal close
  const closeModal = () => {
    setShowDeleteModal(false);
    setConfirmText('');
    setTimerActive(false);
  };

  // Super simplified version - just a delete button
  return (
    <div className="py-4 px-2 sm:px-4" style={{ borderColor: theme.cardBorder }}>
      {/* Responsive header section - stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-700">Delete this project</h3>
          <p className="text-sm text-gray-500">This action cannot be undone</p>
        </div>
        
        <Button
          onClick={() => {
            setShowDeleteModal(true);
            setConfirmText('');
            startSafetyTimer();
          }}
          variant="danger"
          theme={theme}
          icon={<TrashIcon size={16} weight="bold" />}
        >
          Delete Project
        </Button>
      </div>
      
      {/* Improved Responsive Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-5" onClick={closeModal}>
          <div 
            className="bg-white rounded-lg max-w-sm w-full p-4 sm:p-6 shadow-xl animate-fade-in mx-3 sm:mx-0" 
            onClick={e => e.stopPropagation()}
          >
            {/* Warning Icon - Properly sized for mobile */}
            <div className="flex justify-center mb-4">
              <div className="p-2 sm:p-3 bg-red-50 rounded-full">
                <WarningCircleIcon size={28} className="sm:size-32" weight="fill" style={{ color: '#ef4444' }} />
              </div>
            </div>
            
            {/* Title and Message - Better spacing */}
            <h3 className="text-base sm:text-lg font-semibold text-center mb-2">
              Delete {project.name}?
            </h3>
            
            <p className="text-center text-xs sm:text-sm mb-4" style={{ color: theme.textLight }}>
              All data will be permanently removed.
            </p>
            
            {/* Improved confirmation input */}
            <div className="mb-5">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full py-2 px-3 border rounded-md text-center text-sm"
                style={{ borderColor: theme.cardBorder }}
                placeholder='Type "delete" to confirm'
                disabled={isDeleting}
                autoFocus
              />
            </div>
            
            {/* Action buttons - Already responsive */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={closeModal}
                variant="secondary"
                theme={theme}
                disabled={isDeleting}
                fullWidth
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleDeleteProject}
                variant="danger"
                theme={theme}
                icon={<TrashIcon size={16} />}
                isLoading={isDeleting}
                disabled={isDeleting || confirmText !== 'delete' || (timerActive && countdown > 0)}
                fullWidth
              >
                {timerActive && countdown > 0 ? `Delete (${countdown})` : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};