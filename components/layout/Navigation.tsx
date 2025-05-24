"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Theme } from '../../utils/theme';
import ErrorBoundary from './ErrorBoundary';

export interface NavigationItem {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
}

interface NavigationProps {
  navigationItems: NavigationItem[];
  activePageId: string;
  onNavItemClick: (itemId: string, href?: string) => void;
  theme: Theme;
}

/**
 * Navigation component that renders a list of navigation items with animated icons
 */
export default function Navigation({ 
  navigationItems, 
  activePageId, 
  onNavItemClick,
  theme
}: NavigationProps) {
  // Track which item is being hovered
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  // Track which item was recently clicked for animation
  const [clickedItemId, setClickedItemId] = useState<string | null>(null);

  // Handle icon click with animation
  const handleNavClick = (itemId: string, href: string) => {
    setClickedItemId(itemId);
    // Reset the clicked state after animation completes
    setTimeout(() => setClickedItemId(null), 400);
    onNavItemClick(itemId, href);
  };

  return (
    <ErrorBoundary>
      <nav className="flex-1 px-3.5 space-y-1 overflow-y-auto mt-4">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = item.id === activePageId;
          const isHovered = hoveredItemId === item.id;
          const isClicked = clickedItemId === item.id;
          
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-4 px-4 py-3 rounded-lg text-base transition-all"
              onClick={() => handleNavClick(item.id, item.href)}
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              style={{
                background: isActive ? theme.activeBg : isHovered ? `${theme.lightAccent}80` : 'transparent',
                color: isActive || isHovered ? theme.accent : theme.textLight,
                fontWeight: isActive ? 500 : 400,
                boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s ease"
              }}
            >
              <div 
                className="icon-container" 
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <IconComponent 
                  size={24} 
                  weight={isActive ? "bold" : "regular"} 
                  className={`
                    transition-all duration-300 
                    ${isClicked ? 'animate-icon-click' : ''} 
                    ${isActive ? 'animate-icon-active' : ''} 
                    ${isHovered && !isActive ? 'animate-icon-hover' : ''}
                  `}
                />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Add animation keyframes */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
          60% { transform: translateY(-2px); }
        }
        
        @keyframes rotate {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg) scale(1.1); }
          75% { transform: rotate(10deg) scale(1.1); }
          100% { transform: rotate(0deg); }
        }
        
        @keyframes pop {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .animate-icon-hover {
          animation: pulse 1s infinite;
        }
        
        .animate-icon-click {
          animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .animate-icon-active {
          transform: scale(1.1);
        }
        
        /* Add different animations for different icons */
        [data-icon="HouseIcon"].animate-icon-hover {
          animation: pulse 1s infinite;
        }
        
        [data-icon="UserCircleIcon"].animate-icon-hover {
          animation: bounce 1s infinite;
        }
        
        [data-icon="FunnelIcon"].animate-icon-hover {
          animation: rotate 1s infinite;
        }
        
        [data-icon="ArrowsDownUpIcon"].animate-icon-hover {
          animation: bounce 1s infinite alternate;
        }
        
        [data-icon="FlaskIcon"].animate-icon-hover {
          animation: rotate 1.5s infinite ease-in-out;
        }
        
        [data-icon="GearIcon"].animate-icon-hover {
          animation: spin 3s infinite linear;
        }
      `}</style>
    </ErrorBoundary>
  );
}