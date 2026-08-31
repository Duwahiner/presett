import type { Resources } from "@/resources/types";

export type ListingEntity = "models" | "profiles" | "backups";
export type ListingEmptyVariant = "no-data" | "no-matches";

export interface ListingEmptyStateProps {
  variant: ListingEmptyVariant;
  entity: ListingEntity;
  onClear?: () => void;
}
