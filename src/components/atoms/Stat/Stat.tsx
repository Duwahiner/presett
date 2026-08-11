import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { StatProps } from "./Stat.types";

export function Stat({ label, value, icon: Icon, trend, className }: StatProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-colors",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-card-foreground">
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
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}
