"use client";

import { cn } from "@/lib/utils";

export interface ErrorBannerProps {
  title?: string;
  message: string;
  className?: string;
}

export function ErrorBanner({ title = "Error", message, className }: ErrorBannerProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-red-900 bg-red-950 p-4 text-red-100",
        className,
      )}
      role="alert"
    >
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm">{message}</p>
    </div>
  );
}
