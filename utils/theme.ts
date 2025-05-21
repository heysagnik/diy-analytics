// Define theme type
export interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  navBg: string;
  activeBg: string;
  cardBg: string;
  cardBorder: string;
  sidebarBorder: string;
  textLight: string;
  projectIconBg: string;
  success: string;
  danger: string;
  lightAccent: string;
  text: string;
}

// Default theme configuration
export const defaultTheme: Theme = {
  primary: "#5A6ACF",    // Primary accent color (blue-gray)
  secondary: "#8892C8",  // Lighter version of primary
  accent: "#343A40",     // Dark gray for headings and emphasis
  background: "#F8F9FA", // Very light gray background
  navBg: "#EFF2F5",      // Light gray for sidebar
  activeBg: "#E2E7F0",   // Slightly darker gray for active items
  cardBg: "#FFFFFF",     // White cards
  cardBorder: "#DEE2E6", // Light gray border for cards
  sidebarBorder: "#DEE2E6", // Matching border for sidebar
  textLight: "#6C757D",  // Medium gray for less emphasis text
  projectIconBg: "#5A6ACF", // Primary color for project icon
  success: "#40C057",    // Green for positive changes
  danger: "#FA5252",     // Red for negative changes
  lightAccent: "#E9ECEF",
  text: "#212529" // Dark gray for main text
  
}; 