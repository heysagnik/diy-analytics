'use client';

import { CheckIcon, CopyIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';

interface ApiKeySummary {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ApiKeysCardProps {
  initialKeys: ApiKeySummary[];
  mcpEndpoint: string;
}

function formatRelative(value: string | null): string {
  if (!value) return 'Never used';
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

/** Reusable copy button that cross-fades between a copy and check icon. */
function CopyButton({
  value,
  label,
  variant = 'outline',
}: {
  value: string;
  label: string;
  variant?: 'outline' | 'ghost';
}) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('error', 'Failed to copy');
    }
  };

  return (
    <Button variant={variant} size="sm" onClick={handleCopy} aria-label={label} className="shrink-0">
      <span className="icon-crossfade size-3.5">
        <CopyIcon size={14} className={`size-3.5 ${copied ? 'icon-crossfade-hidden' : ''}`} />
        <CheckIcon size={14} className={`size-3.5 text-success ${copied ? '' : 'icon-crossfade-hidden'}`} />
      </span>
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </Button>
  );
}

export function ApiKeysCard({ initialKeys, mcpEndpoint }: ApiKeysCardProps) {
  const { showToast } = useToast();
  const [keys, setKeys] = useState(initialKeys);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleCreate = async () => {
    const name = newKeyName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      const response = await fetch('/api/account/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create key');
      }
      const created = await response.json();
      setKeys((prev) => [
        {
          id: created.id,
          name: created.name,
          tokenPrefix: created.rawKey.slice(0, 12),
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setRevealedKey(created.rawKey);
      setNewKeyName('');
      setIsCreateOpen(false);
    } catch (error: unknown) {
      showToast('error', error instanceof Error ? error.message : 'Failed to create key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const response = await fetch(`/api/account/api-keys/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to revoke key');
      setKeys((prev) => prev.filter((k) => k.id !== id));
      showToast('success', 'API key revoked');
    } catch (error: unknown) {
      showToast('error', error instanceof Error ? error.message : 'Failed to revoke key');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="label-eyebrow text-muted-foreground">MCP & API access</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-foreground">API Keys</h2>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <PlusIcon size={14} />
          <span>Create key</span>
        </Button>
      </div>

      <div className="mb-5 flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Point an MCP client (Claude Desktop, Cursor, etc.) at this endpoint with an API key below as a bearer token.
        </p>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-secondary px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{mcpEndpoint}</code>
          <CopyButton value={mcpEndpoint} label="Copy MCP endpoint" variant="ghost" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet — create one to connect an MCP client.</p>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-surface-secondary"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{key.name}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {key.tokenPrefix}… · {formatRelative(key.lastUsedAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRevoke(key.id)}
                disabled={revokingId === key.id}
                aria-label={`Revoke ${key.name}`}
                className="shrink-0 text-muted-foreground hover:text-danger"
              >
                <TrashIcon size={14} />
              </Button>
            </div>
          ))
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>Name it after the client that will use it, e.g. "Claude Desktop".</DialogDescription>
          </DialogHeader>
          <Input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Claude Desktop"
            aria-label="Key name"
            autoFocus
          />
          <DialogFooter>
            <Button onClick={handleCreate} disabled={isCreating || !newKeyName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revealedKey} onOpenChange={(open) => !open && setRevealedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>Copy it now — you won't be able to see it again.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input readOnly value={revealedKey || ''} className="font-mono text-xs" aria-label="New API key" />
            {revealedKey && <CopyButton value={revealedKey} label="Copy API key" />}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
