"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { BarChart2, ChevronDown, History, Package, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";
import { t } from "@/resources/resources";
import { formatDate, shortenSessionId } from "@/utils/formatting";
import type {
  DaysFilter,
  ProviderUsage,
  RecentSession,
  UsageStatsData,
} from "@/services/usageStatsService";
import type { UsageStatsClientViewProps } from "./usageStatsClient.types";
import { SectionSpinner } from "@/components/ui/spinner";
import { FloatingLoadingIndicator } from "@/components/molecules/FloatingLoadingIndicator/FloatingLoadingIndicator";

const DAY_OPTIONS: Array<{
  value: DaysFilter;
  labelKey: "usage_stats_range_7d" | "usage_stats_range_30d" | "usage_stats_range_all";
}> = [
  { value: 7, labelKey: "usage_stats_range_7d" },
  { value: 30, labelKey: "usage_stats_range_30d" },
  { value: 0, labelKey: "usage_stats_range_all" },
];

function formatCost(costUsd: number | null): string {
  if (costUsd === null) return t("usage_stats_costUnavailable");
  return `$${costUsd.toFixed(2)}`;
}

function formatTokens(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function computeSummaryCost(data: UsageStatsData): string {
  const { providers } = data;
  if (providers.length > 0 && providers.every((p) => p.totalCostUsd === null)) {
    return t("usage_stats_costUnavailable");
  }
  const total = providers.reduce((sum, p) => sum + (p.totalCostUsd ?? 0), 0);
  return `$${total.toFixed(2)}`;
}

function computeSummaryTokens(data: UsageStatsData): string {
  const total = data.providers.reduce(
    (sum, p) => sum + p.totalInputTokens + p.totalOutputTokens,
    0,
  );
  return formatTokens(total);
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-card p-3">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-bold text-card-foreground">{value}</p>
    </div>
  );
}

function ProviderCard({ provider }: { provider: ProviderUsage }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  return (
    <article
      data-testid={`usageStatsProvider-${provider.provider}`}
      className="border border-border bg-card shadow-[4px_4px_0_0_var(--border)]"
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={t("usage_stats_provider_expand_aria", { provider: provider.provider })}
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full cursor-pointer items-center gap-4 p-4 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary/15">
          <BarChart2 className="h-4 w-4 text-primary" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-sm font-bold uppercase tracking-wide text-card-foreground">
            {provider.provider}
          </span>
          <span className="mt-2 flex items-center gap-2">
            <span className="h-2 flex-1 bg-muted" aria-hidden="true">
              <span
                className="block h-full bg-primary"
                style={{ width: `${provider.sharePercent}%` }}
              />
            </span>
            <span className="font-mono text-xs text-muted-foreground">{provider.sharePercent}%</span>
          </span>
        </span>
        <span className="text-right font-mono text-sm font-bold text-card-foreground">
          {formatCost(provider.totalCostUsd)}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div id={panelId} role="region" aria-label={provider.provider}>
          <div className="overflow-x-auto border-t border-border p-4 scrollbar-brutal">
            <table className="w-full text-sm">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="py-1 text-left font-bold">{t("usage_stats_model")}</th>
                <th className="py-1 text-right font-bold">{t("usage_stats_tokensIn")}</th>
                <th className="py-1 text-right font-bold">{t("usage_stats_tokensOut")}</th>
                <th className="py-1 text-right font-bold">{t("usage_stats_summary_cost")}</th>
                <th className="py-1 text-right font-bold">{t("usage_stats_messages")}</th>
              </tr>
            </thead>
            <tbody>
              {provider.models.map((model) => (
                <tr key={model.model} className="border-t border-border">
                  <td className="py-1 font-mono text-xs text-card-foreground">{model.model}</td>
                  <td className="py-1 text-right font-mono text-xs text-muted-foreground">
                    {formatTokens(model.inputTokens)}
                  </td>
                  <td className="py-1 text-right font-mono text-xs text-muted-foreground">
                    {formatTokens(model.outputTokens)}
                  </td>
                  <td className="py-1 text-right font-mono text-xs text-muted-foreground">
                    {formatCost(model.costUsd)}
                  </td>
                  <td className="py-1 text-right font-mono text-xs text-muted-foreground">
                    {model.messages}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </article>
  );
}

function SessionCard({ session }: { session: RecentSession }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  // Sensible fallback for a missing/blank title: show the short id alongside a
  // generic label so the card never renders an empty heading.
  const displayTitle =
    session.title !== null && session.title.trim().length > 0
      ? session.title.trim()
      : t("usage_stats_session_untitled");
  const shortId = shortenSessionId(session.sessionId);

  return (
    <article
      data-testid={`usageStatsSession-${session.sessionId}`}
      className="border border-border bg-card shadow-[4px_4px_0_0_var(--border)]"
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={t("usage_stats_session_expand_aria", { id: session.sessionId })}
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full cursor-pointer items-center gap-4 p-4 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary/15">
          <History className="h-4 w-4 text-primary" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-sm font-bold text-card-foreground">
            {displayTitle} · {shortId}
          </span>
          <span className="block truncate font-mono text-xs text-muted-foreground">
            {session.projectPath ?? "—"}
          </span>
        </span>
        <span className="text-right font-mono text-xs text-muted-foreground">
          {formatDate(session.lastUpdatedAt)}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div id={panelId} role="region" aria-label={session.sessionId}>
          <dl className="grid gap-x-6 gap-y-3 border-t border-border p-4 sm:grid-cols-2 sm:gap-x-10">
          <div className="flex justify-between gap-3">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("usage_stats_session_project")}
            </dt>
            <dd className="text-right font-mono text-xs text-card-foreground">
              {session.projectPath ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("usage_stats_session_updated")}
            </dt>
            <dd className="text-right font-mono text-xs text-card-foreground">
              {formatDate(session.lastUpdatedAt)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("usage_stats_messages")}
            </dt>
            <dd className="text-right font-mono text-xs text-card-foreground">{session.messageCount}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("usage_stats_session_providers")}
            </dt>
            <dd className="text-right font-mono text-xs text-card-foreground">
              {session.providers.join(", ") || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("usage_stats_summary_cost")}
            </dt>
            <dd className="text-right font-mono text-xs text-card-foreground">
              {formatCost(session.totalCostUsd)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("usage_stats_tokensIn")}
            </dt>
            <dd className="text-right font-mono text-xs text-card-foreground">
              {formatTokens(session.totalInputTokens)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("usage_stats_tokensOut")}
            </dt>
            <dd className="text-right font-mono text-xs text-card-foreground">
              {formatTokens(session.totalOutputTokens)}
            </dd>
          </div>
          </dl>
        </div>
      )}
    </article>
  );
}

