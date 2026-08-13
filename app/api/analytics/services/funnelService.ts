import { and, count, eq, gte, lte } from 'drizzle-orm';
import { events, pageViews } from '@/db/schema';
import { db } from '@/lib/db';
import { isValidUuid } from '@/lib/uuid';
import { getDateRangeDetails } from '../utils/dateUtils';
import { assertRowsWithinLimit } from './queryLimits';

export interface FunnelStepInput {
  type: 'page' | 'event';
  matchValue: string;
  label: string;
}

export interface FunnelStepResult {
  step: number;
  label: string;
  matchValue: string;
  count: number;
  dropoffPct: number;
}

interface SessionEvent {
  type: 'page' | 'event';
  value: string;
  timestamp: Date;
}

/**
 * Funnel analysis walks each session's chronologically-ordered pageview +
 * event stream and finds the first in-order match for each configured
 * step, tallying how many sessions reached each one. Done in application
 * code rather than a SQL query — funnel step counts are small (a handful
 * of steps) and the per-session walk is far easier to reason about than
 * expressing ordered-subsequence matching in SQL.
 */
export class FunnelService {
  async getFunnelAnalysis(
    projectId: string,
    steps: FunnelStepInput[],
    dateRangeKey: string,
  ): Promise<FunnelStepResult[]> {
    if (!isValidUuid(projectId)) {
      throw new Error('Invalid project ID');
    }
    if (steps.length < 2) {
      throw new Error('A funnel needs at least 2 steps');
    }

    const { timeRange } = getDateRangeDetails(dateRangeKey);
    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);
    const pvWindow = and(
      eq(pageViews.projectId, projectId),
      gte(pageViews.timestamp, start),
      lte(pageViews.timestamp, end),
    );
    const evWindow = and(eq(events.projectId, projectId), gte(events.timestamp, start), lte(events.timestamp, end));

    const [[pv], [ev]] = await Promise.all([
      db.select({ count: count() }).from(pageViews).where(pvWindow),
      db.select({ count: count() }).from(events).where(evWindow),
    ]);
    assertRowsWithinLimit(pv.count + ev.count, 'Funnel analysis');

    const [pageviewRows, eventRows] = await Promise.all([
      db
        .select({ sessionId: pageViews.sessionId, path: pageViews.path, timestamp: pageViews.timestamp })
        .from(pageViews)
        .where(pvWindow),
      db
        .select({ sessionId: events.sessionId, name: events.name, timestamp: events.timestamp })
        .from(events)
        .where(evWindow),
    ]);

    const sessionSequences = new Map<string, SessionEvent[]>();
    const sequenceFor = (sessionId: string): SessionEvent[] => {
      let sequence = sessionSequences.get(sessionId);
      if (!sequence) {
        sequence = [];
        sessionSequences.set(sessionId, sequence);
      }
      return sequence;
    };
    for (const pv of pageviewRows) {
      sequenceFor(pv.sessionId).push({ type: 'page', value: pv.path, timestamp: pv.timestamp });
    }
    for (const ev of eventRows) {
      sequenceFor(ev.sessionId).push({ type: 'event', value: ev.name, timestamp: ev.timestamp });
    }

    const stepCounts = new Array(steps.length).fill(0);
    for (const sequence of sessionSequences.values()) {
      sequence.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      let stepIdx = 0;
      for (const item of sequence) {
        if (stepIdx >= steps.length) break;
        const step = steps[stepIdx];
        if (item.type === step.type && item.value === step.matchValue) {
          stepCounts[stepIdx]++;
          stepIdx++;
        }
      }
    }

    return steps.map((step, i) => ({
      step: i,
      label: step.label,
      matchValue: step.matchValue,
      count: stepCounts[i],
      dropoffPct:
        i === 0 || stepCounts[i - 1] === 0 ? 0 : Math.round((1 - stepCounts[i] / stepCounts[i - 1]) * 10000) / 100,
    }));
  }
}
