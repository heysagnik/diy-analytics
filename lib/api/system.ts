export interface StorageStatsResponse {
  connected: boolean;
  latencyMs: number;
  dataSizeBytes: number;
  indexSizeBytes: number;
  usedBytes: number;
  capBytes: number;
  usedPct: number;
  pageviewCount: number;
  eventCount: number;
  estDaysUntilFull: number | null;
  trend: { date: string; count: number }[];
}

export interface WorkspaceStatsResponse {
  projectCount: number;
  pageViews: number;
  events: number;
  since: string;
}

export const getStorageStats = async (): Promise<StorageStatsResponse> => {
  const response = await fetch('/api/system/storage');
  if (!response.ok) {
    throw new Error(`Failed to fetch storage stats: ${response.statusText}`);
  }
  const body = await response.json();
  return body.data;
};

export const getWorkspaceStats = async (workspaceId: string): Promise<WorkspaceStatsResponse> => {
  const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/stats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch workspace stats: ${response.statusText}`);
  }
  const body = await response.json();
  return body.data;
};
