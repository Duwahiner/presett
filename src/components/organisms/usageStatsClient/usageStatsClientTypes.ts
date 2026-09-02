import type { DaysFilter, UsageStatsData } from "@/services/usageStatsService";

export interface UsageStatsClientViewProps {
  data: UsageStatsData | null;
  loading: boolean;
  error: string | null;
  days: DaysFilter;
  project: string;
  onDaysChange: (days: DaysFilter) => void;
  onProjectApply: (project: string) => void;
  onRetry: () => void;
}
