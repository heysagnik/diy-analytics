import React, { useState } from 'react';
import { Theme } from '@/utils/theme';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: { name: string; url: string }) => void;
  theme: Theme;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onCreateProject, theme }) => {
  const [newProject, setNewProject] = useState({ name: '', url: '' });
  const [urlError, setUrlError] = useState<string>("");

  if (!isOpen) return null;

  const validateUrl = (url: string) => {
    // Accepts only domain format like example.com or sub.example.com
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(url.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrl(newProject.url)) {
      setUrlError("Please enter a valid web address (e.g. example.com)");
      return;
    }
    setUrlError("");
    onCreateProject(newProject);
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-200 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(0,0,0,0.08)" }}
      onClick={onClose}
    >
      <div 
        className="rounded-xl p-7 max-w-md w-full mx-auto shadow-xl transform transition-all duration-300 scale-100" 
        style={{ backgroundColor: theme.cardBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold" style={{ color: theme.accent }}>Add New Website</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 transition-colors"
            style={{ "--tw-ring-color": theme.primary } as React.CSSProperties}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.accent }}>
              Project Name
            </label>
            <input 
              type="text"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors"
              style={{ 
                borderColor: theme.cardBorder,
                backgroundColor: theme.background,
                "--tw-ring-color": theme.primary
              } as React.CSSProperties}
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              required
              placeholder="My Awesome Website"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.accent }}>
              Website URL
            </label>
            <input 
              type="text"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-colors ${urlError ? 'border-red-500' : ''}`}
              style={{ 
                borderColor: urlError ? '#ef4444' : theme.cardBorder,
                backgroundColor: theme.background,
                "--tw-ring-color": theme.primary
              } as React.CSSProperties}
              value={newProject.url}
              onChange={(e) => {
                setNewProject({...newProject, url: e.target.value});
                if (urlError) setUrlError("");
              }}
              placeholder="example.com"
              required
              pattern="^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$"
              title="Please enter a valid web address (e.g. example.com)"
            />
            {urlError && (
              <p className="text-xs text-red-500 mt-2">{urlError}</p>
            )}
          </div>
          <div className="flex justify-end gap-4 pt-2">
            <button
              type="button"
              className="px-5 py-2.5 text-sm font-medium rounded-lg transition-colors hover:bg-opacity-80"
              style={{ 
                color: theme.accent,
                backgroundColor: theme.background,
                border: `1px solid ${theme.cardBorder}`
              }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium rounded-lg text-white transition-colors hover:bg-opacity-90"
              style={{ backgroundColor: theme.primary }}
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};