import type { Resources } from "@/resources/types";

export interface ListingControlsConfig {
  search?: {
    placeholder: keyof Resources;
    ariaLabel: keyof Resources;
  };
  filters?: Array<{
    key: string;
    labelKey: keyof Resources;
    options: Array<{ value: string; labelKey: keyof Resources }>;
  }>;
  sort: {
    fields: Array<{ value: string; labelKey: keyof Resources }>;
    defaultField: string;
    defaultDir: "asc" | "desc";
  };
}

export interface ListingControlsState {
  search: string;
  activeFilters: Record<string, string>;
  sortField: string;
  sortDir: "asc" | "desc";
}

export interface ListingControlsProps {
  config: ListingControlsConfig;
  state: ListingControlsState;
  onChange: (next: Partial<ListingControlsState>) => void;
  onClear: () => void;
  resultCount: number;
}
