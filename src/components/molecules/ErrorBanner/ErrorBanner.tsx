"use client";

import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type BannerVariant = "error" | "warning" | "info" | "success";

export interface ErrorBannerProps {
  title?: string;
  message: string;
  variant?: BannerVariant;
  className?: string;
}

const config: Record<
  BannerVariant,
  {
    icon: typeof AlertCircle;
    container: string;
    iconColor: string;
  }
> = {
  error: {
    icon: AlertCircle,
    container: "border-destructive/20 border-l-destructive bg-destructive/10",
    iconColor: "text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    container: "border-warning/20 border-l-warning bg-warning/10",
    iconColor: "text-warning",
  },
  info: {
    icon: Info,
    container: "border-info/20 border-l-info bg-info/10",
    iconColor: "text-info",
  },
  success: {
    icon: CheckCircle2,
    container: "border-success/20 border-l-success bg-success/10",
    iconColor: "text-success",
  },
};

export function ErrorBanner({
  title = "Error",
  message,
  variant = "error",
  className,
}: ErrorBannerProps) {
  const { icon: Icon, container, iconColor } = config[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-l-4 p-4",
        container,
        className,
      )}
      role="alert"
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconColor)} aria-hidden="true" />
      <div>
        <h4 className={cn("font-semibold", iconColor)}>{title}</h4>
        <p className="text-sm text-foreground/80">{message}</p>
      </div>
    </div>
  );
}
