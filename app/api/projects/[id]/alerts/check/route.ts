import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/app/api/analytics/services/analyticsService';
import { alerts } from '@/db/schema';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { assertSafeWebhookUrl, UnsafeWebhookUrlError } from '@/lib/ssrfGuard';
import { isValidUuid } from '@/lib/uuid';

// Don't re-fire (and re-deliver a webhook) for an alert that's still
// tripped from the previous check — without this, an alert left in a
// triggered state gets a fresh webhook on every cron tick indefinitely.
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/**
 * Evaluates every alert for a project against the trailing 24h window and
 * fires webhooks for any that trip their threshold. There is no built-in
 * scheduler in this self-hosted app — this endpoint is meant to be called
 * periodically by an external cron (e.g. `curl -X POST .../alerts/check`
 * from system cron or a hosting platform's scheduled-function feature), or
 * manually via the "Check now" button in Settings.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
  }
  const access = await requireProjectAccess(request, id, 'admin');
  if (access instanceof NextResponse) return access;

  try {
    const alertRows = await db.select().from(alerts).where(eq(alerts.projectId, id));
    if (alertRows.length === 0) {
      return NextResponse.json({ success: true, data: { checked: 0, triggered: [] } });
    }

    const service = new AnalyticsService();
    const analytics = await service.getAnalytics({ projectId: id, dateRange: 'LAST_24_HOURS' });

    const triggered: Array<{ alertId: string; name: string; metric: string; value: number; change: number }> = [];

    for (const alert of alertRows) {
      const metricData = analytics[alert.metric as 'pageViews' | 'uniqueUsers' | 'sessions'];
      const value = metricData.total;
      const change = metricData.change;

      const isTriggered =
        alert.thresholdType === 'drop_pct' ? change <= -alert.thresholdValue : value < alert.thresholdValue;

      if (!isTriggered) continue;

      if (alert.lastTriggeredAt && Date.now() - new Date(alert.lastTriggeredAt).getTime() < ALERT_COOLDOWN_MS) {
        continue; // still within cooldown from the last firing — suppress
      }

      triggered.push({ alertId: alert.id, name: alert.name, metric: alert.metric, value, change });

      try {
        await assertSafeWebhookUrl(alert.webhookUrl);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch(alert.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: alert.name,
            projectId: id,
            metric: alert.metric,
            value,
            change,
            thresholdType: alert.thresholdType,
            thresholdValue: alert.thresholdValue,
            triggeredAt: new Date().toISOString(),
          }),
          redirect: 'manual', // don't let a redirect bounce us to an internal address post-validation
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok && res.type !== 'opaqueredirect') {
          console.error(`Alert webhook ${alert.id} returned HTTP ${res.status}`);
        } else if (res.type === 'opaqueredirect') {
          console.error(`Alert webhook ${alert.id} attempted a redirect, which is not followed`);
        }
      } catch (webhookError) {
        if (webhookError instanceof UnsafeWebhookUrlError) {
          console.error(`Alert webhook ${alert.id} blocked: ${webhookError.message}`);
        } else {
          console.error(`Alert webhook delivery failed for alert ${alert.id}:`, webhookError);
        }
      }

      await db.update(alerts).set({ lastTriggeredAt: new Date() }).where(eq(alerts.id, alert.id));
    }

    return NextResponse.json({ success: true, data: { checked: alertRows.length, triggered } });
  } catch (error) {
    console.error('Alert check error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
