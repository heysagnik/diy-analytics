import { useSyncExternalStore } from 'react';

const COMPACT_CHART_QUERY = '(max-width: 639px)';

function subscribe(onChange: () => void) {
  const mediaQuery = window.matchMedia(COMPACT_CHART_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.matchMedia(COMPACT_CHART_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useCompactChart() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
