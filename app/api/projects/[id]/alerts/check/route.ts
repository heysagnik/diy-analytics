import { desc, eq, inArray } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/app/api/analytics/services/analyticsService';
import { FunnelService } from '@/app/api/analytics/services/funnelService';
import { alerts, dailyRollups, funnels, goals } from '@/db/schema';
import { db } from '@/lib/db';
import { requireProjectAccess } from '@/lib/serverAuth';
import { assertSafeWebhookUrl, UnsafeWebhookUrlError } from '@/lib/ssrfGuard';
import { isValidUuid } from '@/lib/uuid';

// Don't re-fire (and re-deliver a webhook) for an alert that's still
// tripped from the previous check — without this, an alert left in a
// triggered state gets a fresh webhook on every cron tick indefinitely.
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const PAGERDUTY_EVENTS_URL = 'https://events.pagerduty.com/v2/enqueue';
const ALERT_DATE_RANGE = 'LAST_24_HOURS';

interface TriggeredAlertInfo {
  alertId: string;
  name: string;
  metric: string;
  value: number;
  change: number;
  thresholdType: string;
  thresholdValue: number;
  triggeredAt: string;
  projectId: string;
}

/** Builds the (url, body) pair to POST for a given alert channel. */
function buildDelivery(channel: string, webhookUrl: string, info: TriggeredAlertInfo): { url: string; body: unknown } {
  const summary =
    info.thresholdType === 'drop_pct'
      ? `${info.name}: ${info.metric} dropped ${Math.abs(info.change)}% (now ${info.value})`
      : info.thresholdType === 'anomaly'
        ? `${info.name}: ${info.metric} is anomalously low at ${info.value} (${info.change}% vs. trailing average)`
        : `${info.name}: ${info.metric} fell to ${info.value} (below ${info.thresholdValue})`;

  switch (channel) {
    case 'slack':
      return { url: webhookUrl, body: { text: `🚨 *${summary}*` } };
    case 'discord':
      return { url: webhookUrl, body: { content: `🚨 **${summary}**` } };
    case 'pagerduty':
      return {
        url: PAGERDUTY_EVENTS_URL,
        body: {
          routing_key: webhookUrl,
          event_action: 'trigger',
          dedup_key: `diy-analytics-alert-${info.alertId}`,
          payload: {
            summary,
            source: `diy-analytics/project/${info.projectId}`,
            severity: 'warning',
            timestamp: info.triggeredAt,
            custom_details: { metric: info.metric, value: info.value, change: info.change },
          },
        },
      };
    default:
      return {
        url: webhookUrl,
        body: {
          alert: info.name,
          projectId: info.projectId,
          metric: info.metric,
          value: info.value,
          change: info.change,
          thresholdType: info.thresholdType,
          thresholdValue: info.thresholdValue,
          triggeredAt: info.triggeredAt,
        },
      };
  }
}

type Alert = typeof alerts.$inferSelect;
type SiteMetric = 'pageViews' | 'uniqueUsers' | 'sessions';

interface EvaluationContext {
  analyticsService: AnalyticsService;
  funnelService: FunnelService;
  siteMetrics: Awaited<ReturnType<AnalyticsService['getAnalytics']>>;
  goalById: Map<string, typeof goals.$inferSelect>;
  funnelById: Map<string, typeof funnels.$inferSelect>;
}

const ANOMALY_BASELINE_DAYS = 14;
const ANOMALY_MIN_DAYS = 5;

/** Trailing daily mean/stddev for a site metric, from closed daily_rollups rows. */
async function getAnomalyBaseline(
  projectId: string,
  metric: SiteMetric,
): Promise<{ mean: number; stddev: number } | null> {
  const rows = await db
    .select()
    .from(dailyRollups)
    .where(eq(dailyRollups.projectId, projectId))
    .orderBy(desc(dailyRollups.date))
    .limit(ANOMALY_BASELINE_DAYS);

  if (rows.length < ANOMALY_MIN_DAYS) return null;

  const values = rows.map((row) =>
    metric === 'pageViews' ? row.pageViews : metric === 'sessions' ? row.sessions : row.userIds.length,
  );
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return { mean, stddev: Math.sqrt(variance) };
}

