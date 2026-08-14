// Shared "enum" value lists — stored as varchar + CHECK constraint (not a
// native Postgres enum type) so these stay portable to MySQL/SQLite, and so
// adding a new value later is a plain migration instead of the
// transaction-restricted `ALTER TYPE ... ADD VALUE`.

import { sql } from 'drizzle-orm';

// CHECK constraints are stored as literal SQL text, not parameterized —
// values here are compile-time constants defined in this file (never user
// input), so inlining via sql.raw is safe.
export function checkInList(values: readonly string[]) {
  return sql.raw(values.map((v) => `'${v}'`).join(', '));
}

export const WORKSPACE_MEMBER_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
export type WorkspaceMemberRole = (typeof WORKSPACE_MEMBER_ROLES)[number];

export const ALERT_METRICS = ['pageViews', 'uniqueUsers', 'sessions'] as const;
export type AlertMetric = (typeof ALERT_METRICS)[number];

// 'drop_pct': fire when the metric falls by >= thresholdValue percent vs the prior 24h.
// 'value_below': fire when the metric's raw total falls below thresholdValue.
// 'anomaly': fire when the metric falls more than thresholdValue standard
// deviations below its trailing 14-day daily mean (metric-target alerts only).
export const ALERT_THRESHOLD_TYPES = ['drop_pct', 'value_below', 'anomaly'] as const;
export type AlertThresholdType = (typeof ALERT_THRESHOLD_TYPES)[number];

// 'generic': webhookUrl is POSTed a raw JSON payload (existing behavior).
// 'slack' / 'discord': webhookUrl is an incoming-webhook URL, payload is
// reshaped to each platform's expected body ({text: ...} / {content: ...}).
// 'pagerduty': webhookUrl holds a PagerDuty Events API v2 routing key
// (not a URL) — the request always targets PagerDuty's fixed endpoint.
export const ALERT_CHANNELS = ['generic', 'slack', 'discord', 'pagerduty'] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

// 'page': matchValue is an exact path (e.g. "/thank-you").
// 'event': matchValue is a custom event name tracked via window.trackEvent.
export const GOAL_TYPES = ['page', 'event'] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const FUNNEL_STEP_TYPES = ['page', 'event'] as const;
export type FunnelStepType = (typeof FUNNEL_STEP_TYPES)[number];

// 'fatal'/'info'/'debug' are only reachable via the manual capture API
// (window.__DIY_CAPTURE_EXCEPTION__'s context.level) — automatic capture
// only ever produces 'error' (window.onerror) or 'warning' (unhandledrejection,
// resource load failures).
export const ERROR_SEVERITIES = ['fatal', 'error', 'warning', 'info', 'debug'] as const;
export type ErrorSeverity = (typeof ERROR_SEVERITIES)[number];

// 'resolved' -> 'active' transition (a new occurrence after being marked
// resolved) is a regression, recorded via `regressedAt`.
export const ERROR_STATUSES = ['active', 'resolved'] as const;
export type ErrorStatus = (typeof ERROR_STATUSES)[number];
