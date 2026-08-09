import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnalyticsData } from '@/types/analytics';

interface MetricsGridProps {
  analyticsData: AnalyticsData;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ analyticsData }) => {
  const metrics = [
    {
      title: 'Page Views',
      value: analyticsData.pageViews.total.toLocaleString(),
      change: analyticsData.pageViews.change,
    },
    {
      title: 'Unique Users',
      value: analyticsData.uniqueUsers.total.toLocaleString(),
      change: analyticsData.uniqueUsers.change,
    },
    {
      title: 'Bounce Rate',
      value: `${analyticsData.bounceRate.total}%`,
      change: analyticsData.bounceRate.change,
      invertChange: true,
    },
    {
      title: 'Avg. Duration',
      value: `${Math.floor(analyticsData.avgSessionDuration.total / 60)}m ${analyticsData.avgSessionDuration.total % 60}s`,
      change: analyticsData.avgSessionDuration.change,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => {
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
            </div>

            <div className="flex items-baseline justify-between">
              <span className="font-display text-xl font-semibold text-foreground tabular-nums">
                {metric.value}
              </span>

              <Badge
                variant={isNeutral ? "secondary" : isPositive ? "default" : "destructive"}
                className={`tabular-nums ${
                  isPositive ? 'bg-success/10 text-success hover:bg-success/10 border-none shadow-none' : ''
                }`}
              >
                <span>{isPositive && metric.change > 0 ? '+' : ''}{metric.change}%</span>
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
