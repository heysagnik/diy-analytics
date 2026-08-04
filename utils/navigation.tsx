import {
  HouseIcon,
  UserCircleIcon,
  GearIcon,
  FunnelIcon,
  ArrowsClockwiseIcon,
  ArrowBendUpLeftIcon,
  FileTextIcon,
  ChatCenteredIcon,
  IconProps,
} from '@phosphor-icons/react';
import type { NavigationItem } from '../components/layout/Navigation';
import type { FooterLink } from '../components/project/Footer';
import React from 'react';

// Wrapper components with data attributes for sidebar icon hover animations.
const AnimatedHouseIcon = (props: IconProps) => <HouseIcon {...props} data-icon="HouseIcon" />;
const AnimatedUserIcon = (props: IconProps) => <UserCircleIcon {...props} data-icon="UserCircleIcon" />;
const AnimatedGearIcon = (props: IconProps) => <GearIcon {...props} data-icon="GearIcon" />;
const AnimatedFunnelIcon = (props: IconProps) => <FunnelIcon {...props} data-icon="FunnelIcon" />;
const AnimatedRetentionIcon = (props: IconProps) => <ArrowsClockwiseIcon {...props} data-icon="ArrowsClockwiseIcon" />;

export const getNavigationItems = (projectBasePath: string): NavigationItem[] => [
  { id: 'analytics', label: 'Overview', icon: AnimatedHouseIcon, href: projectBasePath },
  { id: 'funnels', label: 'Funnels', icon: AnimatedFunnelIcon, href: `${projectBasePath}/funnels` },
  { id: 'retention', label: 'Retention', icon: AnimatedRetentionIcon, href: `${projectBasePath}/retention` },
  { id: 'users', label: 'Visitors', icon: AnimatedUserIcon, href: `${projectBasePath}/users` },
  { id: 'settings', label: 'Settings', icon: AnimatedGearIcon, href: `${projectBasePath}/settings` },
];

export const getFooterLinks = (workspaceSlug: string): FooterLink[] => [
  {
    icon: <FileTextIcon size={18} />,
    label: 'Documentation',
    href: 'https://github.com/heysagnik/diy-analytics#readme',
  },
  {
    icon: <ChatCenteredIcon size={18} />,
    label: 'Give Feedback',
    href: 'https://github.com/heysagnik/diy-analytics/issues',
  },
  { icon: <ArrowBendUpLeftIcon size={18} />, label: 'Return to Home', href: `/${workspaceSlug}` },
];
