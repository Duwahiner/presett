"use client";

import { useEffect, useState } from "react";
import { getUsageStats } from "@/services/usageStatsApiService";
import type { DaysFilter, UsageStatsData } from "@/services/usageStatsService";
import { UsageStatsClientView } from "./usageStatsClient.view";

const INITIAL_DAYS: DaysFilter = 7;

export function UsageStatsClient() {
  const [days, setDays] = useState<DaysFilter>(INITIAL_DAYS);
  const [project, setProject] = useState("");
  const [data, setData] = useState<UsageStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const opts = { days, ...(project.trim() ? { project: project.trim() } : {}) };
        const result = await getUsageStats(opts);
        if (!cancelled) setData(result);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [days, project, reloadToken]);

  function handleDaysChange(next: DaysFilter) {
    if (next === days) return;
    setDays(next);
  }

  function handleProjectApply(value: string) {
    if (value === project) return;
    setProject(value);
  }

  function handleRetry() {
    setReloadToken((token) => token + 1);
  }

  return (
    <UsageStatsClientView
      data={data}
      loading={loading}
      error={error}
      days={days}
      project={project}
      onDaysChange={handleDaysChange}
      onProjectApply={handleProjectApply}
      onRetry={handleRetry}
    />
  );
}
