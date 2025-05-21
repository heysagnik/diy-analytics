"use client";

import React, { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  CaretDownIcon, 
  ChatCircleIcon, 
  FunnelIcon, 
  GearIcon, 
  LifebuoyIcon, 
  UserCircleIcon,
  ArrowsDownUpIcon,
  FlaskIcon,
  HouseIcon,
  X,
  ListIcon,
  ArrowBendUpLeftIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import ErrorBoundary from "../../../components/ErrorBoundary";
import Navigation, { NavigationItem } from "../../../components/Navigation";
import { Theme, defaultTheme } from "../../../utils/theme";

// Types
interface FooterLink {
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slugs: string[] }>;
}

// Footer links configuration
const getFooterLinks = (): FooterLink[] => [
  { 
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>,
    label: "Documentation",
    href: "#" 
  },
  { icon: <LifebuoyIcon size={20} />, label: "Need Help?", href: "#" },
  { icon: <ChatCircleIcon size={20} />, label: "Give Feedback", href: "#" },
  { icon: <ArrowBendUpLeftIcon size={20} />, label: "Return to Home", href: "/" }
];

// Get navigation items based on project path
const getNavigationItems = (projectBasePath: string): NavigationItem[] => [
  { id: 'analytics', label: 'Analytics', icon: HouseIcon, href: projectBasePath },
  { id: 'users', label: 'Users', icon: UserCircleIcon, href: `${projectBasePath}/users` },
  { id: 'funnels', label: 'Funnels', icon: FunnelIcon, href: `${projectBasePath}/funnels` },
  { id: 'automations', label: 'Automations', icon: ArrowsDownUpIcon, href: `${projectBasePath}/automations` },
  { id: 'experiments', label: 'Experiments', icon: FlaskIcon, href: `${projectBasePath}/experiments` },
  { id: 'settings', label: 'Settings', icon: GearIcon, href: `${projectBasePath}/settings` },
];

