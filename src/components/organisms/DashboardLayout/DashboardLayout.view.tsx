"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cpu,
  Layers,
  Archive,
  Activity,
  Menu,
  Search,
  X,
  RefreshCw,
  Sparkles,
  Loader2,
  Settings,
  Bell,
} from "lucide-react";
import { runSync } from "@/services/backupsApiService";
import { checkDiagnosticsUpdates } from "@/services/diagnosticsApiService";
import type { DiagnosticsUpdateState } from "@/services/diagnosticsService";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { t } from "@/resources/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationProvider, useNotifications } from "@/contexts/NotificationContext";
import { AuditNotificationProvider, useAuditNotifications } from "@/lib/visual-audit/audit-context";
import { useAuditMode } from "@/lib/visual-audit/audit-context";
import { useNotificationToasts } from "@/hooks/useNotificationToasts";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { Toaster } from "@/components/ui/sonner";
import type { DashboardLayoutProps } from "./DashboardLayout.types";
import type { Resources } from "@/resources/types";

const menuItems: { key: keyof Resources; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "nav_dashboard", href: "/", icon: LayoutDashboard },
  { key: "nav_models", href: "/models", icon: Cpu },
  { key: "nav_profiles", href: "/profiles", icon: Layers },
  { key: "nav_backups", href: "/backups", icon: Archive },
];

const workspaceItems: { key: keyof Resources; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "nav_settings", href: "/settings", icon: Settings },
];

function DashboardLayoutInner({ children }: DashboardLayoutProps) {
  const isAuditMode = useAuditMode();
  const pathname = usePathname();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [updateState, setUpdateState] = useState<DiagnosticsUpdateState | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
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
            "group flex items-center gap-3 px-3 py-2 font-mono text-xs font-bold uppercase transition-colors",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
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
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-sidebar md:flex">
          <div className="flex h-[72px] items-center gap-2.5 px-5">
            <div className="flex size-8 items-center justify-center bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="font-mono text-sm font-bold uppercase tracking-wider text-sidebar-foreground">
              PRESETT
            </span>
          </div>

          <nav className="mt-5 flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
            <div className="flex flex-col gap-0.5">
              <p className="px-3 pb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/70">
                {t("sidebar_group_menu")}
              </p>
              {renderNavLinks(menuItems)}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="px-3 pb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/70">
                {t("sidebar_group_workspace")}
              </p>
              {renderNavLinks(workspaceItems)}
            </div>
          </nav>

          <div className="p-3">
            {!isAuditMode && (
              <Button className="w-full gap-2" onClick={handleSync} disabled={syncing}>
                {syncing
                  ? <Loader2 className="size-4 animate-spin" />
                  : <RefreshCw className="size-4" />}
                {t("sidebar_sync_cta")}
              </Button>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
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
              className="relative flex min-w-0 w-full max-w-lg items-center"
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
                className="h-11 border-border bg-transparent pl-12 pr-10 text-[15px] font-medium text-card-foreground shadow-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 [&::-webkit-search-cancel-button]:appearance-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label={t("topbar_search_clear_aria")}
                  className="absolute right-2 inline-flex size-7 items-center justify-center text-card-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSearch("")}
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              )}
            </form>

            <div className="ml-auto flex items-center gap-1.5">
              <Popover open={notificationOpen} onOpenChange={(open) => {
                setNotificationOpen(open);
                if (open) markAllRead();
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("topbar_notifications_aria")}
                    aria-expanded={notificationOpen}
                    className="relative"
                  >
                    <Bell className="size-[18px]" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center bg-primary font-mono text-[10px] font-bold text-primary-foreground">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[380px] border-2 border-border bg-card p-0 shadow-[4px_4px_0_0_var(--border)]"
              >
                <NotificationPanel />
              </PopoverContent>
              </Popover>

              {!isAuditMode && <ThemeToggle />}

              <Button
                variant="ghost"
                size="icon"
                aria-label={t("topbar_account_aria")}
              >
                <span className="flex size-8 items-center justify-center bg-primary font-mono text-xs font-bold text-primary-foreground">
                  PS
                </span>
              </Button>
            </div>
          </header>

          {mobileNavOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
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
                className="absolute left-3 right-3 top-3 max-h-[calc(100dvh-1.5rem)] overflow-y-auto border-2 border-border bg-sidebar p-3 shadow-[4px_4px_0_0_var(--border)]"
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

          <main className="min-h-0 flex-1 overflow-y-auto bg-background/60">
            {children}
          </main>
        </div>
      </div>
    </div>
    </>
  );
}

export function DashboardLayoutView({ children }: DashboardLayoutProps) {
  return (
    <AuditNotificationProvider>
      <NotificationProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
        <Toaster />
      </NotificationProvider>
    </AuditNotificationProvider>
  );
}
