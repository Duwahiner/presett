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
import { NotificationProvider } from "@/contexts/NotificationContext";
import { BellButton } from "@/components/notifications/BellButton";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import type { DashboardLayoutProps } from "./DashboardLayout.types";
import type { Resources } from "@/resources/types";

const navItems: { key: keyof Resources; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "nav_dashboard", href: "/", icon: LayoutDashboard },
  { key: "nav_models", href: "/models", icon: Cpu },
  { key: "nav_profiles", href: "/profiles", icon: Layers },
  { key: "nav_backups", href: "/backups", icon: Archive },
  { key: "nav_diagnostics", href: "/diagnostics", icon: Activity },
  { key: "nav_config", href: "/config", icon: Settings },
];

export function DashboardLayoutView({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updateState, setUpdateState] = useState<DiagnosticsUpdateState | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavRef = useRef<HTMLElement | null>(null);

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
    setSyncMessage(null);
    try {
      await runSync();
      setSyncMessage({ type: "success", text: t("sidebar_sync_success") });
    } catch {
      setSyncMessage({ type: "error", text: t("sidebar_sync_error_message") });
    } finally {
      setSyncing(false);
    }
  }

  function renderNavLinks(onNavigate?: () => void) {
    return navItems.map((item) => {
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
            "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
    <NotificationProvider>
      <div className="flex h-screen w-full items-stretch overflow-hidden bg-background">
        <div className="flex h-full w-full overflow-hidden bg-card">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
          <div className="flex h-16 items-center gap-2.5 px-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
              PreSett
            </span>
          </div>

          <nav className="mt-5 flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4">
            <div className="flex flex-col gap-0.5">
              <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/70">
                {t("sidebar_group_menu")}
              </p>
              {renderNavLinks()}
            </div>
          </nav>

          <div className="p-3">
            <Button className="w-full gap-2" onClick={handleSync} disabled={syncing}>
              {syncing
                ? <Loader2 className="size-4 animate-spin" />
                : <RefreshCw className="size-4" />}
              {t("sidebar_sync_cta")}
            </Button>
            {syncMessage && (
              <p
                role={syncMessage.type === "error" ? "alert" : "status"}
                className={cn(
                  "mt-2 rounded-lg px-3 py-2 text-xs",
                  syncMessage.type === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-success/10 text-success",
                )}
              >
                {syncMessage.text}
              </p>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
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
                className="h-11 rounded-[.4rem] border-border bg-transparent pl-12 pr-10 text-[15px] font-medium text-card-foreground shadow-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 [&::-webkit-search-cancel-button]:appearance-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label={t("topbar_search_clear_aria")}
                  className="absolute right-2 inline-flex size-7 items-center justify-center rounded-full text-card-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSearch("")}
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              )}
            </form>

            <div className="ml-auto flex items-center gap-1.5">
              <BellButton
                open={notificationOpen}
                onToggle={() => setNotificationOpen((o) => !o)}
              />

              <ThemeToggle />

              <Button
                variant="ghost"
                size="icon"
                aria-label={t("topbar_account_aria")}
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-chart-4 text-xs font-semibold text-primary-foreground">
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
                className="absolute left-3 right-3 top-3 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-border bg-sidebar p-3 shadow-xl"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Sparkles className="size-4" />
                    </div>
                    <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
                      PreSett
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
                  <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/70">
                    {t("sidebar_group_menu")}
                  </p>
                  {renderNavLinks(() => setMobileNavOpen(false))}
                </div>
              </nav>
            </div>
          )}

          <main className="min-h-0 flex-1 overflow-y-auto bg-background/60">
            {updateState?.notice?.pending && (
              <div role="alert" className="m-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p>{t("diagnostics_update_notice", { version: updateState.notice.version, channel: updateState.notice.channel })}</p>
                  <Button variant="outline" size="sm" onClick={handleManualUpdateCheck} disabled={checkingUpdates}>
                    {checkingUpdates ? t("diagnostics_checking") : t("diagnostics_check_now")}
                  </Button>
                </div>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </div>

    <NotificationPanel
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
    </NotificationProvider>
  );
}
