'use client';

import { PlugsIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';

interface ConnectedApp {
  clientId: string;
  clientName: string;
  createdAt: string;
}

interface ConnectedAppsCardProps {
  initialApps: ConnectedApp[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ConnectedAppsCard({ initialApps }: ConnectedAppsCardProps) {
  const { showToast } = useToast();
  const [apps, setApps] = useState(initialApps);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (clientId: string) => {
    setRevokingId(clientId);
    try {
      const response = await fetch(`/api/account/connected-apps/${encodeURIComponent(clientId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to disconnect');
      setApps((prev) => prev.filter((a) => a.clientId !== clientId));
      showToast('success', 'Disconnected');
    } catch (error: unknown) {
      showToast('error', error instanceof Error ? error.message : 'Failed to disconnect');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-5">
        <p className="label-eyebrow text-muted-foreground">OAuth connections</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Connected Apps</h2>
      </div>

      <p className="mb-5 text-xs text-muted-foreground">
        Apps you've authorized via the MCP connector flow (e.g. claude.ai's "Add custom connector"), separate from API
        keys. Disconnecting revokes its access immediately.
      </p>

      <div className="flex flex-col gap-2">
        {apps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No connected apps yet.</p>
        ) : (
          apps.map((app) => (
            <div
              key={app.clientId}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-surface-secondary"
            >
              <div className="flex min-w-0 items-center gap-3">
                <PlugsIcon size={18} weight="bold" className="shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{app.clientName}</p>
                  <p className="truncate text-xs text-muted-foreground">Connected {formatDate(app.createdAt)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRevoke(app.clientId)}
                disabled={revokingId === app.clientId}
                aria-label={`Disconnect ${app.clientName}`}
                className="shrink-0 text-muted-foreground hover:text-danger"
              >
                <TrashIcon size={14} />
              </Button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
