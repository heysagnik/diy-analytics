import { useCallback, useSyncExternalStore } from 'react';

/**
 * SSR-safe media query hook. `defaultValue` is what the server (and the
 * first client render, before hydration corrects it) assumes — pick
 * whichever layout should never flash for the common case.
 */
export const useMediaQuery = (query: string, defaultValue = false): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
