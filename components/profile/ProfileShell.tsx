'use client';

import {
  CheckCircleIcon,
  DatabaseIcon,
  EnvelopeSimpleIcon,
  KeyIcon,
  UserCircleIcon,
  UsersIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';
import { VisitorAvatar } from '@/components/analytics/visitors/VisitorAvatar';
import { ApiKeysCard } from '@/components/profile/ApiKeysCard';
import { SystemStorageCard } from '@/components/profile/SystemStorageCard';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { StorageStatsResponse } from '@/lib/api/system';
import { cn } from '@/lib/utils';

interface ApiKeySummary {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
}

interface ProfileShellProps {
  user: { id: string; name: string; email: string };
  workspaceSlug: string;
  workspaces: WorkspaceSummary[];
  roles: Map<string, string>;
  apiKeys: ApiKeySummary[];
  mcpEndpoint: string;
  storageStats: StorageStatsResponse;
}

const SECTIONS = [
  { id: 'account', label: 'Account', icon: UserCircleIcon },
  { id: 'workspaces', label: 'Workspaces', icon: UsersIcon },
  { id: 'api-keys', label: 'API Keys', icon: KeyIcon },
  { id: 'storage', label: 'Storage', icon: DatabaseIcon },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export function ProfileShell({
  user,
  workspaceSlug,
  workspaces,
  roles,
  apiKeys,
  mcpEndpoint,
  storageStats,
}: ProfileShellProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('account');

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
      <nav className="flex shrink-0 gap-1 overflow-x-auto sm:w-52 sm:flex-col sm:gap-0.5 sm:overflow-visible">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted-foreground hover:bg-surface-secondary hover:text-foreground',
              )}
            >
              <Icon size={16} weight={isActive ? 'bold' : 'regular'} className="shrink-0" />
              <span className="whitespace-nowrap">{section.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1">
        {activeSection === 'account' && (
          <Card className="p-6">
            <div className="mb-5">
              <VisitorAvatar userId={user.id} size={56} />
            </div>
            <h2 className="font-display text-xl font-semibold text-foreground">{user.name}</h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <EnvelopeSimpleIcon size={15} weight="bold" className="shrink-0" />
              <span className="break-all">{user.email}</span>
            </div>
          </Card>
        )}

        {activeSection === 'workspaces' && (
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="label-eyebrow text-muted-foreground">Your workspaces</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Workspace access</h2>
              </div>
              <UsersIcon size={20} weight="bold" className="text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-2">
              {workspaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">You are not a member of any workspace.</p>
              ) : (
                workspaces.map((workspace) => {
                  const isCurrent = workspace.slug === workspaceSlug;
                  return (
                    <Link
                      key={workspace.id}
                      href={`/${workspace.slug}`}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors',
                        isCurrent
                          ? 'border-accent/30 bg-accent/5'
                          : 'border-border bg-background hover:bg-surface-secondary',
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-foreground">{workspace.name}</p>
                          {isCurrent && <CheckCircleIcon size={14} weight="fill" className="shrink-0 text-accent" />}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">/{workspace.slug}</p>
                      </div>
                      <Badge variant="secondary" className="ml-4 shrink-0 capitalize">
                        {roles.get(workspace.id)}
                      </Badge>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>
        )}

        {activeSection === 'api-keys' && <ApiKeysCard initialKeys={apiKeys} mcpEndpoint={mcpEndpoint} />}

        {activeSection === 'storage' && <SystemStorageCard stats={storageStats} />}
      </div>
    </div>
  );
}
