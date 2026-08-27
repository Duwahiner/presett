import { get } from "./api";
import type { UsageStatsData, UsageStatsOptions } from "@/services/usageStatsService";

/**
 * Client-side fetch wrapper for the `/api/usageStats` endpoint.
 * Builds the query string from the validated options and delegates to the
 * shared axios wrapper so error extraction stays consistent with the app.
 */
export async function getUsageStats(opts: UsageStatsOptions): Promise<UsageStatsData> {
  const params = new URLSearchParams({ days: String(opts.days) });
  if (opts.project !== undefined && opts.project.length > 0) {
    params.set("project", opts.project);
  }
  return get<UsageStatsData>(`/usageStats?${params.toString()}`);
}
