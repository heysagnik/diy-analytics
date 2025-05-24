"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CaretDownIcon } from "@phosphor-icons/react";
import ErrorBoundary from "../layout/ErrorBoundary";
import { Theme } from "../../utils/theme";

interface ProjectSelectorProps {
  projectId: string;
  projectName: string;
  projectUrl: string;
  theme: Theme;
}

export default function ProjectSelector({ projectId, projectName, projectUrl, theme }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Array<{_id: string, name: string, url: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [showFavicon, setShowFavicon] = useState(true);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        } else {
          console.error('Failed to fetch projects');
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Navigate to selected project
  const handleProjectSelect = (projectId: string) => {
    router.push(`/projects/${projectId}`);
    setIsOpen(false);
  };

  const handleImageError = () => {
    setShowFavicon(false);
  };

  return (
    <ErrorBoundary>
      <div className="px-4 py-4 relative" ref={dropdownRef}>
        {/* Toggle Button */}
        <button
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md border text-left"
          style={{ 
            background: theme.cardBg, 
            color: theme.accent, 
            borderColor: theme.sidebarBorder,
          }}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          {showFavicon ? (
            <div className="w-6 h-6 rounded flex-shrink-0 relative">
              <Image
                src={`https://icons.duckduckgo.com/ip3/${projectUrl}.ico`}
                alt={`${projectName} favicon`}
                width={24}
                height={24}
                className="rounded"
                onError={handleImageError}
                unoptimized
              />
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
              style={{ background: theme.projectIconBg }}
            >
              {projectName ? projectName.charAt(0).toUpperCase() : '#'}
            </div>
          )}
          <span className="font-medium flex-1 truncate">{projectName}</span>
          <CaretDownIcon 
            size={16} 
            className="flex-shrink-0 opacity-70"
            style={{ 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', 
              transition: 'transform 0.15s ease' 
            }} 
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div 
            className="absolute mt-1 left-4 right-4 rounded-md border bg-white shadow-sm z-50 max-h-72 overflow-y-auto"
            style={{ borderColor: theme.cardBorder }}
          >
            {loading ? (
              <div className="p-4 text-center text-sm" style={{ color: theme.textLight }}>
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-4 text-center text-sm" style={{ color: theme.textLight }}>
                No projects available
              </div>
            ) : (
              <>
                {projects.map((project) => (
                  <button
                    key={project._id}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50"
                    style={{
                      backgroundColor: project._id === projectId ? theme.lightAccent : 'transparent',
                      color: theme.text,
                      borderBottom: `1px solid ${theme.cardBorder}`
                    }}
                    onClick={() => handleProjectSelect(project._id)}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                      style={{ background: theme.projectIconBg }}
                    >
                      {project.name ? project.name.charAt(0).toUpperCase() : '#'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <span className="block truncate">{project.name || 'Unnamed Project'}</span>
                    </div>
                    {project._id === projectId && (
                      <span 
                        className="text-xs py-0.5 px-2 rounded flex-shrink-0" 
                        style={{ backgroundColor: theme.accent, color: 'white' }}
                      >
                        Active
                      </span>
                    )}
                  </button>
                ))}
                
                <Link
                  href="/"
                  className="block w-full px-3 py-2.5 text-sm text-center hover:bg-gray-50"
                  style={{ 
                    borderTop: `1px solid ${theme.cardBorder}`,
                    color: theme.accent,
                    backgroundColor: theme.lightAccent
                  }}
                  onClick={() => setIsOpen(false)}
                >
                  Create New Project
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}