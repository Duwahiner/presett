import type { ReactNode } from "react";

export type BadgeVariant = "success" | "warning" | "error" | "info";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  pulsing?: boolean;
  className?: string;
}
