'use client';

import React, { useEffect, useState } from 'react';

interface LiveVisitorsProps {
  projectId: string;
}

/** Polls /api/analytics/realtime every 10 seconds for visitors active within the server-defined realtime window. */
export const LiveVisitors: React.FC<LiveVisitorsProps> = ({ projectId }) => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/analytics/realtime?projectId=${projectId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { data } = await res.json();
        if (!cancelled) setCount(data.count ?? 0);
      } catch {
        // Silently ignore — the badge just stays at its last known value.
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
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
      </span>
      <span key={count} className="animate-count-update inline-flex gap-1 tabular-nums">
        {count} {count === 1 ? 'visitor' : 'visitors'} now
      </span>
    </div>
  );
};

export default LiveVisitors;
