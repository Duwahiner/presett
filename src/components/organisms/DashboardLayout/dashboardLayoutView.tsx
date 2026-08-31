"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cpu,
  Layers,
  Archive,
  BarChart2,
  Menu,
  Search,
  X,
  RefreshCw,
  Sparkles,
  Loader2,
  Settings,
  Bell,
  Sun,
  Moon,
} from "lucide-react";
import { runSync } from "@/services/backupsApiService";
import { checkDiagnosticsUpdates } from "@/services/diagnosticsApiService";
import type { DiagnosticsUpdateState } from "@/services/diagnosticsService";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { t } from "@/resources/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { NotificationProvider, useNotifications } from "@/contexts/notificationContext";
import { AuditNotificationProvider, useAuditNotifications } from "@/lib/visual-audit/auditContext";
import { useAuditMode } from "@/lib/visual-audit/auditContext";
import { useNotificationToasts } from "@/hooks/useNotificationToasts";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { NotificationPanel } from "@/components/notifications/notificationPanel";
import { Toaster } from "@/components/ui/sonner";
import type { DashboardLayoutProps } from "./dashboardLayoutTypes";
import type { Resources } from "@/resources/types";

const menuItems: { key: keyof Resources; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "nav_dashboard", href: "/", icon: LayoutDashboard },
  { key: "nav_models", href: "/models", icon: Cpu },
  { key: "nav_profiles", href: "/profiles", icon: Layers },
  { key: "nav_backups", href: "/backups", icon: Archive },
  { key: "nav_usage_stats", href: "/usageStats", icon: BarChart2 },
];

const workspaceItems: { key: keyof Resources; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "nav_settings", href: "/settings", icon: Settings },
];

