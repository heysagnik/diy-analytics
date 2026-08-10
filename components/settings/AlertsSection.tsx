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
  thresholdType: 'drop_pct' | 'value_below';
  thresholdValue: number;
  webhookUrl: string;
  lastTriggeredAt?: string;
}

interface AlertsSectionProps {
  project: Project;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const METRIC_LABELS: Record<Alert['metric'], string> = {
  pageViews: 'Page Views',
  uniqueUsers: 'Unique Users',
  sessions: 'Sessions',
};
function isAlertMetric(value: unknown): value is Alert['metric'] {
  return value === 'pageViews' || value === 'uniqueUsers' || value === 'sessions';
}

function isThresholdType(value: unknown): value is Alert['thresholdType'] {
  return value === 'drop_pct' || value === 'value_below';
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({ project, showToast }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const [name, setName] = useState('');
  const [metric, setMetric] = useState<Alert['metric']>('pageViews');
  const [thresholdType, setThresholdType] = useState<Alert['thresholdType']>('drop_pct');
  const [thresholdValue, setThresholdValue] = useState('50');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState<Alert | null>(null);

  useEffect(() => {
    if (!project?._id) return;
    let cancelled = false;
    fetch(`/api/projects/${project._id}/alerts`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAlerts(Array.isArray(data) ? data : []);
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

    setIsCreating(true);
    try {
      const response = await fetch(`/api/projects/${project._id}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, metric, thresholdType, thresholdValue: value, webhookUrl }),
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
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
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
                  v === 'drop_pct' ? 'Drops by (%) vs prior 24h' : 'Falls below (raw value)'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="drop_pct">Drops by (%) vs prior 24h</SelectItem>
              <SelectItem value="value_below">Falls below (raw value)</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={thresholdValue}
            onChange={(e) => setThresholdValue(e.target.value)}
            placeholder={thresholdType === 'drop_pct' ? '50' : '10'}
            disabled={isCreating}
            aria-label="Threshold value"
            className="sm:w-32"
          />
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.example.com/..."
            disabled={isCreating}
            aria-label="Webhook URL"
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
            {alerts.map((alert) => (
              <li key={alert._id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{alert.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {METRIC_LABELS[alert.metric]}{' '}
                    {alert.thresholdType === 'drop_pct'
                      ? `drops ≥ ${alert.thresholdValue}%`
                      : `< ${alert.thresholdValue}`}
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
            ))}
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
