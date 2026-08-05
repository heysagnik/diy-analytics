import React, { useEffect, useState } from 'react';
import { Project } from '../../types/settings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PlusIcon, TrashIcon, TargetIcon } from '@phosphor-icons/react';
import { SettingsGroup } from './SettingsGroup';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Goal {
  _id: string;
  name: string;
  type: 'page' | 'event';
  matchValue: string;
}

interface GoalsSectionProps {
  project: Project;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const GoalsSection: React.FC<GoalsSectionProps> = ({ project, showToast }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState<'page' | 'event'>('page');
  const [matchValue, setMatchValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  useEffect(() => {
    if (!project?._id) return;
    let cancelled = false;
    fetch(`/api/projects/${project._id}/goals`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setGoals(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) showToast('error', 'Failed to load goals.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?._id]);

  const handleCreate = async () => {
    if (!project?._id) return;
    if (!name.trim() || !matchValue.trim()) {
      showToast('error', 'Goal name and match value are required.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/api/projects/${project._id}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, matchValue }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create goal.');
      }
      const goal = await response.json();
      setGoals((prev) => [goal, ...prev]);
      setName('');
      setMatchValue('');
      showToast('success', 'Goal created.');
    } catch (error: unknown) {
      console.error('Failed to create goal:', error);
      showToast('error', 'Failed to create goal. Please check the details and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!project?._id) return;
    const prev = goals;
    setGoals((g) => g.filter((x) => x._id !== goalId));
    try {
      const response = await fetch(`/api/projects/${project._id}/goals/${goalId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete goal.');
      showToast('success', 'Goal deleted.');
    } catch {
      setGoals(prev);
      showToast('error', 'Failed to delete goal.');
    }
  };

  return (
    <SettingsGroup title="Goals">
      <div className="flex flex-col gap-4 p-4 sm:px-5">
        <p className="text-xs text-muted-foreground">
          Track conversions when visitors reach a specific page or fire a custom event.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Goal name (e.g. Signup)"
            disabled={isCreating}
            aria-label="Goal name"
            className="sm:flex-1"
          />
          <Select value={type} onValueChange={(v: unknown) => {
            if (v === 'page' || v === 'event') setType(v);
          }} disabled={isCreating}>
            <SelectTrigger aria-label="Goal type">
              <SelectValue>{(v: 'page' | 'event') => (v === 'page' ? 'Page visit' : 'Custom event')}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page">Page visit</SelectItem>
              <SelectItem value="event">Custom event</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={matchValue}
            onChange={(e) => setMatchValue(e.target.value)}
            placeholder={type === 'page' ? '/thank-you' : 'signup_completed'}
            disabled={isCreating}
            aria-label="Match value"
            className="sm:flex-1"
          />
          <Button size="sm" onClick={handleCreate} disabled={isCreating}>
            <PlusIcon size={14} />
            <span>Add</span>
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading goals…</p>
        ) : goals.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <TargetIcon size={16} />
            <span>No goals defined yet.</span>
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {goals.map((goal) => (
              <li key={goal._id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{goal.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {goal.type === 'page' ? 'Page visit' : 'Event'} · {goal.matchValue}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGoalToDelete(goal)}
                  aria-label={`Delete goal ${goal.name}`}
                >
                  <TrashIcon size={14} className="text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Dialog open={goalToDelete !== null} onOpenChange={(open) => { if (!open) setGoalToDelete(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete goal?</DialogTitle>
              <DialogDescription>
                {goalToDelete ? `“${goalToDelete.name}” will be permanently deleted. Existing analytics data will not be changed.` : ''}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGoalToDelete(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!goalToDelete) return;
                  void handleDelete(goalToDelete._id);
                  setGoalToDelete(null);
                }}
              >
                Delete goal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SettingsGroup>
  );
};
