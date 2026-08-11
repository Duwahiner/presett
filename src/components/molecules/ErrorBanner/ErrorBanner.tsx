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

const config: Record<BannerVariant, { icon: typeof AlertCircle; container: string; iconColor: string; titleColor: string; textColor: string }> = {
  error: {
    icon: AlertCircle,
    container: "border-red-500/20 border-l-red-500 bg-red-500/10 text-red-100",
    iconColor: "text-red-400",
    titleColor: "text-red-100",
    textColor: "text-red-200/80",
  },
  warning: {
    icon: AlertTriangle,
    container: "border-amber-500/20 border-l-amber-500 bg-amber-500/10 text-amber-100",
    iconColor: "text-amber-400",
    titleColor: "text-amber-100",
    textColor: "text-amber-200/80",
  },
  info: {
    icon: Info,
    container: "border-sky-500/20 border-l-sky-500 bg-sky-500/10 text-sky-100",
    iconColor: "text-sky-400",
    titleColor: "text-sky-100",
    textColor: "text-sky-200/80",
  },
  success: {
    icon: CheckCircle2,
    container: "border-emerald-500/20 border-l-emerald-500 bg-emerald-500/10 text-emerald-100",
    iconColor: "text-emerald-400",
    titleColor: "text-emerald-100",
    textColor: "text-emerald-200/80",
  },
};

export function ErrorBanner({ title = "Error", message, variant = "error", className }: ErrorBannerProps) {
  const { icon: Icon, container, iconColor, titleColor, textColor } = config[variant];

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
        <h4 className={cn("font-semibold", titleColor)}>{title}</h4>
        <p className={cn("text-sm", textColor)}>{message}</p>
      </div>
    </div>
  );
}
