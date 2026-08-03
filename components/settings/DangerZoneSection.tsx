import React, { useState, useEffect } from 'react';
import { Project } from '../../types/settings';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TrashIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';
import { deleteProject } from '@/lib/api/projects';

interface DangerZoneSectionProps {
  project: Project;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const DangerZoneSection: React.FC<DangerZoneSectionProps> = ({
  project,
  showToast
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [countdown, setCountdown] = useState(3);
  const [timerActive, setTimerActive] = useState(false);

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
      await deleteProject(project._id);
      showToast('success', 'Project deleted successfully. Redirecting...');

      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error: unknown) {
      showToast('error', error instanceof Error ? error.message : 'An error occurred');
      setIsDeleting(false);
    }
  };

  const closeModal = () => {
    setShowDeleteModal(false);
    setConfirmText('');
    setTimerActive(false);
  };

  return (
    <>
      <SettingsGroup title="Danger Zone" tone="danger">
        <SettingsRow
          label="Delete this project"
          description="Permanently delete this project and all associated visitor analytics. This action cannot be undone."
          action={
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setShowDeleteModal(true);
                setConfirmText('');
                startSafetyTimer();
              }}
            >
              <TrashIcon size={14} weight="bold" />
              <span>Delete Project</span>
            </Button>
          }
        />
      </SettingsGroup>

      <Dialog open={showDeleteModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-sm w-full font-body">
          <div className="mb-4">
            <div className="inline-flex p-3.5 bg-danger/10 rounded-full">
              <WarningCircleIcon size={32} weight="fill" className="text-danger" />
            </div>
          </div>

          <DialogHeader>
            <DialogTitle className="font-display font-semibold text-lg text-foreground">
              Delete &quot;{project.name}&quot;?
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 font-body">
            <p className="text-xs text-muted-foreground">
              All recorded page views, sessions, and path telemetry will be permanently wiped.
            </p>

            <Input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "delete" to confirm'
              disabled={isDeleting}
              autoFocus
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              variant={confirmText === 'delete' && !(timerActive && countdown > 0) ? 'destructive' : 'outline'}
              onClick={handleDeleteProject}
              disabled={isDeleting || confirmText !== 'delete' || (timerActive && countdown > 0)}
              className="flex-1"
            >
              <TrashIcon size={16} weight="bold" />
              <span className="tabular-nums">{timerActive && countdown > 0 ? `Delete (${countdown})` : "Delete Project"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
