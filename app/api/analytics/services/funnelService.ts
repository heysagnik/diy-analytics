import { Types } from 'mongoose';
import PageView from '../../../../models/PageView';
import Event from '../../../../models/Event';
import { getDateRangeDetails } from '../utils/dateUtils';

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
 * code rather than an aggregation pipeline — funnel step counts are small
 * (a handful of steps) and the per-session walk is far easier to reason
 * about than expressing ordered-subsequence matching in Mongo's query
 * language.
 */
// Above this many combined pageview+event rows in the window, loading the
// whole session graph into memory risks OOM/timeouts (especially on
// serverless). Fail fast with a clear message instead of degrading slowly.
const MAX_FUNNEL_ROWS = 200_000;

export class FunnelService {
  async getFunnelAnalysis(
    projectId: string,
    steps: FunnelStepInput[],
    dateRangeKey: string
  ): Promise<FunnelStepResult[]> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new Error('Invalid project ID');
    }
    if (steps.length < 2) {
      throw new Error('A funnel needs at least 2 steps');
    }

    const projectObjectId = new Types.ObjectId(projectId);
    const { timeRange } = getDateRangeDetails(dateRangeKey);
    const window = { $gte: new Date(timeRange.start), $lte: new Date(timeRange.end) };

    const [pvCount, evCount] = await Promise.all([
      PageView.countDocuments({ projectId: projectObjectId, timestamp: window }),
      Event.countDocuments({ projectId: projectObjectId, timestamp: window })
    ]);
    if (pvCount + evCount > MAX_FUNNEL_ROWS) {
      throw new Error(
        `Funnel analysis window is too large (${pvCount + evCount} rows, limit ${MAX_FUNNEL_ROWS}). Narrow the date range and try again.`
      );
    }

    const [pageviews, events] = await Promise.all([
      PageView.find(
        { projectId: projectObjectId, timestamp: window },
        { sessionId: 1, path: 1, timestamp: 1, _id: 0 }
      ).lean<{ sessionId: string; path: string; timestamp: Date }[]>(),
      Event.find(
        { projectId: projectObjectId, timestamp: window },
        { sessionId: 1, name: 1, timestamp: 1, _id: 0 }
      ).lean<{ sessionId: string; name: string; timestamp: Date }[]>()
    ]);

    const sessionSequences = new Map<string, SessionEvent[]>();
    for (const pv of pageviews) {
      (sessionSequences.get(pv.sessionId) ?? sessionSequences.set(pv.sessionId, []).get(pv.sessionId)!).push({
        type: 'page',
        value: pv.path,
        timestamp: pv.timestamp
      });
    }
    for (const ev of events) {
      (sessionSequences.get(ev.sessionId) ?? sessionSequences.set(ev.sessionId, []).get(ev.sessionId)!).push({
        type: 'event',
        value: ev.name,
        timestamp: ev.timestamp
      });
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
        i === 0 || stepCounts[i - 1] === 0
          ? 0
          : Math.round((1 - stepCounts[i] / stepCounts[i - 1]) * 10000) / 100
    }));
  }
}
