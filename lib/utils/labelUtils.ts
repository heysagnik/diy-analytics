import type { DateRange } from "../../types/analytics";

export interface GeneratedLabels {
  labels: string[];
  hourlyLabels: string[];
  dailyLabels: string[];
  weeklyLabels: string[];
  months: string[];
}

export function generateLabels(dateRange: DateRange): GeneratedLabels {
  const now = new Date();
  
  const generateHourlyLabels = (): string[] => {
    const labels: string[] = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(d.getHours() - i);
      labels.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
    return labels;
  };

  const generateDailyLabels = (): string[] => {
    const labels: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
    }
    return labels;
  };

  const generateWeeklyLabels = (): string[] => {
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString([], { weekday: 'short' }));
    }
    return labels;
  };

  const generateMonthlyLabels = (): string[] => {
    const labels: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      labels.push(d.toLocaleDateString([], { year: '2-digit', month: 'short' }));
    }
    return labels;
  };

  const generateMainLabels = (range: DateRange): string[] => {
    const labels: string[] = [];
    
    switch (range) {
      case 'Last Hour': {
        for (let i = 59; i >= 0; i--) {
          const d = new Date(now);
          d.setMinutes(d.getMinutes() - i);
          labels.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
        }
        break;
      }
      case 'Last 24 hours': {
        for (let i = 23; i >= 0; i--) {
          const d = new Date(now);
          d.setHours(d.getHours() - i);
          labels.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
        }
        break;
      }
      case 'Last 7 days': {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          labels.push(d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
        }
        break;
      }
      case 'Last 30 days': {
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          labels.push(d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
        }
        break;
      }
      case 'Last 6 months': {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now);
          d.setMonth(d.getMonth() - i);
          labels.push(d.toLocaleDateString([], { year: '2-digit', month: 'short' }));
        }
        break;
      }
      case 'Last 12 months': {
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now);
          d.setMonth(d.getMonth() - i);
          labels.push(d.toLocaleDateString([], { year: '2-digit', month: 'short' }));
        }
        break;
      }
      default: {
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          labels.push(d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
        }
      }
    }
    
    return labels;
  };

  return {
    labels: generateMainLabels(dateRange),
    hourlyLabels: generateHourlyLabels(),
    dailyLabels: generateDailyLabels(),
    weeklyLabels: generateWeeklyLabels(),
    months: generateMonthlyLabels(),
  };
} 