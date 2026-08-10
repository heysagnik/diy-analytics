'use client';

import { FunnelIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { use, useCallback, useEffect, useState } from 'react';
import { FunnelChart, type FunnelStepResult } from '@/components/analytics/FunnelChart';
import ProjectPageShell from '@/components/project/ProjectPageShell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/useToast';

interface FunnelStep {
  type: 'page' | 'event';
  matchValue: string;
  label: string;
}

interface EditableFunnelStep extends FunnelStep {
  clientId: string;
}

interface FunnelSummary {
  _id: string;
  name: string;
  steps: FunnelStep[];
}

const DATE_RANGE_OPTIONS = [
  { value: 'LAST_7_DAYS', label: 'Last 7 days' },
  { value: 'LAST_30_DAYS', label: 'Last 30 days' },
  { value: 'LAST_6_MONTHS', label: 'Last 6 months' },
] as const;

type FunnelDateRange = (typeof DATE_RANGE_OPTIONS)[number]['value'];
const FUNNEL_LOAD_ERROR = "We couldn't load the funnel analysis. Please try again.";

const emptyStep = (clientId = crypto.randomUUID()): EditableFunnelStep => ({
  clientId,
  type: 'page',
  matchValue: '',
  label: '',
});

function isFunnelDateRange(value: unknown): value is FunnelDateRange {
  return typeof value === 'string' && DATE_RANGE_OPTIONS.some((option) => option.value === value);
}

export default function FunnelsPage({
  params: promiseParams,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const params = use(promiseParams);
  const { projectId } = params;
  const { showToast } = useToast();

  const [funnels, setFunnels] = useState<FunnelSummary[]>([]);
  const [loadingFunnels, setLoadingFunnels] = useState(true);
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('');
  const [dateRange, setDateRange] = useState<FunnelDateRange>('LAST_30_DAYS');
  const [analysis, setAnalysis] = useState<{ name: string; steps: FunnelStepResult[] } | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<EditableFunnelStep[]>([emptyStep('step-1'), emptyStep('step-2')]);
  const [isCreating, setIsCreating] = useState(false);
  const [funnelToDelete, setFunnelToDelete] = useState<FunnelSummary | null>(null);

  const loadFunnels = useCallback(() => {
    if (!projectId) return;
    setLoadingFunnels(true);
    fetch(`/api/projects/${projectId}/funnels`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setFunnels(list);
        setSelectedFunnelId((prev) => (list.some((f) => f._id === prev) ? prev : list[0]?._id || ''));
      })
      .catch(() => setError('Failed to load funnels.'))
      .finally(() => setLoadingFunnels(false));
  }, [projectId]);

  useEffect(() => {
    loadFunnels();
  }, [loadFunnels]);

  const fetchAnalysis = useCallback(async () => {
    if (!projectId || !selectedFunnelId) {
      setAnalysis(null);
      return;
    }
    setLoadingAnalysis(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/funnels/${selectedFunnelId}/analysis?dateRange=${dateRange}`,
        { cache: 'no-store' },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Error ${res.status}`);
      }
      const result = await res.json();
      setAnalysis(result.data);
    } catch (e) {
      console.error('Failed to load funnel analysis:', e);
      setError(FUNNEL_LOAD_ERROR);
    } finally {
      setLoadingAnalysis(false);
    }
  }, [projectId, selectedFunnelId, dateRange]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const updateStep = (idx: number, patch: Partial<FunnelStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const addStep = () => setSteps((prev) => [...prev, emptyStep()]);
  const removeStep = (idx: number) => setSteps((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));

  const handleCreate = async () => {
    if (!projectId) return;
    if (!name.trim()) {
      showToast('error', 'Funnel name is required.');
      return;
    }
    if (steps.some((s) => !s.matchValue.trim() || !s.label.trim())) {
      showToast('error', 'Every step needs a label and a match value.');
      return;
    }
    if (steps.length > 10) {
      showToast('error', 'Funnels can contain at most 10 steps.');
      return;
    }

    const normalizedSteps = steps.map(({ type, label, matchValue }) => ({
      type,
      label: label.trim(),
      matchValue: matchValue.trim(),
    }));
    const duplicateStep = normalizedSteps.some(
      (step, index) =>
        normalizedSteps.findIndex(
          (candidate) =>
            candidate.type === step.type && candidate.matchValue.toLowerCase() === step.matchValue.toLowerCase(),
        ) !== index,
    );
    if (duplicateStep) {
      showToast('error', 'Each funnel step must use a unique page or event match.');
      return;
    }
    if (normalizedSteps.some((step) => step.type === 'page' && !step.matchValue.startsWith('/'))) {
      showToast('error', 'Page matches must begin with "/".');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/funnels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), steps: normalizedSteps }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create funnel.');
      }
      const funnel = await response.json();
      setFunnels((prev) => [funnel, ...prev]);
      setSelectedFunnelId(funnel._id);
      setName('');
      setSteps([emptyStep('step-1'), emptyStep('step-2')]);
      setShowBuilder(false);
      showToast('success', 'Funnel created.');
    } catch (error: unknown) {
      console.error('Failed to create funnel:', error);
      showToast('error', 'Failed to create funnel. Please check the details and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (funnelId: string) => {
    if (!projectId) return;
    const prev = funnels;
    setFunnels((f) => f.filter((x) => x._id !== funnelId));
    try {
      const response = await fetch(`/api/projects/${projectId}/funnels/${funnelId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete funnel.');
      showToast('success', 'Funnel deleted.');
      if (selectedFunnelId === funnelId) setSelectedFunnelId(prev.find((f) => f._id !== funnelId)?._id || '');
    } catch {
      setFunnels(prev);
      showToast('error', 'Failed to delete funnel.');
    }
  };

  if (loadingFunnels) {
    return (
      <ProjectPageShell>
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </ProjectPageShell>
    );
  }

  return (
    <ProjectPageShell
      eyebrow="Conversion"
      title="Funnels"
      description="Step-by-step conversion and drop-off across a sequence of pages or events."
      actions={
        <div className="flex gap-2">
          {funnels.length > 0 && (
            <>
              <Select
                value={selectedFunnelId}
                onValueChange={(v: unknown) => {
                  if (typeof v === 'string' && funnels.some((funnel) => funnel._id === v)) setSelectedFunnelId(v);
                }}
              >
                <SelectTrigger aria-label="Select funnel">
                  <SelectValue>{(v: string) => funnels.find((f) => f._id === v)?.name || v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {funnels.map((f) => (
                    <SelectItem key={f._id} value={f._id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dateRange}
                onValueChange={(v: unknown) => {
                  if (isFunnelDateRange(v)) setDateRange(v);
                }}
              >
                <SelectTrigger aria-label="Date range">
                  <SelectValue>{(v: string) => DATE_RANGE_OPTIONS.find((o) => o.value === v)?.label || v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <Button size="sm" onClick={() => setShowBuilder((v) => !v)}>
            <PlusIcon size={14} />
            <span>{showBuilder ? 'Close' : 'New Funnel'}</span>
          </Button>
        </div>
      }
    >
      {showBuilder && (
        <Card className="p-4 flex flex-col gap-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Funnel name (e.g. Checkout)"
            disabled={isCreating}
            aria-label="Funnel name"
          />

          <div className="flex flex-col gap-2">
            {steps.map((step, idx) => (
              <div key={step.clientId} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <span className="text-xs text-muted-foreground w-14 shrink-0">Step {idx + 1}</span>
                <Select
                  value={step.type}
                  onValueChange={(v: unknown) => {
                    if (v === 'page' || v === 'event') updateStep(idx, { type: v });
                  }}
                  disabled={isCreating}
                >
                  <SelectTrigger aria-label={`Step ${idx + 1} type`}>
                    <SelectValue>{(v: 'page' | 'event') => (v === 'page' ? 'Page visit' : 'Custom event')}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="page">Page visit</SelectItem>
                    <SelectItem value="event">Custom event</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={step.label}
                  onChange={(e) => updateStep(idx, { label: e.target.value })}
                  placeholder="Step label"
                  disabled={isCreating}
                  aria-label={`Step ${idx + 1} label`}
                  className="sm:flex-1"
                />
                <Input
                  value={step.matchValue}
                  onChange={(e) => updateStep(idx, { matchValue: e.target.value })}
                  placeholder={step.type === 'page' ? '/checkout' : 'checkout_started'}
                  disabled={isCreating}
                  aria-label={`Step ${idx + 1} match value`}
                  className="sm:flex-1"
                />
                {steps.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(idx)}
                    disabled={isCreating}
                    aria-label={`Remove step ${idx + 1}`}
                  >
                    <TrashIcon size={14} className="text-danger" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={addStep} disabled={isCreating || steps.length >= 10}>
              <PlusIcon size={14} />
              <span>Add step</span>
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={isCreating}>
              <PlusIcon size={14} />
              <span>Create funnel</span>
            </Button>
          </div>
        </Card>
      )}

      {funnels.length === 0 ? (
        <Empty className="rounded-xl border border-border bg-card py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FunnelIcon size={32} className="text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle className="text-sm font-medium text-foreground">No funnels yet</EmptyTitle>
            <EmptyDescription className="text-xs max-w-sm">
              Create a funnel to see step-by-step conversion and drop-off.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {loadingAnalysis ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : analysis ? (
            <Card className="p-5">
              <FunnelChart steps={analysis.steps} />
            </Card>
          ) : null}

          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {funnels.map((funnel) => (
              <li key={funnel._id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedFunnelId(funnel._id)}
                  className={`min-w-0 text-left flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${funnel._id === selectedFunnelId ? '' : 'opacity-70'}`}
                >
                  <p className="text-sm font-medium text-foreground truncate">{funnel.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {funnel.steps.map((s) => s.label).join(' → ')}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFunnelToDelete(funnel)}
                  aria-label={`Delete funnel ${funnel.name}`}
                >
                  <TrashIcon size={14} className="text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Dialog
        open={funnelToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFunnelToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete funnel?</DialogTitle>
            <DialogDescription>
              {funnelToDelete
                ? `“${funnelToDelete.name}” will be permanently deleted. This action cannot be undone.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFunnelToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!funnelToDelete) return;
                void handleDelete(funnelToDelete._id);
                setFunnelToDelete(null);
              }}
            >
              Delete funnel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProjectPageShell>
  );
}