function DashboardLayoutInner({ children, gentleAiVersion }: DashboardLayoutProps) {
  const isAuditMode = useAuditMode();
  const pathname = usePathname();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [updateState, setUpdateState] = useState<DiagnosticsUpdateState | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const darkMode = theme !== "light";
  const isDashboard = pathname === "/";
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const lastPushedUpdateRef = useRef<string | null>(null);
  const { onError, onSuccess, onInfo, resolve, push } = useNotificationToasts();
  // Always call both hooks (Rules of Hooks), use the appropriate one based on mode
  const auditNotifications = useAuditNotifications();
  const normalNotifications = useNotifications();
  const unreadCount = isAuditMode ? auditNotifications.unreadCount : normalNotifications.unreadCount;
  const markAllRead = isAuditMode ? auditNotifications.markAllRead : normalNotifications.markAllRead;

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const firstLink = mobileNavRef.current?.querySelector<HTMLAnchorElement>("a[href]");
    firstLink?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function checkUpdates() {
      setCheckingUpdates(true);
      try {
        const next = await checkDiagnosticsUpdates();
        if (cancelled) return;
        setUpdateState(next);
        timer = setTimeout(checkUpdates, next.settings.frequencyMinutes * 60_000);
      } catch {
        if (!cancelled) timer = setTimeout(checkUpdates, 60 * 60_000);
      } finally {
        if (!cancelled) setCheckingUpdates(false);
      }
    }

    void checkUpdates();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Push update detection as a persistent notification (not inline alert)
  useEffect(() => {
    if (updateState?.notice?.pending && lastPushedUpdateRef.current !== updateState.notice.version) {
      lastPushedUpdateRef.current = updateState.notice.version;
      push({ severity: "update", title: t("notif_update_available", { version: updateState.notice.version }), message: t("diagnostics_update_notice", { version: updateState.notice.version, channel: updateState.notice.channel }) });
    }
  }, [updateState, push]);

  async function handleManualUpdateCheck() {
    if (checkingUpdates) return;
    setCheckingUpdates(true);
    try {
      setUpdateState(await checkDiagnosticsUpdates());
    } catch {
      // Keep the persisted notice visible when a manual check fails.
    } finally {
      setCheckingUpdates(false);
    }
  }

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    const syncId = onInfo(t("sidebar_sync_cta"), t("sidebar_sync_cta"));
    try {
      await runSync();
      resolve(syncId, "success", t("sidebar_sync_success"));
    } catch {
      resolve(syncId, "error", t("sidebar_sync_error_message"));
    } finally {
      setSyncing(false);
    }
  }

  function renderNavLinks(items: typeof menuItems, onNavigate?: () => void) {
    return items.map((item) => {
      const Icon = item.icon;
      const isActive =
        pathname === item.href ||
        (item.href !== "/" && pathname?.startsWith(item.href));

      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "group flex items-center gap-3 border px-3 py-2 text-sm font-bold uppercase tracking-tight transition-all",
            isActive
              ? "border-border bg-accent text-accent-foreground shadow-[2px_2px_0_0_var(--foreground)]"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
          )}
        >
          <Icon className="size-[18px]" />
          <span>{t(item.key)}</span>
        </Link>
      );
    });
  }

  return (
    <>
    <div className="flex h-screen w-full items-stretch overflow-hidden bg-background">
      <div className="flex h-full w-full overflow-hidden bg-card">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
          <div className="flex h-[74px] items-center gap-2.5 border-b border-border px-5">
            <div className="flex size-8 items-center justify-center border border-border bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="font-mono text-[15px] font-bold uppercase tracking-tight text-foreground">
              PreSett
            </span>
          </div>

          <div className="border-b border-border p-3">
            <button
              type="button"
              className="flex w-full items-center gap-3 border border-border bg-card px-3 py-2.5 text-left"
            >
              <span className="flex size-9 items-center justify-center bg-accent font-mono text-[13px] font-bold text-accent-foreground">GS</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">{t("sidebar_workspace_name")}</span>
                <span className="block truncate font-mono text-xs text-muted-foreground">{t("sidebar_workspace_preset")}</span>
              </span>
            </button>
          </div>

          <nav className="mt-4 flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4 scrollbar-brutal">
            <div className="flex flex-col gap-1.5">
              <p className="px-1 pb-1 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                [ {t("sidebar_group_menu")} ]
              </p>
              {renderNavLinks(menuItems)}
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="px-1 pb-1 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                [ {t("sidebar_group_workspace")} ]
              </p>
              {renderNavLinks(workspaceItems)}
            </div>
            {!isAuditMode && (
              <button
                type="button"
                className="mt-auto flex w-full cursor-pointer items-center justify-center gap-2 border border-border bg-primary px-4 py-3 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--foreground)] transition-shadow hover:!shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none disabled:pointer-events-none disabled:opacity-50"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing
                  ? <Loader2 className="size-4 animate-spin" />
                  : <RefreshCw className="size-4" />}
                {t("sidebar_sync_cta")}
              </button>
            )}
          </nav>

          <div className="border-t border-border p-3 light:border-black">
            {gentleAiVersion && (
              <div className="flex items-center justify-between gap-3 border border-border bg-card px-3 py-2 light:border-black light:bg-white">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground light:text-black">
                  {t("sidebar_gentle_ai_label")}
                </span>
                <span className="truncate font-mono text-xs font-bold text-foreground light:text-black">{gentleAiVersion}</span>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-[74px] shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={mobileNavOpen ? t("topbar_menu_close_aria") : t("topbar_menu_aria")}
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <Menu className="size-5" />
            </Button>

            <form
              className="relative flex min-w-0 w-full max-w-2xl items-center"
              onSubmit={(e) => {
                e.preventDefault();
                const q = search.trim();
                if (!q) return;
                router.push(`/search?q=${encodeURIComponent(q)}`);
              }}
            >
              <Search className="pointer-events-none absolute left-4 size-5 text-card-foreground" />
              <Input
                type="search"
                aria-label={t("topbar_search_aria")}
                placeholder={t("topbar_search_placeholder")}
                className="h-11 border-border bg-transparent pl-12 pr-10 text-[15px] font-medium text-card-foreground shadow-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus-visible:border-primary light:focus-visible:border-primary [&::-webkit-search-cancel-button]:appearance-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label={t("topbar_search_clear_aria")}
                  className="absolute right-2 inline-flex size-7 cursor-pointer items-center justify-center text-card-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSearch("")}
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              )}
            </form>

            <div className="ml-auto flex items-center gap-2">
              <Popover open={notificationOpen} onOpenChange={(open) => {
                setNotificationOpen(open);
                if (open) markAllRead();
              }}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("topbar_notifications_aria")}
                    aria-expanded={notificationOpen}
                    className="relative flex cursor-pointer size-9 items-center justify-center border border-border text-foreground transition-shadow hover:!shadow-none active:translate-x-px active:translate-y-px active:shadow-none"
                  >
                    <Bell className="size-[18px]" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 size-3 border border-border bg-primary" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-[380px] border border-border bg-card p-0 shadow-[4px_4px_0_0_var(--foreground)]"
                >
                  <NotificationPanel />
                </PopoverContent>
              </Popover>

              {!isAuditMode && themeMounted && (
                <div className="flex items-center border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    aria-label="Light mode"
                    className={cn(
                      "flex size-8 items-center justify-center transition-colors",
                      !darkMode ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Sun className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    aria-label="Dark mode"
                    className={cn(
                      "flex size-8 items-center justify-center transition-colors",
                      darkMode ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Moon className="size-4" />
                  </button>
                </div>
              )}

              <button
                type="button"
                aria-label={t("topbar_account_aria")}
                className="ml-1 flex cursor-pointer items-center border border-border p-0.5 transition-shadow hover:!shadow-none active:translate-x-px active:translate-y-px active:shadow-none"
              >
                <span className="flex size-8 items-center justify-center bg-primary font-mono text-[13px] font-bold text-primary-foreground">
                  PS
                </span>
              </button>
            </div>
          </header>

          {mobileNavOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <button
                type="button"
                className="absolute inset-0 cursor-pointer bg-black/50 transition-opacity hover:bg-black/70"
                aria-label={t("topbar_menu_close_aria")}
                onClick={() => {
                  setMobileNavOpen(false);
                  menuButtonRef.current?.focus();
                }}
              />
              <nav
                id="mobile-navigation"
                ref={mobileNavRef}
                aria-label={t("sidebar_group_menu")}
                className="absolute left-3 right-3 top-3 max-h-[calc(100dvh-1.5rem)] overflow-y-auto border border-border bg-sidebar p-3 shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center bg-primary text-primary-foreground">
                      <Sparkles className="size-4" />
                    </div>
                    <span className="font-mono text-sm font-bold uppercase tracking-wider text-sidebar-foreground">
                      PRESETT
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("topbar_menu_close_aria")}
                    onClick={() => {
                      setMobileNavOpen(false);
                      menuButtonRef.current?.focus();
                    }}
                  >
                    <Menu className="size-5" />
                  </Button>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="px-3 pb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/70">
                    {t("sidebar_group_menu")}
                  </p>
                  {renderNavLinks(menuItems, () => setMobileNavOpen(false))}
                </div>
                <div className="mt-4 flex flex-col gap-0.5">
                  <p className="px-3 pb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/70">
                    {t("sidebar_group_workspace")}
                  </p>
                  {renderNavLinks(workspaceItems, () => setMobileNavOpen(false))}
                </div>
              </nav>
            </div>
          )}

          <main className={cn(
            "min-h-0 flex-1 bg-background/60",
            isDashboard ? "overflow-hidden" : "overflow-y-auto",
          )}>
            <div key={pathname} className="page-transition h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
    </>
  );
}

export function DashboardLayoutView({ children, gentleAiVersion }: DashboardLayoutProps) {
  return (
    <AuditNotificationProvider>
      <NotificationProvider>
        <DashboardLayoutInner gentleAiVersion={gentleAiVersion}>{children}</DashboardLayoutInner>
        <Toaster />
      </NotificationProvider>
    </AuditNotificationProvider>
  );
}
