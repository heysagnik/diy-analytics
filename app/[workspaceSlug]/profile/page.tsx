import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  SignOutIcon,
  UsersIcon,
} from '@phosphor-icons/react/dist/ssr';
import { eq, inArray } from 'drizzle-orm';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { VisitorAvatar } from '@/components/analytics/visitors/VisitorAvatar';
import { SystemStorageCard } from '@/components/profile/SystemStorageCard';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { workspaceMembers, workspaces as workspacesTable } from '@/db/schema';
import type { StorageStatsResponse } from '@/lib/api/system';
import { getRequestUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getGrowthTrend, getStorageStats } from '@/lib/systemStats';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/login?next=/${workspaceSlug}/profile`);

  const [currentWorkspace] = await db
    .select({ id: workspacesTable.id })
    .from(workspacesTable)
    .where(eq(workspacesTable.slug, workspaceSlug))
    .limit(1);
  if (!currentWorkspace) notFound();
  const workspaceId = currentWorkspace.id;
  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));
  if (!memberships.some((item) => item.workspaceId === workspaceId)) notFound();
  const workspaces = memberships.length
    ? await db
        .select({ id: workspacesTable.id, name: workspacesTable.name, slug: workspacesTable.slug })
        .from(workspacesTable)
        .where(
          inArray(
            workspacesTable.id,
            memberships.map((item) => item.workspaceId),
          ),
        )
    : [];
  const roles = new Map(memberships.map((item) => [item.workspaceId, item.role]));

  const storageStats: StorageStatsResponse = await (async () => {
    try {
      const [stats, trend] = await Promise.all([getStorageStats(), getGrowthTrend(14)]);
      return { ...stats, trend };
    } catch (error) {
      console.error('Failed to load storage stats:', error);
      return {
        connected: false,
        latencyMs: 0,
        dataSizeBytes: 0,
        indexSizeBytes: 0,
        usedBytes: 0,
        capBytes: 512 * 1024 * 1024,
        usedPct: 0,
        pageviewCount: 0,
        eventCount: 0,
        estDaysUntilFull: null,
        trend: [],
      };
    }
  })();

  return (
    <main className="min-h-screen bg-background">
      <ProjectPageShell mainClassName="flex flex-col gap-6">
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
          <div>
            <Link
              href={`/${workspaceSlug}`}
              className="mb-3 inline-flex h-9 items-center gap-1.5 -ml-1 rounded-lg px-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon size={15} weight="bold" />
              Back to projects
            </Link>

            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium tracking-kicker text-accent">Account</p>
                <h1 className="text-balance font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
                  Profile details
                </h1>
                <p className="text-pretty max-w-lg text-sm text-muted-foreground">
                  Manage your account details and workspace access.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle variant="outline" size="icon" />
                <Link href="/logout">
                  <Button variant="outline" className="gap-2">
                    <SignOutIcon size={16} weight="bold" />
                    Log out
                  </Button>
                </Link>
              </div>
            </header>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
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
                        className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                          isCurrent
                            ? 'border-accent/30 bg-accent/5'
                            : 'border-border bg-background hover:bg-surface-secondary'
                        }`}
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

            <div className="md:col-span-2">
              <SystemStorageCard stats={storageStats} />
            </div>
          </div>
        </div>
      </ProjectPageShell>
    </main>
  );
}