// Enhanced ProjectSelector Component with dropdown menu
const ProjectSelector = ({ projectId, projectName, theme }: { projectId: string, projectName: string, theme: Theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Array<{_id: string, name: string, url: string}>>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter projects based on search query
  const filteredProjects = searchQuery 
    ? projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : projects;

  return (
    <ErrorBoundary>
      <div className="px-4 py-3 lg:mt-0 mt-2 relative" ref={dropdownRef}>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer hover:bg-opacity-90 transition-all border shadow-sm"
          style={{ 
            background: theme.cardBg, 
            color: theme.accent, 
            borderColor: isOpen ? theme.primary : theme.sidebarBorder,
            boxShadow: isOpen ? `0 0 0 2px ${theme.lightAccent}` : "0 2px 5px rgba(0,0,0,0.03)"
          }}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        >
          <div 
            className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-medium"
            style={{ background: theme.projectIconBg }}
          >
            {projectName.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium flex-1 truncate text-base">{projectName}</span>
          <CaretDownIcon 
            size={18} 
            weight="bold" 
            style={{ 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', 
              transition: 'transform 0.2s ease' 
            }} 
          />
        </div>

        {/* Dropdown menu with enhanced interactions */}
        {isOpen && (
          <div 
            className="absolute mt-2 w-[calc(100%-2rem)] rounded-lg border overflow-hidden shadow-lg z-50 transition-all duration-200 ease-in-out bg-white"
            style={{ 
              borderColor: theme.cardBorder,
              maxHeight: '400px',
              animation: 'fadeIn 0.2s ease-out forwards',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}
          >
            {/* Project search input */}
            <div className="p-3 border-b sticky top-0 bg-white z-10" style={{ borderColor: theme.cardBorder }}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="w-full py-2 pl-8 pr-3 rounded-md border text-sm transition-colors focus:ring-2 focus:outline-none"
                  style={{
                    borderColor: theme.cardBorder,
                    background: theme.cardBg,
                    color: theme.text,
                    outlineColor: theme.lightAccent
                  }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: theme.textLight }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                {searchQuery && (
                  <button
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 rounded-full hover:bg-gray-100 p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                    }}
                    aria-label="Clear search"
                  >
                    <X size={12} style={{ color: theme.textLight }} />
                  </button>
                )}
              </div>
            </div>

            {/* Project list with loading/empty states */}
            {loading ? (
                  <div className="p-6 text-center">
                  <div 
                    className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent mx-auto mb-2"
                    style={{ borderColor: theme.primary }}
                  />
                  <span 
                    className="text-sm"
                    style={{ color: theme.textLight }}
                  >
                    Loading projects...
                  </span>
                  </div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-6 text-center" style={{ color: theme.textLight }}>
                {searchQuery ? (
                  <div>
                    <p className="mb-1">No projects matching &quot;{searchQuery}&quot;</p>
                    <button 
                      className="text-sm mt-2 py-1 px-3 rounded-md transition-colors"
                      style={{ color: theme.accent, backgroundColor: theme.lightAccent }}
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <p>No projects available</p>
                )}
              </div>
            ) : (
              <>
                <div className="p-2 border-b" style={{ borderColor: theme.cardBorder }}>
                  <h3 className="text-xs font-medium px-3 py-1" style={{ color: theme.textLight }}>
                    {searchQuery ? 'SEARCH RESULTS' : 'YOUR PROJECTS'}
                    {filteredProjects.length > 0 && <span className="ml-1">({filteredProjects.length})</span>}
                  </h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredProjects.map((project) => (
                    <div
                      key={project._id}
                      className="flex items-center gap-3 px-4 py-3 hover:cursor-pointer transition-colors"
                      style={{
                        backgroundColor: project._id === projectId ? theme.lightAccent : 'transparent',
                        color: project._id === projectId ? theme.accent : theme.text,
                        borderLeft: project._id === projectId ? `3px solid ${theme.accent}` : '3px solid transparent',
                      }}
                      onClick={() => handleProjectSelect(project._id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleProjectSelect(project._id);
                        }
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-medium"
                        style={{ background: theme.projectIconBg }}
                      >
                        {project.name ? project.name.charAt(0).toUpperCase() : '#'}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <span className="block truncate font-medium">{project.name || 'Unnamed Project'}</span>
                        {project.url && (
                          <span className="block truncate text-xs" style={{ color: theme.textLight }}>
                            {project.url}
                          </span>
                        )}
                      </div>
                      {project._id === projectId && (
                        <span 
                          className="text-xs py-0.5 px-2 rounded-full" 
                          style={{ backgroundColor: theme.accent, color: 'white' }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t sticky bottom-0 bg-white" style={{ borderColor: theme.cardBorder }}>
                  <Link
                    href="/"
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm hover:opacity-90 transition-all"
                    style={{ 
                      backgroundColor: theme.primary, 
                      color: 'white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                    onClick={() => setIsOpen(false)}
                  >
                    <PlusIcon size={16} weight="bold" />
                    Create New Project
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

// Footer Component with interactive animations
const Footer = ({ 
  footerLinks, 
  onLinkClick, 
  theme 
}: { 
  footerLinks: FooterLink[], 
  onLinkClick: () => void,
  theme: Theme
}) => {
  return (
    <ErrorBoundary>
      <div 
        className="p-4 space-y-1 mt-auto border-t" 
        style={{ 
          borderColor: theme.cardBorder,
          background: theme.navBg
        }}
      >
        {footerLinks.map((link, i) => (
          <Link 
            key={i} 
            href={link.href}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all hover:bg-opacity-80"
            onClick={onLinkClick}
            style={{ color: theme.textLight }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = theme.lightAccent;
              e.currentTarget.style.color = theme.accent;
              e.currentTarget.style.transform = 'translateX(3px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.textLight;
              e.currentTarget.style.transform = 'translateX(0)';
            }}
            onFocus={(e) => {
              e.currentTarget.style.backgroundColor = theme.lightAccent;
              e.currentTarget.style.color = theme.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = theme.textLight;
            }}
          >
            <span className="text-lg">{link.icon}</span>
            <span className="truncate">{link.label}</span>
          </Link>
        ))}
      </div>
    </ErrorBoundary>
  );
};

// Header Component with enhanced mobile experience
const Header = ({ 
  onMenuToggle,
  theme
}: { 
  onMenuToggle: () => void,
  projectName: string,
  theme: Theme
}) => (
  <ErrorBoundary>
    <header
      className="py-4 px-4 md:px-6 border-b flex items-center justify-between lg:hidden"
      style={{
        borderColor: theme.cardBorder,
        background: theme.cardBg,
      }}
    >
      <div className="flex items-center">
        <button 
          className="p-2 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2"
          onClick={onMenuToggle}
          aria-label="Open menu"
          style={{
            outlineColor: theme.lightAccent
          }}
        >
          <ListIcon size={22} weight="bold" style={{ color: theme.accent }} />
        </button>
      </div>

    </header>
  </ErrorBoundary>
);

// Main Content Component with scroll restoration
const MainContent = ({ 
  children,
  enhancedProps
}: { 
  children: React.ReactNode,
  enhancedProps: Record<string, unknown> 
}) => {
  const mainRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [pathname]);

  return (
    <ErrorBoundary>
      <main 
        ref={mainRef}
        className="flex-1 py-4 md:py-6 px-4 md:px-6 overflow-y-auto h-full"
        style={{
          scrollBehavior: 'smooth'
        }}
      >
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, enhancedProps)
            : child
        )}
      </main>
    </ErrorBoundary>
  );
};

// Sidebar Component with improved mobile interaction
const Sidebar = ({ 
  isOpen, 
  onClose, 
  projectId,
  projectName, 
  navigationItems, 
  activePageId,
  setActivePageId,
  handleNavClick,
  theme
}: { 
  isOpen: boolean, 
  onClose: () => void,
  projectId: string,
  projectName: string,
  navigationItems: NavigationItem[],
  activePageId: string,
  setActivePageId: (id: string) => void,
  handleNavClick: () => void,
  theme: Theme
}) => {
  const footerLinks = getFooterLinks();

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Create a new handler that combines setting the active page and closing sidebar
  const handleNavItemClick = (itemId: string, /* href: string */) => { // Removed unused href
    setActivePageId(itemId);
    handleNavClick(); // Close sidebar on mobile
  };

  return (
    <ErrorBoundary>
      <div 
        className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static top-0 left-0 z-30 w-72 lg:w-72 flex flex-col border-r h-screen overflow-y-hidden transition-all duration-300 ease-in-out`}
        style={{ 
          background: theme.navBg, 
          borderColor: theme.sidebarBorder,
          boxShadow: isOpen ? '0 0 15px rgba(0,0,0,0.1)' : 'none'
        }}
        tabIndex={isOpen ? 0 : -1}
        onKeyDown={handleKeyDown}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Close button for mobile - positioned at top right */}
        <div className="lg:hidden px-4 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2"
            aria-label="Close sidebar"
            style={{
              outlineColor: theme.lightAccent
            }}
          >
            <X size={20} weight="bold" style={{ color: theme.accent }} />
          </button>
        </div>
      
        <ProjectSelector projectId={projectId} projectName={projectName} theme={theme} />
        
        {/* Navigation scrollable area */}
        <div className="flex-grow overflow-y-auto custom-scrollbar" style={{
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme.textLight} transparent`
        }}>
          <Navigation 
            navigationItems={navigationItems} 
            activePageId={activePageId} 
            onNavItemClick={handleNavItemClick}
            theme={theme}
          />
        </div>
        
        <Footer 
          footerLinks={footerLinks} 
          onLinkClick={handleNavClick}
          theme={theme}
        />
      </div>
    </ErrorBoundary>
  );
};

// Main Layout Component
export default function ProjectLayout({ children, params: paramsPromise }: ProjectLayoutProps) {
  const theme = defaultTheme;
  const pathname = usePathname();
  
  // Await params before accessing slugs
  const params = use(paramsPromise); 
  const { slugs } = params;
    
  // State for mobile sidebar toggle
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  // State for recording transitions
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  
  // Make sure slugs is an array
  const slugsArray = Array.isArray(slugs) ? slugs : (slugs ? [slugs] : []);
  
  // Determine initial active page from URL slugs
  const initialActivePageId = slugsArray.length > 1 && slugsArray[1] ? slugsArray[1] : 'analytics';
  
  // Create a state for activePageId that initializes from the URL
  const [activePageId, setActivePageId] = useState(initialActivePageId);
  
  // Update the active page ID when the pathname changes
  useEffect(() => {
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 1) {
      // pathParts[0] should be 'projects', pathParts[1] is projectId
      const pageId = pathParts.length > 2 ? pathParts[2] : 'analytics';
      setActivePageId(pageId);
    }
  }, [pathname]);
  
  // Close sidebar on screen size changes and handle escape key
  useEffect(() => {
    // Close sidebar on resize
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    
    // Close sidebar on escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Detect page transitions
  useEffect(() => {
    setIsPageTransitioning(true);
    const timer = setTimeout(() => setIsPageTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [pathname]);

  const projectName = slugsArray[0] || "Default Project"; 
  const projectUrl = `${projectName.toLowerCase().replace(/\s+/g, '-')}.example.com`;
  const projectBasePath = `/projects/${slugsArray[0]}`;

  const navigationItems = getNavigationItems(projectBasePath);

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSidebarToggle = () => setSidebarOpen(!isSidebarOpen);
  const handleSidebarClose = () => setSidebarOpen(false);

  const enhancedProps = {
    theme,
    projectName,
    projectUrl,
    projectId: slugsArray[0] 
  };
  
  // Improved loading state
  if (!slugsArray[0]) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: theme.background }}>
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.accent }}></div>
          <h2 className="text-xl font-medium mb-2" style={{ color: theme.accent }}>
            Loading project...
          </h2>
          <p className="text-sm" style={{ color: theme.textLight }}>
            Please wait while we prepare your dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen relative" style={{ background: theme.background }}>
        {/* Overlay for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20 backdrop-blur-sm transition-opacity"
            style={{
              animation: 'fadeIn 0.3s ease-out forwards'
            }}
            onClick={handleSidebarClose}
            aria-hidden="true"
          />
        )}
        
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={handleSidebarClose}
          projectId={slugsArray[0]}
          projectName={projectName}
          navigationItems={navigationItems}
          activePageId={activePageId}
          setActivePageId={setActivePageId}
          handleNavClick={handleNavClick}
          theme={theme}
        />
        
        <div className="flex-1 flex flex-col h-screen overflow-hidden w-full">
          <Header 
            onMenuToggle={handleSidebarToggle} 
            projectName={projectName}
            theme={theme} 
          />
          {/* Apply transition effect to content */}
          <div className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-300 ${isPageTransitioning ? 'opacity-80' : 'opacity-100'}`}>
            <MainContent enhancedProps={enhancedProps}>{children}</MainContent>
          </div>
        </div>
      </div>
      
      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.2);
          border-radius: 20px;
        }
        
        /* Focus styles */
        button:focus-visible, a:focus-visible {
          outline: 2px solid ${theme.primary};
          outline-offset: 2px;
        }
      `}</style>
    </ErrorBoundary>
  );
}