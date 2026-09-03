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
import { Stat } from "@/components/atoms/Stat/stat";
import { t } from "@/resources/resources";
import type { DashboardProps, DashboardAgent } from "./dashboardTypes";

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
    <div className="group flex min-h-[188px] flex-col border border-border bg-card p-5 shadow-[4px_4px_0_0_var(--foreground)] transition-colors light:border-black light:bg-white light:shadow-[4px_4px_0_0_#000000]">
      <div className="flex items-start justify-between">
        <div className="flex size-12 items-center justify-center bg-muted font-mono text-base font-bold text-foreground light:bg-gray-100">
          {agent.agentKey.slice(0, 2).toUpperCase()}
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 border bg-transparent px-2.5 py-1 font-mono text-[11px] font-bold uppercase",
            isConfigured
              ? "border-accent text-accent light:!border-black light:!bg-white light:!text-black"
              : "border-warning text-warning light:!border-black light:!bg-white light:!text-black",
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

      <p className="mt-4 text-lg font-bold tracking-tight text-foreground light:text-black" aria-label={agent.agentKey}>
        {prefix && <span className={`${prefixColor} light:text-pink-600`}>{prefix}</span>}
        <span>{suffix}</span>
      </p>
      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground light:text-gray-600">
        {agent.provider}/{agent.model}/{agent.variant}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs light:border-black">
        <span className="text-muted-foreground light:text-gray-600">
          <span className="font-semibold text-foreground light:text-black">1</span>{" "}
          {t("dashboard_agent_models")}
        </span>
        <span className="text-muted-foreground light:text-gray-600">
          {t("dashboard_agent_model_label")}:{" "}
          <span className="font-medium text-foreground light:text-black">{agent.model}</span>
        </span>
      </div>
    </div>
  );
}

function AddAgentTile() {
  return (
    <Link href="/models" className="block">
      <div className="flex min-h-[188px] flex-col items-center justify-center gap-2 border border-dashed border-border bg-card p-5 text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
        <span className="flex size-12 items-center justify-center bg-muted">
          <Plus className="size-5" />
        </span>
        <span className="font-mono text-xs font-bold uppercase">{t("dashboard_agent_add")}</span>
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
         className="flex h-auto w-full items-center justify-start gap-3 border border-transparent p-2.5 text-left font-normal hover:border-border hover:bg-muted"
       >
         <span className="flex size-9 shrink-0 items-center justify-center bg-muted text-foreground">
           <Icon className="size-[18px]" />
         </span>
         <span className="min-w-0 flex-1">
           <span className="block font-mono text-xs font-bold uppercase text-foreground">{title}</span>
           <span className="block truncate text-xs text-muted-foreground">{desc}</span>
         </span>
         <ArrowRight className="size-4 text-muted-foreground" />
       </Button>
     </Link>
   );
 }

export function DashboardView({ className, stats, agents }: DashboardProps) {
  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-8 overflow-hidden p-5 sm:p-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase text-muted-foreground">
            {t("workspace_overview")}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-foreground text-balance">
            {t("dashboard_title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/backups"
            className="flex h-11 items-center gap-2 border border-border bg-background px-4 font-mono text-sm font-bold uppercase tracking-wide text-foreground shadow-[4px_4px_0_0_var(--foreground)] transition-all hover:shadow-none active:translate-x-px active:translate-y-px active:shadow-none"
          >
            <FolderClock className="size-4" />
            {t("dashboard_backups_action")}
          </Link>
          <Button className="h-11 border border-border px-4 shadow-[4px_4px_0_0_var(--foreground)] transition-all hover:shadow-none active:translate-x-px active:translate-y-px active:shadow-none" render={<Link href="/profiles" />}>
            <Plus className="size-4" />
            {t("profiles_create_action")}
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label={t("dashboard_stat_models_label")}
          value={String(stats.modelCount)}
          icon={Cpu}
          markerClassName="bg-accent"
        />
        <Stat
          label={t("dashboard_stat_profiles_label")}
          value={String(stats.profileCount)}
          icon={Layers}
          markerClassName="bg-accent"
        />
        <Stat
          label={t("dashboard_stat_backups_label")}
          value={String(stats.backupCount)}
          icon={Archive}
          markerClassName="bg-muted-foreground"
        />
        <Stat
          label={t("dashboard_stat_last_backup_label")}
          value={stats.lastBackup}
          icon={Activity}
          markerClassName="bg-primary"
        />
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-8 xl:grid-cols-3">
        <section className="flex min-h-0 flex-col border border-border bg-card p-5 sm:p-6 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">{t("dashboard_agents_title")}</h2>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/models" />}
              className="h-auto gap-1 px-0 py-0 text-xs font-medium text-primary hover:text-primary/80"
            >
              {t("dashboard_agents_manage")}
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
          <div className="scrollbar-brutal grid min-h-0 flex-1 content-start gap-4 overflow-y-auto pr-4 sm:grid-cols-2">
            {agents.map((agent) => (
              <AgentTile key={agent.agentKey} agent={agent} />
            ))}
            <AddAgentTile />
          </div>
        </section>

        <section className="flex flex-col">
          <Card className="flex h-full flex-col gap-2.5 border border-border p-5 shadow-none sm:p-6">
            <h2 className="mb-3 text-base font-bold text-foreground">{t("dashboard_quick_access_title")}</h2>
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

            <div className="mt-auto border border-accent bg-accent p-4 text-accent-foreground">
              <p className="text-base font-bold">{t("tdd_strict_mode_title")}</p>
              <p className="mt-2 text-sm text-accent-foreground text-pretty">
                {t("tdd_strict_mode_desc")}
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">
                <span className="size-2 bg-primary" aria-hidden="true" />
                {t("tdd_strict_mode_enabled")}
              </div>
            </div>

          </Card>
        </section>
      </div>
    </div>
  );
}
