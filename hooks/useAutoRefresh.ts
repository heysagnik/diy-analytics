import { useState, useEffect, useRef } from "react";

interface UseAutoRefreshProps {
  initialState?: boolean;
  initialInterval?: number;
  onRefresh: () => Promise<void>;
}

export function useAutoRefresh({
  initialState = true,
  initialInterval = 30,
  onRefresh
}: UseAutoRefreshProps) {
  const [autoRefresh, setAutoRefresh] = useState(initialState);
  const [refreshInterval, setRefreshInterval] = useState(initialInterval); // seconds
  const [refreshTimer, setRefreshTimer] = useState<number>(refreshInterval);
  
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimerCountdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing timers
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    if (refreshTimerCountdownRef.current) {
      clearInterval(refreshTimerCountdownRef.current);
    }
    
    // Reset refresh timer
    setRefreshTimer(refreshInterval);
    
    // Set up new timers if auto-refresh is enabled
    if (autoRefresh) {
      // The main timer to refresh data
      refreshTimerRef.current = setTimeout(() => {
        onRefresh(); // Don't show loading state for auto-refresh
      }, refreshInterval * 1000);
      
      // Countdown timer (updates every second)
      refreshTimerCountdownRef.current = setInterval(() => {
        setRefreshTimer(prev => {
          if (prev <= 1) {
            return refreshInterval;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    // Cleanup function
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (refreshTimerCountdownRef.current) {
        clearInterval(refreshTimerCountdownRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, onRefresh]);
  
  return {
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    refreshTimer
  };
} 