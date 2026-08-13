export const MAX_ANALYTICS_QUERY_ROWS = 200_000;

export function assertRowsWithinLimit(rowCount: number, context: string): void {
  if (rowCount > MAX_ANALYTICS_QUERY_ROWS) {
    throw new Error(
      `${context} window is too large (${rowCount} rows, limit ${MAX_ANALYTICS_QUERY_ROWS}). Narrow the date range and try again.`,
    );
  }
}
