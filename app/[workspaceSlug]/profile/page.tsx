import { ArrowLeftIcon, SignOutIcon } from '@phosphor-icons/react/dist/ssr';
import { eq, inArray } from 'drizzle-orm';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ProfileShell } from '@/components/profile/ProfileShell';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { workspaceMembers, workspaces as workspacesTable } from '@/db/schema';
import type { StorageStatsResponse } from '@/lib/api/system';
import { listApiKeys } from '@/lib/apiKeys';
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

  const apiKeys = await listApiKeys(user.id);
  // Derived from the actual request host, not NEXT_PUBLIC_SITE_URL — this
  // app is self-hosted per-deployment and a project can be reachable from
  // multiple domains (see additionalDomains), so the MCP endpoint shown
  // must match whatever domain the user is actually browsing on.
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  const origin = host
    ? `${requestHeaders.get('x-forwarded-proto') || 'https'}://${host}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const mcpEndpoint = `${origin.replace(/\/+$/, '')}/api/mcp`;

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

          <ProfileShell
            user={{ id: user.id, name: user.name, email: user.email }}
            workspaceSlug={workspaceSlug}
            workspaces={workspaces}
            roles={roles}
            apiKeys={apiKeys.map((key) => ({
              id: key.id,
              name: key.name,
              tokenPrefix: key.tokenPrefix,
              lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
              createdAt: key.createdAt.toISOString(),
            }))}
            mcpEndpoint={mcpEndpoint}
            storageStats={storageStats}
          />
        </div>
      </ProjectPageShell>
    </main>
  );
}
