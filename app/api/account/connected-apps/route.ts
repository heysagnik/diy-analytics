import { type NextRequest, NextResponse } from 'next/server';
import { listConnectedApps } from '@/lib/oauth';
import { requireUser } from '@/lib/serverAuth';

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  const apps = await listConnectedApps(user.id);
  return NextResponse.json(apps);
}
