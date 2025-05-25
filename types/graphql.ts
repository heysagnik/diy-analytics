export interface Project {
  _id: string;
  name: string;
  url: string;
  domain?: string;
  publicMode?: boolean;
  createdAt?: string;
}

export interface PageView {
  _id: string;
  projectId: string;
  url: string;
  path: string;
  referrer?: string;
  browser?: string;
  os?: string;
  device?: string;
  country?: string;
  sessionId: string;
  timestamp?: string;
}

export interface Event {
  _id: string;
  projectId: string;
  name: string;
  url: string;
  path: string;
  data?: Record<string, unknown>; // Refined from any
  sessionId: string;
  timestamp?: string;
}

export interface PageData {
  path: string;
  users: number;
  views: number;
}

export interface SourceData {
  name: string;
  users: number;
}

export interface UsersByCountry {
  country: string;
  users: number;
}

export interface UsersByBrowser {
  browser: string;
  users: number;
}

export interface UsersByDevice {
  device: string;
  users: number;
}

export interface UniqueUsers {
  total: number;
  change: number;
  monthly: number[];
}

export interface PageViews {
  total: number;
  change: number;
  monthly: number[];
}

export interface TopEvent {
  name: string;
  count: number;
}

export interface EventAnalytics {
  topEvents: TopEvent[];
  recentEvents: Event[];
}

export interface Analytics {
  uniqueUsers: UniqueUsers;
  pageViews: PageViews;
  pages: PageData[];
  sources: SourceData[];
  usersByCountry: UsersByCountry[];
  usersByBrowser: UsersByBrowser[];
  usersByDevice: UsersByDevice[];
  months: string[];
  averageSessionDuration: number;
  bounceRate: number;
  eventAnalytics: EventAnalytics;
}

export interface User {
  userId: string;
  country?: string;
  lastSeen: string;
  firstSeen?: string;
  browser?: string;
  device?: string;
  os?: string;
  pathCount: number;
  activityCount: number;
}

export interface UserPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserFilters {
  countries: string[];
}

export interface UserResponse {
  users: User[];
  pagination: UserPagination;
  filters: UserFilters;
}