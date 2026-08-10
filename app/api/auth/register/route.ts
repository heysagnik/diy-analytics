import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { users, workspaceMembers, workspaces } from '@/db/schema';
import { AUTH_COOKIE, AUTH_MAX_AGE, createSession, hashPassword, normalizeEmail } from '@/lib/auth';
import { db } from '@/lib/db';

function workspaceSlug(name: string) {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'workspace';
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: NextRequest) {
  let body: { email?: unknown; password?: unknown; name?: unknown; workspaceName?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  // Workspace name is collected in a separate onboarding step after signup
  // (see /api/workspaces), so it's optional here.
  const workspaceName = typeof body.workspaceName === 'string' ? body.workspaceName.trim() : '';
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320)
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  if (password.length < 10 || password.length > 128)
    return NextResponse.json({ error: 'Password must be 10 to 128 characters' }, { status: 400 });
  if (!name || name.length > 120) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (workspaceName && workspaceName.length > 120)
    return NextResponse.json({ error: 'Workspace name is too long' }, { status: 400 });

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });

  let userId: string | undefined;
  let workspaceId: string | undefined;
  let createdWorkspaceSlug: string | undefined;
  try {
    const [user] = await db
      .insert(users)
      .values({ email, name, passwordHash: await hashPassword(password) })
      .returning({ id: users.id });
    userId = user.id;

    if (workspaceName) {
      const [workspace] = await db
        .insert(workspaces)
        .values({ name: workspaceName, slug: workspaceSlug(workspaceName) })
        .returning({ id: workspaces.id, slug: workspaces.slug });
      workspaceId = workspace.id;
      createdWorkspaceSlug = workspace.slug;
      await db.insert(workspaceMembers).values({ workspaceId, userId, role: 'owner' });
    }

    const token = await createSession(userId);
    const response = NextResponse.json(
      { success: true, workspaceId: workspaceId ?? null, workspaceSlug: createdWorkspaceSlug ?? null },
      { status: 201 },
    );
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: AUTH_MAX_AGE,
    });
    return response;
  } catch (error) {
    if (workspaceId)
      await db
        .delete(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .catch(() => {});
    if (userId)
      await db
        .delete(users)
        .where(eq(users.id, userId))
        .catch(() => {});
    console.error('Registration failed:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