export function UsageStatsClientView({
  data,
  loading,
  error,
  days,
  project,
  onDaysChange,
  onProjectApply,
  onRetry,
}: UsageStatsClientViewProps) {
  const projectInputRef = useRef<HTMLInputElement>(null);

  const hasData = data !== null && (data.providers.length > 0 || data.recentSessions.length > 0);

  function handleProjectSubmit(event: FormEvent) {
    event.preventDefault();
    onProjectApply(projectInputRef.current?.value.trim() ?? "");
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      {loading && data !== null && <FloatingLoadingIndicator label={t("loading_background")} />}
      {/* Fixed: filters + summary (never scroll) */}
      <div className="shrink-0 space-y-4">
        <div className="flex flex-wrap items-end gap-6 border border-border bg-card p-4 shadow-[4px_4px_0_0_var(--border)]">
          <fieldset>
            <legend className="mb-2 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("usage_stats_filter_range")}
            </legend>
            <div className="flex border border-border">
              {DAY_OPTIONS.map((option) => {
                const active = days === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onDaysChange(option.value)}
                    className={cn(
                      "cursor-pointer border-r border-border px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide transition-colors last:border-r-0",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <form onSubmit={handleProjectSubmit} className="flex items-end gap-2">
            <div>
              <label
                htmlFor="usage-stats-project"
                className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                {t("usage_stats_filter_project")}
              </label>
              <input
                id="usage-stats-project"
                ref={projectInputRef}
                type="text"
                defaultValue={project}
                placeholder={t("usage_stats_project_placeholder")}
                className="h-9 w-64 border border-border bg-card px-3 font-mono text-sm text-card-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary"
              />
            </div>
            <button
              type="submit"
              aria-label={t("usage_stats_project_apply_aria")}
              className="flex h-9 cursor-pointer items-center gap-2 border border-border bg-primary px-3 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none"
            >
              {t("usage_stats_project_apply")}
            </button>
          </form>
        </div>

        {hasData && (
          <div
            data-testid="usageStatsSummary"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <SummaryStat
              label={t("usage_stats_summary_providers")}
              value={String(data.providers.length)}
            />
            <SummaryStat
              label={t("usage_stats_summary_sessions")}
              value={String(data.totalSessions)}
            />
            <SummaryStat label={t("usage_stats_summary_cost")} value={computeSummaryCost(data)} />
            <SummaryStat label={t("usage_stats_summary_tokens")} value={computeSummaryTokens(data)} />
          </div>
        )}
      </div>

      {/* Exactly ONE shared scroll region for providers + sessions */}
      <div
        data-testid="usageStatsScroll"
        className="min-h-0 flex-1 overflow-y-auto pr-4 scrollbar-brutal"
      >
{loading && data === null ? (
          <SectionSpinner label={t("loading_section")} />
        ) : error ? (
          <div className="flex flex-col items-center gap-4 border border-border bg-card p-8">
            <ErrorBanner title={t("usage_stats_loadError")} message={error} className="w-full" />
            <button
              type="button"
              onClick={onRetry}
              className="flex cursor-pointer items-center gap-2 border border-border bg-primary px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              {t("usage_stats_retry")}
            </button>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center border border-border bg-card p-8 text-center">
            <Package className="size-10 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-3 font-mono text-sm font-bold uppercase text-card-foreground">
              {t("usage_stats_empty_title")}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("usage_stats_empty_desc")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <section aria-labelledby="usage-stats-providers-title">
              <h2
                id="usage-stats-providers-title"
                className="mb-3 font-mono text-sm font-bold uppercase tracking-wider text-card-foreground"
              >
                {t("usage_stats_provider")} ({data.providers.length})
              </h2>
              <div className="space-y-4">
                {data.providers.map((provider) => (
                  <ProviderCard key={provider.provider} provider={provider} />
                ))}
              </div>
            </section>
            <section aria-labelledby="usage-stats-sessions-title">
              <h2
                id="usage-stats-sessions-title"
                className="mb-3 font-mono text-sm font-bold uppercase tracking-wider text-card-foreground"
              >
                {t("usage_stats_sessions_title")}
              </h2>
              <div className="space-y-4">
                {data.recentSessions.map((session) => (
                  <SessionCard key={session.sessionId} session={session} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
