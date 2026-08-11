import { BellIcon, PlayIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Project } from '../../types/settings';
import { SettingsGroup } from './SettingsGroup';

interface Alert {
  _id: string;
  name: string;
  metric: 'pageViews' | 'uniqueUsers' | 'sessions';
  thresholdType: 'drop_pct' | 'value_below' | 'anomaly';
  thresholdValue: number;
  webhookUrl: string;
  channel: 'generic' | 'slack' | 'discord' | 'pagerduty';
  goalId: string | null;
  funnelId: string | null;
  lastTriggeredAt?: string;
}

interface NamedResource {
  _id: string;
  name: string;
}

interface AlertsSectionProps {
  project: Project;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

type AlertTarget = 'metric' | 'goal' | 'funnel';

const METRIC_LABELS: Record<Alert['metric'], string> = {
  pageViews: 'Page Views',
  uniqueUsers: 'Unique Users',
  sessions: 'Sessions',
};
function isAlertMetric(value: unknown): value is Alert['metric'] {
  return value === 'pageViews' || value === 'uniqueUsers' || value === 'sessions';
}

function isThresholdType(value: unknown): value is Alert['thresholdType'] {
  return value === 'drop_pct' || value === 'value_below' || value === 'anomaly';
}

function isAlertTarget(value: unknown): value is AlertTarget {
  return value === 'metric' || value === 'goal' || value === 'funnel';
}

const CHANNEL_LABELS: Record<Alert['channel'], string> = {
  generic: 'Generic webhook',
  slack: 'Slack',
  discord: 'Discord',
  pagerduty: 'PagerDuty',
};
function isAlertChannel(value: unknown): value is Alert['channel'] {
  return value === 'generic' || value === 'slack' || value === 'discord' || value === 'pagerduty';
}

function alertTargetLabel(alert: Alert, goalsById: Map<string, string>, funnelsById: Map<string, string>): string {
  if (alert.goalId) return `Goal: ${goalsById.get(alert.goalId) ?? 'Unknown'}`;
  if (alert.funnelId) return `Funnel: ${funnelsById.get(alert.funnelId) ?? 'Unknown'}`;
  return METRIC_LABELS[alert.metric];
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({ project, showToast }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [goalOptions, setGoalOptions] = useState<NamedResource[]>([]);
  const [funnelOptions, setFunnelOptions] = useState<NamedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const [name, setName] = useState('');
  const [target, setTarget] = useState<AlertTarget>('metric');
  const [metric, setMetric] = useState<Alert['metric']>('pageViews');
  const [goalId, setGoalId] = useState('');
  const [funnelId, setFunnelId] = useState('');
  const [thresholdType, setThresholdType] = useState<Alert['thresholdType']>('drop_pct');
  const [thresholdValue, setThresholdValue] = useState('50');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState<Alert['channel']>('generic');
  const [isCreating, setIsCreating] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState<Alert | null>(null);

  useEffect(() => {
    if (!project?._id) return;
    let cancelled = false;

    Promise.all([
      fetch(`/api/projects/${project._id}/alerts`).then((res) => res.json()),
      fetch(`/api/projects/${project._id}/goals`).then((res) => res.json()),
      fetch(`/api/projects/${project._id}/funnels`).then((res) => res.json()),
    ])
      .then(([alertData, goalData, funnelData]) => {
        if (cancelled) return;
        setAlerts(Array.isArray(alertData) ? alertData : []);
        setGoalOptions(Array.isArray(goalData) ? goalData : []);
        setFunnelOptions(Array.isArray(funnelData) ? funnelData : []);
      })
      .catch(() => {
        if (!cancelled) showToast('error', 'Failed to load alerts.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [project?._id, showToast]);

  const handleCreate = async () => {
    if (!project?._id) return;
    const value = Number(thresholdValue);
    if (!name.trim() || !webhookUrl.trim() || !Number.isFinite(value) || value < 0) {
      showToast('error', 'Name, webhook URL, and a valid threshold are required.');
      return;
    }
    if (target === 'goal' && !goalId) {
      showToast('error', 'Select a goal to alert on.');
      return;
    }
    if (target === 'funnel' && !funnelId) {
      showToast('error', 'Select a funnel to alert on.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/api/projects/${project._id}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          metric,
          thresholdType: target === 'metric' ? thresholdType : 'value_below',
          thresholdValue: value,
          webhookUrl,
          channel,
          goalId: target === 'goal' ? goalId : undefined,
          funnelId: target === 'funnel' ? funnelId : undefined,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create alert.');
      }
      const alert = await response.json();
      setAlerts((prev) => [alert, ...prev]);
      setName('');
      setWebhookUrl('');
      showToast('success', 'Alert created.');
    } catch (error: unknown) {
      console.error('Failed to create alert:', error);
      showToast('error', 'Failed to create alert. Please check the details and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!project?._id) return;
    const prev = alerts;
    setAlerts((a) => a.filter((x) => x._id !== alertId));
    try {
      const response = await fetch(`/api/projects/${project._id}/alerts/${alertId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete alert.');
      showToast('success', 'Alert deleted.');
    } catch {
      setAlerts(prev);
      showToast('error', 'Failed to delete alert.');
    }
  };

  const handleCheckNow = async () => {
    if (!project?._id) return;
    setIsChecking(true);
    try {
      const response = await fetch(`/api/projects/${project._id}/alerts/check`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to run alert check.');
      const result = await response.json();
      const triggered = result.data.triggered as unknown[];
      showToast(
        triggered.length > 0 ? 'info' : 'success',
        triggered.length > 0
          ? `${triggered.length} alert(s) triggered and notified.`
          : `Checked ${result.data.checked} alert(s) — all within thresholds.`,
      );
    } catch (error: unknown) {
      console.error('Failed to run alert check:', error);
      showToast('error', 'Failed to run the alert check. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <SettingsGroup
      title="Alerts"
      headerAction={
        alerts.length > 0 ? (
          <Button variant="outline" size="sm" onClick={handleCheckNow} disabled={isChecking}>
            <PlayIcon size={14} />
            <span>{isChecking ? 'Checking…' : 'Check now'}</span>
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 p-4 sm:px-5">
        <p className="text-xs text-muted-foreground">
          Get a webhook notification when traffic drops or falls below a threshold. No built-in scheduler ships with
          this app — point an external cron at the check endpoint, or use &apos;Check now&apos; manually.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alert name (e.g. Traffic drop)"
            disabled={isCreating}
            aria-label="Alert name"
            className="sm:flex-1"
          />
          <Select
            value={target}
            onValueChange={(v: unknown) => {
              if (isAlertTarget(v)) setTarget(v);
            }}
            disabled={isCreating}
          >
            <SelectTrigger aria-label="Target" className="sm:w-36">
              <SelectValue>
                {(v: AlertTarget) => (v === 'metric' ? 'Site metric' : v === 'goal' ? 'Goal' : 'Funnel')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="metric">Site metric</SelectItem>
              <SelectItem value="goal">Goal</SelectItem>
              <SelectItem value="funnel">Funnel</SelectItem>
            </SelectContent>
          </Select>

          {target === 'metric' && (
            <Select
              value={metric}
              onValueChange={(v: unknown) => {
                if (isAlertMetric(v)) setMetric(v);
              }}
              disabled={isCreating}
            >
              <SelectTrigger aria-label="Metric">
                <SelectValue>{(v: Alert['metric']) => METRIC_LABELS[v]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METRIC_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {target === 'goal' && (
            <Select value={goalId} onValueChange={(v: unknown) => setGoalId(String(v))} disabled={isCreating}>
              <SelectTrigger aria-label="Goal">
                <SelectValue>{() => goalOptions.find((g) => g._id === goalId)?.name ?? 'Select a goal'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {goalOptions.map((goal) => (
                  <SelectItem key={goal._id} value={goal._id}>
                    {goal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {target === 'funnel' && (
            <Select value={funnelId} onValueChange={(v: unknown) => setFunnelId(String(v))} disabled={isCreating}>
              <SelectTrigger aria-label="Funnel">
                <SelectValue>
                  {() => funnelOptions.find((f) => f._id === funnelId)?.name ?? 'Select a funnel'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {funnelOptions.map((funnel) => (
                  <SelectItem key={funnel._id} value={funnel._id}>
                    {funnel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {target === 'metric' ? (
            <Select
              value={thresholdType}
              onValueChange={(v: unknown) => {
                if (isThresholdType(v)) setThresholdType(v);
              }}
              disabled={isCreating}
            >
              <SelectTrigger aria-label="Threshold type">
                <SelectValue>
                  {(v: Alert['thresholdType']) =>
                    v === 'drop_pct'
                      ? 'Drops by (%) vs prior 24h'
                      : v === 'anomaly'
                        ? 'Anomalous vs. trailing average'
                        : 'Falls below (raw value)'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="drop_pct">Drops by (%) vs prior 24h</SelectItem>
                <SelectItem value="value_below">Falls below (raw value)</SelectItem>
                <SelectItem value="anomaly">Anomalous vs. trailing average</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center px-3 rounded-md border border-border text-xs text-muted-foreground">
              Conversion rate falls below (%)
            </div>
          )}
          <Input
            type="number"
            value={thresholdValue}
            onChange={(e) => setThresholdValue(e.target.value)}
            placeholder={
              target !== 'metric' ? '5' : thresholdType === 'drop_pct' ? '50' : thresholdType === 'anomaly' ? '2' : '10'
            }
            disabled={isCreating}
            aria-label={thresholdType === 'anomaly' ? 'Standard deviations' : 'Threshold value'}
            className="sm:w-32"
          />
        </div>
        {target === 'metric' && thresholdType === 'anomaly' && (
          <p className="text-xs text-muted-foreground -mt-2">
            Fires when today&apos;s value falls this many standard deviations below the trailing 14-day daily average.
            Needs at least 5 days of history.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Select
            value={channel}
            onValueChange={(v: unknown) => {
              if (isAlertChannel(v)) setChannel(v);
            }}
            disabled={isCreating}
          >
            <SelectTrigger aria-label="Channel" className="sm:w-40">
              <SelectValue>{(v: Alert['channel']) => CHANNEL_LABELS[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder={channel === 'pagerduty' ? 'PagerDuty Events API routing key' : 'https://hooks.example.com/...'}
            disabled={isCreating}
            aria-label={channel === 'pagerduty' ? 'PagerDuty routing key' : 'Webhook URL'}
            className="sm:flex-1"
          />
          <Button size="sm" onClick={handleCreate} disabled={isCreating}>
            <PlusIcon size={14} />
            <span>Add</span>
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <BellIcon size={16} />
            <span>No alerts defined yet.</span>
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {alerts.map((alert) => {
              const goalsById = new Map(goalOptions.map((g) => [g._id, g.name]));
              const funnelsById = new Map(funnelOptions.map((f) => [f._id, f.name]));
              return (
                <li key={alert._id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{alert.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alertTargetLabel(alert, goalsById, funnelsById)}{' '}
                      {alert.thresholdType === 'drop_pct'
                        ? `drops ≥ ${alert.thresholdValue}%`
                        : alert.thresholdType === 'anomaly'
                          ? `> ${alert.thresholdValue} std dev below average`
                          : `< ${alert.thresholdValue}${alert.goalId || alert.funnelId ? '%' : ''}`}
                      {' · '}
                      {CHANNEL_LABELS[alert.channel]}
                      {alert.lastTriggeredAt && ` · last triggered ${new Date(alert.lastTriggeredAt).toLocaleString()}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAlertToDelete(alert)}
                    aria-label={`Delete alert ${alert.name}`}
                  >
                    <TrashIcon size={14} className="text-danger" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <Dialog
          open={alertToDelete !== null}
          onOpenChange={(open) => {
            if (!open) setAlertToDelete(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete alert?</DialogTitle>
              <DialogDescription>
                {alertToDelete
                  ? `“${alertToDelete.name}” will be permanently deleted and will no longer send notifications.`
                  : ''}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAlertToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!alertToDelete) return;
                  void handleDelete(alertToDelete._id);
                  setAlertToDelete(null);
                }}
              >
                Delete alert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsGroup>
  );
};
