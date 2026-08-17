"use client";

import { Package, SearchX } from "lucide-react";
import { t } from "@/resources/resources";
import { Button } from "@/components/ui/button";
import type {
  ListingEntity,
  ListingEmptyVariant,
  ListingEmptyStateProps,
} from "./ListingEmptyState.types";

const titleKey: Record<ListingEntity, Record<ListingEmptyVariant, keyof import("@/resources/types").Resources>> = {
  models: { "no-data": "listing_no_data_models", "no-matches": "listing_no_matches_models" },
  profiles: { "no-data": "listing_no_data_profiles", "no-matches": "listing_no_matches_profiles" },
  backups: { "no-data": "listing_no_data_backups", "no-matches": "listing_no_matches_backups" },
};

const descKey: Record<ListingEntity, Record<ListingEmptyVariant, keyof import("@/resources/types").Resources>> = {
  models: { "no-data": "listing_no_data_models_desc", "no-matches": "listing_no_matches_models_desc" },
  profiles: { "no-data": "listing_no_data_profiles_desc", "no-matches": "listing_no_matches_profiles_desc" },
  backups: { "no-data": "listing_no_data_backups_desc", "no-matches": "listing_no_matches_backups_desc" },
};

export function ListingEmptyState({
  variant,
  entity,
  onClear,
}: ListingEmptyStateProps) {
  const Icon = variant === "no-data" ? Package : SearchX;
  const title = t(titleKey[entity][variant]);
  const description = t(descKey[entity][variant]);
  const showClear = variant === "no-matches" && onClear;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <Icon className="mb-3 size-10 text-muted-foreground" aria-hidden="true" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {showClear && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          aria-label={t("listing_clear_filters")}
          onClick={onClear}
        >
          {t("listing_clear_action")}
        </Button>
      )}
    </div>
  );
}
