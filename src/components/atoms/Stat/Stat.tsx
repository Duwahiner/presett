import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { StatProps } from "./Stat.types";

export function Stat({ label, value, icon: Icon, trend, className, markerClassName }: StatProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border-2 border-border bg-card p-4 text-card-foreground transition-colors shadow-none",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className={cn("size-2 shrink-0", markerClassName ?? "bg-primary")} aria-hidden="true" />
              {label}
            </p>
            <p className="mt-2 truncate text-[26px] font-bold leading-none tracking-tight text-card-foreground">
              {value}
            </p>
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs font-medium">
              {trend.positive ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-success" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
              )}
              <span
                className={cn(
                  trend.positive ? "text-success" : "text-destructive",
                )}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <Icon className="sr-only" aria-hidden="true" />
      </div>
    </div>
  );
}
