import type React from 'react';
import { Card } from '@/components/ui/card';
import type { GoalConversionData } from '@/types/analytics';

interface GoalsPanelProps {
  goals: GoalConversionData[];
}

export const GoalsPanel: React.FC<GoalsPanelProps> = ({ goals }) => {
  if (!goals.length) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">Goals</h3>
      </div>

      <div className="divide-y divide-border">
        {goals.map((goal) => (
          <div key={goal.goalId} className="flex items-center justify-between gap-4 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{goal.name}</p>
              <p className="text-xs text-muted-foreground">
                {goal.conversions.toLocaleString()} of {goal.totalSessions.toLocaleString()} sessions
              </p>
            </div>
            <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">{goal.rate}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
