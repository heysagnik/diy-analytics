import { IconWeight } from "@phosphor-icons/react";

export interface Project {
  _id: string;
  name: string;
  domain?: string;
  trackingCode: string;
  projectToken: string;
  apiKey?: string;
  publicMode: boolean;
  excludedIPs?: string[];
  excludedPaths?: string[];
  excludedUserAgents?: string[];
  dataRetentionDays?: number;
}

export interface TabProps {
  label: string;
  icon: React.ComponentType<{ size: number, weight?: IconWeight }>;
  isActive: boolean;
  onClick: () => void;
  theme: Theme;
}

export interface ToastProps {
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface Theme {
  primary: string;
  accent: string;
  background: string;
  navBg: string;
  activeBg: string;
  cardBg: string;
  cardBorder: string;
  textLight: string;
  lightAccent: string;
  projectIconBg: string;
  errorText: string;
  errorBg: string;
  successText: string;
  successBg: string;
  warningText: string;
  warningBg: string;
  infoText: string;
  infoBg: string;
}

export const defaultTheme: Theme = {
  primary: "#5A6ACF",
  accent: "#343A40",
  background: "#F8F9FA",
  navBg: "#EFF2F5",
  activeBg: "#E2E7F0",
  cardBg: "#FFFFFF",
  cardBorder: "#DEE2E6",
  textLight: "#6C757D",
  lightAccent: "#E9ECEF",
  projectIconBg: "#5A6ACF",
  errorText: "#EF4444",
  errorBg: "#FEF2F2",
  successText: "#10B981",
  successBg: "#ECFDF5",
  warningText: "#F59E0B",
  warningBg: "#FFFBEB",
  infoText: "#3B82F6",
  infoBg: "#EFF6FF",
};