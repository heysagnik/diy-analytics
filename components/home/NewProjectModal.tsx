import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { normalizeProjectUrl } from '@/utils/url';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: { name: string; url: string }) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onCreateProject }) => {
  const [newProject, setNewProject] = useState({ name: '', url: '' });
  const [urlError, setUrlError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizeProjectUrl(newProject.url)) {
      setUrlError("Please enter a valid HTTP(S) web address (e.g. example.com)");
      return;
    }
    setUrlError("");
    onCreateProject(newProject);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="font-display font-semibold text-lg text-foreground">Add New Website</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                required
                placeholder="My Awesome Website"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-url">Website URL</Label>
              <Input
                id="project-url"
                required
                aria-invalid={!!urlError}
                aria-describedby={urlError ? "project-url-error" : undefined}
                placeholder="example.com"
                value={newProject.url}
                onChange={(e) => {
                  setNewProject({ ...newProject, url: e.target.value });
                  if (urlError) setUrlError("");
                }}
              />
              {urlError && <p id="project-url-error" className="text-xs text-destructive">{urlError}</p>}
            </div>
          </div>

          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
