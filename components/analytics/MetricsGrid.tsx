import React from 'react';
import { Card } from '@/components/ui/card';
import { AnalyticsData } from '@/types/analytics';
import {
  UsersIcon,
  EyeIcon,
  ClockIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  MinusIcon,
} from '@phosphor-icons/react';

interface MetricsGridProps {
  analyticsData: AnalyticsData;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ analyticsData }) => {
  const metrics = [
    {
      title: 'Page Views',
      value: analyticsData.pageViews.total.toLocaleString(),
      change: analyticsData.pageViews.change,
      icon: EyeIcon,
    },
    {
      title: 'Unique Users',
      value: analyticsData.uniqueUsers.total.toLocaleString(),
      change: analyticsData.uniqueUsers.change,
      icon: UsersIcon,
    },
    {
      title: 'Bounce Rate',
      value: `${analyticsData.bounceRate.total}%`,
      change: analyticsData.bounceRate.change,
      icon: ArrowUpRightIcon,
      invertChange: true,
    },
    {
      title: 'Avg. Duration',
      value: `${Math.floor(analyticsData.avgSessionDuration.total / 60)}m ${analyticsData.avgSessionDuration.total % 60}s`,
      change: analyticsData.avgSessionDuration.change,
      icon: ClockIcon,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => {
        const IconComponent = metric.icon;
        const isPositive = metric.invertChange ? metric.change < 0 : metric.change > 0;
        const isNeutral = metric.change === 0;

        return (
          <Card
            key={metric.title}
            className="p-4 flex flex-col justify-between gap-3 animate-fade-in"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="label-eyebrow text-muted-foreground">
                {metric.title}
              </span>
              <span className="icon-chip size-6 rounded-md">
                <IconComponent size={14} weight="bold" />
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="font-display text-xl font-semibold text-foreground tabular-nums">
                {metric.value}
              </span>

              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full tabular-nums ${
                  isNeutral
                    ? 'bg-surface-secondary text-muted-foreground'
                    : isPositive
                    ? 'bg-success/10 text-success'
                    : 'bg-danger/10 text-danger'
                }`}
              >
                {isNeutral ? (
                  <MinusIcon size={12} />
                ) : isPositive ? (
                  <ArrowUpRightIcon size={12} />
                ) : (
                  <ArrowDownRightIcon size={12} />
                )}
                {Math.abs(metric.change)}%
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
