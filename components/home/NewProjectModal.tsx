import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FieldGroup, Field, FieldLabel, FieldError } from '@/components/ui/field';
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
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="project-name">Project Name</FieldLabel>
              <Input
                id="project-name"
                required
                placeholder="My Awesome Website"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              />
            </Field>

            <Field data-invalid={!!urlError}>
              <FieldLabel htmlFor="project-url">Website URL</FieldLabel>
              <Input
                id="project-url"
                required
                aria-invalid={!!urlError}
                placeholder="example.com"
                value={newProject.url}
                onChange={(e) => {
                  setNewProject({ ...newProject, url: e.target.value });
                  if (urlError) setUrlError("");
                }}
              />
              <FieldError>{urlError}</FieldError>
            </Field>
          </FieldGroup>

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
