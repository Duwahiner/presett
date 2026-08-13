"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cpu,
  Layers,
  Archive,
  Menu,
  Bell,
  Search,
  RefreshCw,
  Sparkles,
  Loader2,
} from "lucide-react";
import { runSync } from "@/services/backupsApiService";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { t } from "@/resources/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { DashboardLayoutProps } from "./DashboardLayout.types";
import type { Resources } from "@/resources/types";

const navItems: { key: keyof Resources; href: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "nav_dashboard", href: "/", icon: LayoutDashboard },
  { key: "nav_models", href: "/models", icon: Cpu },
  { key: "nav_profiles", href: "/profiles", icon: Layers },
  { key: "nav_backups", href: "/backups", icon: Archive },
];

export function DashboardLayoutView({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");
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
              className="relative flex w-full max-w-md items-center"
              onSubmit={(e) => {
                e.preventDefault();
                const q = search.trim();
                if (!q) return;
                const page = pathname?.startsWith("/models") ? "/models"
                  : pathname?.startsWith("/profiles") ? "/profiles"
                  : pathname?.startsWith("/backups") ? "/backups"
                  : "/models";
                router.push(`${page}?q=${encodeURIComponent(q)}`);
              }}
            >
              <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
              <Input
                type="search"
                aria-label={t("topbar_search_aria")}
                placeholder={t("topbar_search_placeholder")}
                className="h-10 rounded-full border-border bg-muted/60 pl-10 pr-4 text-sm placeholder:text-muted-foreground"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            <div className="ml-auto flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("topbar_notifications_aria")}
              >
                <Bell className="size-[18px]" />
              </Button>

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
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
