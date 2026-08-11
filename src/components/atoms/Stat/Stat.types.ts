import type { ComponentType } from "react";

export interface StatTrend {
  value: string;
  positive: boolean;
}

export interface StatProps {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  trend?: StatTrend;
  className?: string;
}
