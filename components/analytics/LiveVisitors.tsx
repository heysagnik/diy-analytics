'use client';

import React, { useEffect, useRef, useState } from 'react';

interface LiveVisitorsProps {
  projectId: string;
}

const REALTIME_WINDOW_MS = 5 * 60 * 1000;

export const LiveVisitors: React.FC<LiveVisitorsProps> = ({ projectId }) => {
  const [count, setCount] = useState<number | null>(null);
  const lastSuccessAt = useRef<number>(0);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/analytics/realtime?projectId=${projectId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { data } = await res.json();
        if (cancelled) return;
        lastSuccessAt.current = Date.now();
        setCount(data.count ?? 0);
      } catch {
        if (!cancelled && Date.now() - lastSuccessAt.current > REALTIME_WINDOW_MS) {
          setCount(0);
        }
      }
    };

    poll();
    const timer = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [projectId]);

  if (!count) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-medium text-foreground">
      <span className="relative flex size-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
        <span className="relative inline-flex rounded-full size-2 bg-success" />
      </span>
      <span key={count} className="animate-count-update inline-flex gap-1 tabular-nums">
        {count} {count === 1 ? 'visitor' : 'visitors'} now
      </span>
    </div>
  );
};

export default LiveVisitors;
