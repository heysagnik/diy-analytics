import {
  HouseIcon,
  UserCircleIcon,
  FunnelIcon,
  ArrowsDownUpIcon,
  FlaskIcon,
  GearIcon,
  LifebuoyIcon,
  ChatCircleIcon,
  ArrowBendUpLeftIcon,
  IconProps // Import IconProps
} from "@phosphor-icons/react";
import { NavigationItem } from "../components/layout/Navigation";
import { FooterLink } from "../components/project/Footer";
import React from "react";

// Wrapper components with data attributes for animations
const AnimatedHouseIcon = (props: IconProps) => <HouseIcon {...props} data-icon="HouseIcon" />;
const AnimatedUserIcon = (props: IconProps) => <UserCircleIcon {...props} data-icon="UserCircleIcon" />;
const AnimatedFunnelIcon = (props: IconProps) => <FunnelIcon {...props} data-icon="FunnelIcon" />;
const AnimatedArrowsIcon = (props: IconProps) => <ArrowsDownUpIcon {...props} data-icon="ArrowsDownUpIcon" />;
const AnimatedFlaskIcon = (props: IconProps) => <FlaskIcon {...props} data-icon="FlaskIcon" />;
const AnimatedGearIcon = (props: IconProps) => <GearIcon {...props} data-icon="GearIcon" />;

// Get navigation items based on project path
export const getNavigationItems = (projectBasePath: string): NavigationItem[] => [
  { id: 'analytics', label: 'Overview', icon: AnimatedHouseIcon, href: projectBasePath },
  { id: 'users', label: 'Users', icon: AnimatedUserIcon, href: `${projectBasePath}/users` },
  { id: 'funnels', label: 'Funnels', icon: AnimatedFunnelIcon, href: `${projectBasePath}/funnels` },
  { id: 'automations', label: 'Automations', icon: AnimatedArrowsIcon, href: `${projectBasePath}/automations` },
  { id: 'experiments', label: 'Experiments', icon: AnimatedFlaskIcon, href: `${projectBasePath}/experiments` },
  { id: 'settings', label: 'Settings', icon: AnimatedGearIcon, href: `${projectBasePath}/settings` },
];

// Footer links configuration
export const getFooterLinks = (): FooterLink[] => [
  { 
    icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
            </svg>),
    label: "Documentation",
    href: "#" 
  },
  { icon: <LifebuoyIcon size={20} />, label: "Need Help?", href: "#" },
  { icon: <ChatCircleIcon size={20} />, label: "Give Feedback", href: "#" },
  { icon: <ArrowBendUpLeftIcon size={20} />, label: "Return to Home", href: "/" }
];