'use client';

import { MagnifyingGlassIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { use, useState } from 'react';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsIndicator, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type FilterDimension, filterLabel } from '@/types/filters';

const EXPLORE_DIMENSIONS: FilterDimension[] = [
  'country',
  'browser',
  'device',
  'source',
  'page',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'os',
  'city',
];

type ConditionType = 'dimension' | 'pageview' | 'event';

interface ConditionDraft {
  key: string;
  type: ConditionType;
  dimension: FilterDimension;
  dimensionValue: string;
  path: string;
  eventName: string;
  propertyKey: string;
  propertyValue: string;
}

const MAX_CONDITIONS = 5;

function newCondition(): ConditionDraft {
  return {
    key: Math.random().toString(36).slice(2),
    type: 'dimension',
    dimension: 'country',
    dimensionValue: '',
    path: '',
    eventName: '',
    propertyKey: '',
    propertyValue: '',
  };
}

function conditionToPayload(c: ConditionDraft): Record<string, unknown> | null {
  if (c.type === 'dimension') {
    if (!c.dimensionValue.trim()) return null;
    return { type: 'dimension', dimension: c.dimension, value: c.dimensionValue.trim() };
  }
  if (c.type === 'pageview') {
    if (!c.path.trim()) return null;
    return { type: 'pageview', path: c.path.trim() };
  }
  if (!c.eventName.trim()) return null;
  return {
    type: 'event',
    eventName: c.eventName.trim(),
    propertyKey: c.propertyKey.trim() || undefined,
    propertyValue: c.propertyValue.trim() || undefined,
  };
}

const DATE_RANGE_OPTIONS = [
  { value: 'LAST_7_DAYS', label: 'Last 7 days' },
  { value: 'LAST_30_DAYS', label: 'Last 30 days' },
  { value: 'LAST_6_MONTHS', label: 'Last 6 months' },
];

