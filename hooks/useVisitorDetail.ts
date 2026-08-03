import { useEffect, useState } from 'react';
import type { VisitorDetail } from '@/types/visitors';
import type { HeatmapDay } from '@/components/analytics/visitors/ActivityHeatmap';

export const useVisitorDetail = (projectId: string, userId: string | null) => {
  const [detail, setDetail] = useState<VisitorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !userId) return;
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/projects/${projectId}/users/${encodeURIComponent(userId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (res) => {
        const result = await res.json().catch(() => null);
        if (!res.ok) throw new Error(result?.error || 'Failed to load visitor');
        return result;
      })
      .then((result) => {
        if (cancelled) return;
        if (!result?.success) throw new Error('Failed to load visitor');
        setDetail(result.data);
      })
      .catch((e) => {
        if (!cancelled && !controller.signal.aborted) setError(e instanceof Error ? e.message : 'Failed to load visitor');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [projectId, userId]);

  return { detail, loading, error };
};

export const useVisitorHeatmap = (projectId: string, userId: string | null, year: number) => {
  const [days, setDays] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId || !userId) return;
    let cancelled = false;
    const controller = new AbortController();
    setError(null);
    setLoading(true);
    fetch(`/api/projects/${projectId}/activity-heatmap?userId=${encodeURIComponent(userId)}&year=${year}`, { cache: 'no-store', signal: controller.signal })
      .then(async (res) => {
        const result = await res.json().catch(() => null);
        if (!res.ok) throw new Error(result?.error || 'Failed to load activity');
        return result;
      })
      .then((result) => {
        if (!cancelled && result?.success) setDays(result.data.days);
        else if (!cancelled) throw new Error('Failed to load activity');
      })
      .catch((e) => {
        if (!cancelled && !controller.signal.aborted) setError(e instanceof Error ? e.message : 'Failed to load activity');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [projectId, userId, year]);

  return { days, loading, error };
};
