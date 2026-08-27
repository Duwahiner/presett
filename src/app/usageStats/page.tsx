"use client";

import { BarChart2 } from "lucide-react";
import { Badge } from "@/components/atoms/Badge/Badge";
import { UsageStatsClient } from "@/components/organisms/usageStatsClient/usageStatsClient";
import { t } from "@/resources/resources";

export const dynamic = "force-dynamic";

export default function UsageStatsPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Fixed page header (never scrolls) */}
      <div className="px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary/15">
            <BarChart2 className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-card-foreground">
                {t("usage_stats_title")}
              </h1>
              <Badge variant="info" pulsing>
                {t("usage_stats_status_badge")}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("usage_stats_header_description")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6 scrollbar-brutal">
        <div className="flex h-full flex-col border border-border bg-card p-6 shadow-[4px_4px_0_0_var(--border)]">
          <UsageStatsClient />
        </div>
      </div>
    </div>
  );
}
