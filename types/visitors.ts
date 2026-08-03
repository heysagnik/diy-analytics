export interface Visitor {
  userId: string;
  country: string;
  lastSeen: string;
  firstSeen: string;
  browser: string;
  device: string;
  os: string;
  pathCount: number;
  sessionCount: number;
  activityCount: number;
}

export interface VisitorPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VisitorListResponse {
  users: Visitor[];
  pagination: VisitorPagination;
  filters: {
    countries: string[];
  };
}

export interface VisitorFiltersState {
  country: string;
  lastSeen: string;
  search: string;
}

export interface VisitorSession {
  sessionId: string;
  firstSeen: string;
  lastSeen: string;
  pageCount: number;
  browser?: string;
  os?: string;
  device?: string;
  location: string | null;
  paths: string[];
}

export interface VisitorDetail {
  userId: string;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  totalPageviews: number;
  location: { country: string | null; region: string | null; city: string | null };
  devices: { name: string; count: number }[];
  browsers: { name: string; count: number }[];
  operatingSystems: { name: string; count: number }[];
  sessions: VisitorSession[];
}

export type VisitorListViewState = 'loading' | 'error' | 'empty' | 'ready';
