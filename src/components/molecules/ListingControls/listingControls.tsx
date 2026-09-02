"use client";

import { t } from "@/resources/resources";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListingControlsProps } from "./listingControlsTypes";

export function ListingControls({
  config,
  state,
  onChange,
  onClear,
  resultCount,
}: ListingControlsProps) {
  const activeFilterCount = Object.keys(state.activeFilters).length;
  const hasActive = activeFilterCount > 0 || state.search.length > 0;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3">
      {config.search && (
        <div className="min-w-[180px] flex-1 space-y-1">
          <label htmlFor="listing-search" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t(config.search.ariaLabel)}
          </label>
          <Input
            id="listing-search"
            placeholder={t(config.search.placeholder)}
            aria-label={t(config.search.ariaLabel)}
            value={state.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </div>
      )}

      {config.filters?.map((f) => (
        <div key={f.key} className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t(f.labelKey)}</label>
          <Select.Root
            value={state.activeFilters[f.key] || null}
            onValueChange={(v) => onChange({ activeFilters: { ...state.activeFilters, [f.key]: v ?? "" } })}
          >
            <Select.Trigger
              aria-label={t(f.labelKey)}
              className={cn("flex h-9 items-center justify-between gap-1 border border-border bg-card px-3 py-1 text-sm transition-colors", "focus-visible:outline-none focus-visible:border-primary", "light:border-black light:bg-white light:text-black light:focus-visible:border-primary")}
            >
              <Select.Value placeholder={t(f.labelKey)} />
              <ChevronDown className="size-4 text-muted-foreground" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner className="z-50">
                <Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto border border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal light:border-black light:bg-white light:text-black light:shadow-[4px_4px_0_0_#000000]">
                  {f.options.map((o) => (
                    <Select.Item key={o.value} value={o.value} className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground">
                      <Select.ItemText>{t(o.labelKey)}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>
      ))}

      <div className="space-y-1">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("listing_sort_label")}</label>
        <Select.Root value={state.sortField} onValueChange={(v) => v && onChange({ sortField: v })}>
          <Select.Trigger
            aria-label={t("listing_sort_label")}
            className={cn("flex h-9 items-center justify-between gap-1 border border-border bg-card px-3 py-1 text-sm transition-colors", "focus-visible:outline-none focus-visible:border-primary", "light:border-black light:bg-white light:text-black light:focus-visible:border-primary")}
          >
            <Select.Value />
            <ChevronDown className="size-4 text-muted-foreground" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner className="z-50">
              <Select.Popup className="max-h-60 min-w-[var(--anchor-width)] overflow-auto border border-border bg-popover p-1 text-popover-foreground shadow-[4px_4px_0_0_var(--border)] scrollbar-brutal light:border-black light:bg-white light:text-black light:shadow-[4px_4px_0_0_#000000]">
                {config.sort.fields.map((f) => (
                  <Select.Item key={f.value} value={f.value} className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground">
                    <Select.ItemText>{t(f.labelKey)}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>

      <Button variant="outline" size="icon" aria-label={t("listing_sort_direction_aria")} onClick={() => onChange({ sortDir: state.sortDir === "asc" ? "desc" : "asc" })}>
        {state.sortDir === "asc" ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
      </Button>

      {hasActive && (
        <>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {t("listing_active_filters", { count: String(activeFilterCount) })}
          </span>
          <Button variant="ghost" size="sm" aria-label={t("listing_clear_filters")} onClick={onClear}>
            {t("listing_clear_action")}
          </Button>
        </>
      )}

      <span className="sr-only" aria-live="polite">{resultCount} results</span>
    </div>
  );
}