/** Resolves an alert's current value/change and a human-readable label for its target. */
async function evaluateAlert(
  alert: Alert,
  projectId: string,
  ctx: EvaluationContext,
): Promise<{ value: number; change: number; metricLabel: string; anomalyBound?: number } | null> {
  if (alert.goalId) {
    const goal = ctx.goalById.get(alert.goalId);
    if (!goal) return null;
    const result = await ctx.analyticsService.getGoalConversionRate(projectId, goal, ALERT_DATE_RANGE);
    return { value: result.rate, change: 0, metricLabel: `goal:${goal.name}` };
  }

  if (alert.funnelId) {
    const funnel = ctx.funnelById.get(alert.funnelId);
    if (!funnel) return null;
    const steps = await ctx.funnelService.getFunnelAnalysis(projectId, funnel.steps, ALERT_DATE_RANGE);
    const first = steps[0];
    const last = steps[steps.length - 1];
    const rate = first && first.count > 0 ? Math.round((last.count / first.count) * 10000) / 100 : 0;
    return { value: rate, change: 0, metricLabel: `funnel:${funnel.name}` };
  }

  const metric = alert.metric as SiteMetric;
  const metricData = ctx.siteMetrics[metric];

  if (alert.thresholdType === 'anomaly') {
    const baseline = await getAnomalyBaseline(projectId, metric);
    if (!baseline) return null; // not enough rollup history yet
    const anomalyBound = baseline.mean - alert.thresholdValue * baseline.stddev;
    const change =
      baseline.mean > 0 ? Math.round(((metricData.total - baseline.mean) / baseline.mean) * 10000) / 100 : 0;
    return { value: metricData.total, change, metricLabel: metric, anomalyBound };
  }

  return { value: metricData.total, change: metricData.change, metricLabel: metric };
}

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

    const analyticsService = new AnalyticsService();
    const goalIds = [...new Set(alertRows.map((a) => a.goalId).filter((v): v is string => v !== null))];
    const funnelIds = [...new Set(alertRows.map((a) => a.funnelId).filter((v): v is string => v !== null))];

    const [siteMetrics, goalRows, funnelRows] = await Promise.all([
      analyticsService.getAnalytics({ projectId: id, dateRange: ALERT_DATE_RANGE }),
      goalIds.length ? db.select().from(goals).where(inArray(goals.id, goalIds)) : Promise.resolve([]),
      funnelIds.length ? db.select().from(funnels).where(inArray(funnels.id, funnelIds)) : Promise.resolve([]),
    ]);

    const ctx: EvaluationContext = {
      analyticsService,
      funnelService: new FunnelService(),
      siteMetrics,
      goalById: new Map(goalRows.map((g) => [g.id, g])),
      funnelById: new Map(funnelRows.map((f) => [f.id, f])),
    };

    const triggered: Array<{ alertId: string; name: string; metric: string; value: number; change: number }> = [];

    for (const alert of alertRows) {
      const evaluation = await evaluateAlert(alert, id, ctx);
      if (!evaluation) continue;
      const { value, change, metricLabel, anomalyBound } = evaluation;

      const isTriggered =
        alert.thresholdType === 'drop_pct'
          ? change <= -alert.thresholdValue
          : alert.thresholdType === 'anomaly'
            ? anomalyBound !== undefined && value < anomalyBound
            : value < alert.thresholdValue;

      if (!isTriggered) continue;

      if (alert.lastTriggeredAt && Date.now() - new Date(alert.lastTriggeredAt).getTime() < ALERT_COOLDOWN_MS) {
        continue; // still within cooldown from the last firing — suppress
      }

      triggered.push({ alertId: alert.id, name: alert.name, metric: metricLabel, value, change });

      try {
        const triggeredAt = new Date().toISOString();
        const delivery = buildDelivery(alert.channel, alert.webhookUrl, {
          alertId: alert.id,
          name: alert.name,
          metric: metricLabel,
          value,
          change,
          thresholdType: alert.thresholdType,
          thresholdValue: alert.thresholdValue,
          triggeredAt,
          projectId: id,
        });

        // PagerDuty's field is a routing key, not a URL to validate/reach —
        // the request always targets PagerDuty's own fixed endpoint.
        if (alert.channel !== 'pagerduty') {
          await assertSafeWebhookUrl(delivery.url);
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch(delivery.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(delivery.body),
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
