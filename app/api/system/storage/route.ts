import { type NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/serverAuth';
import { getGrowthTrend, getStorageStats } from '@/lib/systemStats';

// Storage is a property of the whole self-hosted instance, not any one
// workspace — visible to any signed-in user, same access level as the rest
// of the Profile page.
export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  const [stats, trend] = await Promise.all([getStorageStats(), getGrowthTrend(14)]);

  return NextResponse.json({ success: true, data: { ...stats, trend } }, { headers: { 'Cache-Control': 'no-store' } });
}
