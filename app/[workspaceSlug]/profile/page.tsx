import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  SignOutIcon,
  UsersIcon,
} from '@phosphor-icons/react/dist/ssr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { VisitorAvatar } from '@/components/analytics/visitors/VisitorAvatar';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { getRequestUser } from '@/lib/auth';
import Workspace from '@/models/Workspace';
import WorkspaceMember from '@/models/WorkspaceMember';
import connectToDatabase from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const user = await getRequestUser();
  if (!user) redirect(`/login?next=/${workspaceSlug}/profile`);

  await connectToDatabase();
  const currentWorkspace = await Workspace.findOne({ slug: workspaceSlug }).select('_id').lean();
  if (!currentWorkspace) notFound();
  const workspaceId = String(currentWorkspace._id);
  const memberships = await WorkspaceMember.find({ userId: user.id }).lean<{ workspaceId: unknown; role: string }[]>();
  if (!memberships.some((item) => String(item.workspaceId) === workspaceId)) notFound();
  const workspaces = await Workspace.find({ _id: { $in: memberships.map((item) => item.workspaceId) } }).select('name slug').lean();
  const roles = new Map(memberships.map((item) => [String(item.workspaceId), item.role]));

  return (
    <main className="min-h-screen bg-background">
      <ProjectPageShell mainClassName="space-y-6">
        <div>
          <Link
            href={`/${workspaceSlug}`}
            className="mb-3 inline-flex h-9 items-center gap-1.5 -ml-1 rounded-lg px-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon size={15} weight="bold" />
            Back to projects
          </Link>

          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
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

        <div className="grid max-w-3xl gap-5 md:grid-cols-[1fr_1.2fr]">
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
            <div className="space-y-2">
              {workspaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">You are not a member of any workspace.</p>
              ) : (
                workspaces.map((workspace) => {
                  const isCurrent = workspace.slug === workspaceSlug;
                  return (
                    <Link
                      key={String(workspace._id)}
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
                        {roles.get(String(workspace._id))}
                      </Badge>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </ProjectPageShell>
    </main>
  );
}
