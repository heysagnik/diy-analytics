export type FilterDimension = 'country' | 'browser' | 'device' | 'source' | 'page' | 'utmSource' | 'utmMedium' | 'utmCampaign';

export interface ActiveFilter {
  dimension: FilterDimension;
  value: string;
}

const DIMENSION_LABELS: Record<FilterDimension, string> = {
  country: 'Country',
  browser: 'Browser',
  device: 'Device',
  source: 'Source',
  page: 'Page',
  utmSource: 'Campaign Source',
  utmMedium: 'Campaign Medium',
  utmCampaign: 'Campaign',
};

export function filterLabel(dimension: FilterDimension): string {
  return DIMENSION_LABELS[dimension];
}

/**
 * Collapse an ActiveFilter[] into the { country: string[], ... } shape the
 * analytics API and useAnalytics already accept.
 */
export function filtersToQuery(filters: ActiveFilter[]): Partial<Record<FilterDimension, string[]>> {
  const query: Partial<Record<FilterDimension, string[]>> = {};
  for (const f of filters) {
    (query[f.dimension] ??= []).push(f.value);
  }
  return query;
}