interface SessionSummary {
  sessionId: string;
  userId: string | null;
  country: string | null;
  browser: string | null;
  device: string | null;
  firstSeen: string;
  lastSeen: string;
  activityCount: number;
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
  removable,
}: {
  condition: ConditionDraft;
  onChange: (next: ConditionDraft) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 rounded-md bg-surface-tertiary">
      <Select
        value={condition.type}
        onValueChange={(v: unknown) => {
          if (v === 'dimension' || v === 'pageview' || v === 'event') onChange({ ...condition, type: v });
        }}
      >
        <SelectTrigger className="sm:w-40 shrink-0" aria-label="Condition type">
          <SelectValue>
            {(v: ConditionType) =>
              v === 'dimension' ? 'Attribute' : v === 'pageview' ? 'Visited page' : 'Fired event'
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dimension">Attribute</SelectItem>
          <SelectItem value="pageview">Visited page</SelectItem>
          <SelectItem value="event">Fired event</SelectItem>
        </SelectContent>
      </Select>

      {condition.type === 'dimension' && (
        <>
          <Select
            value={condition.dimension}
            onValueChange={(v: unknown) => onChange({ ...condition, dimension: v as FilterDimension })}
          >
            <SelectTrigger className="sm:w-36 shrink-0" aria-label="Dimension">
              <SelectValue>{(v: FilterDimension) => filterLabel(v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {EXPLORE_DIMENSIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {filterLabel(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={condition.dimensionValue}
            onChange={(e) => onChange({ ...condition, dimensionValue: e.target.value })}
            placeholder="e.g. US, Chrome, mobile"
            aria-label="Value"
            className="flex-1 min-w-0"
          />
        </>
      )}

      {condition.type === 'pageview' && (
        <Input
          value={condition.path}
          onChange={(e) => onChange({ ...condition, path: e.target.value })}
          placeholder="/pricing"
          aria-label="Page path"
          className="flex-1 min-w-0"
        />
      )}

      {condition.type === 'event' && (
        <>
          <Input
            value={condition.eventName}
            onChange={(e) => onChange({ ...condition, eventName: e.target.value })}
            placeholder="signup_completed"
            aria-label="Event name"
            className="flex-1 min-w-0"
          />
          <Input
            value={condition.propertyKey}
            onChange={(e) => onChange({ ...condition, propertyKey: e.target.value })}
            placeholder="property (optional)"
            aria-label="Event property key"
            className="sm:w-36 shrink-0"
          />
          {condition.propertyKey && (
            <Input
              value={condition.propertyValue}
              onChange={(e) => onChange({ ...condition, propertyValue: e.target.value })}
              placeholder="value"
              aria-label="Event property value"
              className="sm:w-32 shrink-0"
            />
          )}
        </>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={onRemove}
        disabled={!removable}
        aria-label="Remove condition"
        className="shrink-0"
      >
        <TrashIcon size={14} className="text-danger" />
      </Button>
    </div>
  );
}

export default function ExplorePage({
  params: promiseParams,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { projectId } = use(promiseParams);

  const [dateRange, setDateRange] = useState('LAST_30_DAYS');
  const [combinator, setCombinator] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<ConditionDraft[]>([newCondition()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ totalSessions: number; sessions: SessionSummary[] } | null>(null);

  const updateCondition = (key: string, next: ConditionDraft) => {
    setConditions((prev) => prev.map((c) => (c.key === key ? next : c)));
  };

  const removeCondition = (key: string) => {
    setConditions((prev) => prev.filter((c) => c.key !== key));
  };

  const runQuery = async () => {
    const payloadConditions = conditions.map(conditionToPayload);
    if (payloadConditions.some((c) => c === null)) {
      setError('Fill in every condition before running the query.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/explore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange, combinator, conditions: payloadConditions }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setResult(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run query');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProjectPageShell
      eyebrow="Insights"
      title="Explore"
      description="Find sessions matching a combination of conditions — no predefined funnel required."
    >
      <div className="flex flex-col gap-4">
        <Card className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sessions matching</span>
              <Tabs value={combinator} onValueChange={(v) => typeof v === 'string' && setCombinator(v as 'AND' | 'OR')}>
                <TabsList className="w-fit">
                  <TabsIndicator />
                  <TabsTrigger value="AND" className="px-2.5 py-1 text-[11px]">
                    ALL (AND)
                  </TabsTrigger>
                  <TabsTrigger value="OR" className="px-2.5 py-1 text-[11px]">
                    ANY (OR)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="text-xs text-muted-foreground">of these conditions</span>
            </div>
            <Select value={dateRange} onValueChange={(v: unknown) => typeof v === 'string' && setDateRange(v)}>
              <SelectTrigger aria-label="Date range" className="shrink-0">
                <SelectValue>{(v: string) => DATE_RANGE_OPTIONS.find((o) => o.value === v)?.label ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            {conditions.map((condition) => (
              <ConditionRow
                key={condition.key}
                condition={condition}
                onChange={(next) => updateCondition(condition.key, next)}
                onRemove={() => removeCondition(condition.key)}
                removable={conditions.length > 1}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConditions((prev) => [...prev, newCondition()])}
              disabled={conditions.length >= MAX_CONDITIONS}
            >
              <PlusIcon size={14} />
              <span>Add condition</span>
            </Button>
            <Button size="sm" onClick={runQuery} disabled={loading}>
              <MagnifyingGlassIcon size={14} />
              <span>{loading ? 'Running…' : 'Run query'}</span>
            </Button>
          </div>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && <Skeleton className="h-64 w-full rounded-xl" />}

        {!loading && result && (
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">
                {result.totalSessions.toLocaleString()} matching session{result.totalSessions === 1 ? '' : 's'}
              </p>
              {result.sessions.length > 0 && result.totalSessions > result.sessions.length && (
                <p className="text-xs text-muted-foreground mt-0.5">Showing the {result.sessions.length} most recent</p>
              )}
            </div>
            {result.sessions.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No sessions match these conditions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide border-b border-border">
                      <th className="px-4 py-2 text-left">Session</th>
                      <th className="px-4 py-2 text-left">Country</th>
                      <th className="px-4 py-2 text-left">Browser</th>
                      <th className="px-4 py-2 text-left">Device</th>
                      <th className="px-4 py-2 text-right">Activity</th>
                      <th className="px-4 py-2 text-right">Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.sessions.map((s) => (
                      <tr key={s.sessionId} className="hover:bg-surface-tertiary">
                        <td className="px-4 py-2 font-mono text-foreground">{s.sessionId.slice(0, 16)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{s.country || '—'}</td>
                        <td className="px-4 py-2 text-muted-foreground">{s.browser || '—'}</td>
                        <td className="px-4 py-2 text-muted-foreground">{s.device || '—'}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">{s.activityCount}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground tabular-nums">
                          {new Date(s.lastSeen).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </ProjectPageShell>
  );
}
