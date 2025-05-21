export interface Project {
  isPublic: any;
  domain: string;
  id: string;
  name: string;
  url: string;
}

export interface AnalyticsData {
  uniqueUsers: {
    total: number;
    change: number;
    monthly: number[];
  };
  pageViews: {
    total: number;
    change: number;
    monthly: number[];
  };
  pages: {
    path: string;
    users: number;
  }[];
  sources: {
    name: string;
    users: number;
    icon: string;
  }[];
  usersByCountry: {
    country: string;
    users: number;
  }[];
  usersByBrowser: {
    browser: string;
    users: number;
  }[];
  usersByDevice: {
    device: string;
    users: number;
  }[];
  months: string[];
  events: any[];
}

export type DateRange = "Last 7 days" | "Last 30 days" | "Last 3 months" | "Last 6 months";
export type SourceFilter = "Referrer" | "Ref" | "UTM";
export type UserFilter = "Country" | "Browser" | "Device"; 