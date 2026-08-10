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
export const ALERT_THRESHOLD_TYPES = ['drop_pct', 'value_below'] as const;
export type AlertThresholdType = (typeof ALERT_THRESHOLD_TYPES)[number];

// 'page': matchValue is an exact path (e.g. "/thank-you").
// 'event': matchValue is a custom event name tracked via window.trackEvent.
export const GOAL_TYPES = ['page', 'event'] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const FUNNEL_STEP_TYPES = ['page', 'event'] as const;
export type FunnelStepType = (typeof FUNNEL_STEP_TYPES)[number];
