export type ChartGranularity = 'minute' | 'hour' | 'day' | 'week' | 'month';

/**
 * Axis/tooltip labels arrive pre-formatted per granularity (e.g. "Aug 4",
 * "Week of Aug 4", "14", "14:32") by generateTimeLabels on the server —
 * re-parsing them with `new Date()` only works for the 'day' shape and
 * silently falls back to the raw string for week/hour/minute, which is why
 * a 26-point "Last 6 months" chart used to show the full "Week of Aug 4" on
 * every tick. Formatting per granularity directly avoids that reparse.
 */
export function formatAxisLabel(label: string, granularity: ChartGranularity, compact: boolean): string {
  switch (granularity) {
    case 'week':
      return compact ? label.replace(/^Week of /, '') : label;
    case 'month':
      return compact ? label.split(' ')[0] : label;
    case 'day': {
      if (!compact) return label;
      const date = new Date(label);
      if (Number.isNaN(date.getTime())) return label;
      const diffDays = Math.abs((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < 7 ? date.toLocaleDateString('en-US', { weekday: 'short' }) : label;
    }
    default:
      return label;
  }
}

export function formatTooltipLabel(label: string, granularity: ChartGranularity): string {
  return granularity === 'hour' ? `${label}:00` : label;
}
