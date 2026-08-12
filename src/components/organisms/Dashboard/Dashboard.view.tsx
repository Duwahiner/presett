"use client";

import Link from "next/link";
import {
  Cpu,
  Layers,
  Archive,
  Activity,
  ArrowRight,
  Check,
  CircleDashed,
  FolderClock,
  Plus,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/atoms/Stat/Stat";
import { t } from "@/resources/resources";
import type { DashboardProps, DashboardAgent } from "./Dashboard.types";

function formatAgentName(agentKey: string): { prefix: string; suffix: string } {
  const idx = agentKey.indexOf("-");
  if (idx === -1) return { prefix: "", suffix: agentKey };
  return {
    prefix: agentKey.slice(0, idx + 1),
    suffix: agentKey.slice(idx + 1),
  };
}

function getAgentPrefixColor(agentKey: string): string {
  if (agentKey.startsWith("gentle-")) return "text-chart-1";
  if (agentKey.startsWith("sdd-")) return "text-chart-4";
  if (agentKey.startsWith("jd-")) return "text-chart-5";
  return "text-muted-foreground";
}

function AgentTile({ agent }: { agent: DashboardAgent }) {
  const { prefix, suffix } = formatAgentName(agent.agentKey);
  const prefixColor = getAgentPrefixColor(agent.agentKey);
  const isConfigured = Boolean(agent.provider && agent.model && agent.variant);

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-foreground">
          {agent.agentKey.slice(0, 2).toUpperCase()}
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            isConfigured
              ? "bg-success/10 text-success"
              : "bg-warning/15 text-warning-foreground",
          )}
        >
          {isConfigured ? (
            <Check className="size-3" />
          ) : (
            <CircleDashed className="size-3" />
          )}
          {isConfigured ? t("dashboard_agent_configured") : t("dashboard_agent_partial")}
        </span>
      </div>

      <p className="mt-3 text-base font-medium text-foreground" aria-label={agent.agentKey}>
        {prefix && <span className={prefixColor}>{prefix}</span>}
        <span>{suffix}</span>
      </p>
      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
        {agent.provider}/{agent.model}/{agent.variant}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">1</span>{" "}
          {t("dashboard_agent_models")}
        </span>
        <span className="text-muted-foreground">
          {t("dashboard_agent_model_label")}:{" "}
          <span className="font-medium text-foreground">{agent.model}</span>
        </span>
      </div>
    </div>
  );
}

function AddAgentTile() {
  return (
    <Link href="/models" className="block">
      <div className="flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <Plus className="size-5" />
        </span>
        <span className="text-sm font-medium">{t("dashboard_agent_add")}</span>
      </div>
    </Link>
  );
}

interface QuickActionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  href: string;
}

function QuickAction({ icon: Icon, title, desc, href }: QuickActionProps) {
  return (
    <Link href={href} className="block">
      <Button
        variant="ghost"
        className="flex h-auto w-full items-center justify-start gap-3 rounded-xl border border-transparent p-2.5 text-left font-normal hover:border-border hover:bg-muted"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{desc}</span>
        </span>
        <ArrowRight className="size-4 text-muted-foreground" />
      </Button>
    </Link>
  );
}

export function DashboardView({ className, stats, agents }: DashboardProps) {
  return (
    <div className={cn("flex h-full flex-col gap-6 overflow-y-auto p-5 sm:p-7", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("workspace_overview")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground text-balance">
            {t("dashboard_title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link href="/backups" />}>
            <FolderClock className="size-4" />
            {t("dashboard_backups_action")}
          </Button>
          <Button render={<Link href="/profiles" />}>
            <Plus className="size-4" />
            {t("profiles_create_action")}
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label={t("dashboard_stat_models_label")}
          value={String(stats.modelCount)}
          icon={Cpu}
        />
        <Stat
          label={t("dashboard_stat_profiles_label")}
          value={String(stats.profileCount)}
          icon={Layers}
        />
        <Stat
          label={t("dashboard_stat_backups_label")}
          value={String(stats.backupCount)}
          icon={Archive}
        />
        <Stat
          label={t("dashboard_stat_system_label")}
          value={stats.lastSync}
          icon={Activity}
        />
      </section>

      <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="flex flex-col xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-medium text-foreground">{t("dashboard_agents_title")}</h2>
            <Button variant="ghost" size="sm" className="h-auto gap-1 px-0 py-0 text-xs font-medium text-primary hover:text-primary/80">
              {t("dashboard_agents_manage")}
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {agents.map((agent) => (
              <AgentTile key={agent.agentKey} agent={agent} />
            ))}
            <AddAgentTile />
          </div>
        </section>

        <section className="flex flex-col">
          <h2 className="mb-3 text-base font-medium text-foreground">{t("dashboard_quick_access_title")}</h2>
          <Card className="flex flex-col gap-2.5 p-3">
            <QuickAction
              icon={Cpu}
              title={t("quick_action_models_title")}
              desc={t("quick_action_models_desc")}
              href="/models"
            />
            <QuickAction
              icon={Settings2}
              title={t("quick_action_profiles_title")}
              desc={t("quick_action_profiles_desc")}
              href="/profiles"
            />
            <QuickAction
              icon={FolderClock}
              title={t("quick_action_backups_title")}
              desc={t("quick_action_backups_desc")}
              href="/backups"
            />

            <div className="mt-4 rounded-xl bg-accent p-4">
              <p className="text-sm font-medium text-accent-foreground">{t("tdd_strict_mode_title")}</p>
              <p className="mt-1 text-xs text-accent-foreground/80 text-pretty">
                {t("tdd_strict_mode_desc")}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-medium text-accent-foreground">
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
                {t("tdd_strict_mode_enabled")}
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
