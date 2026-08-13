import type { SearchEntityType, SearchResult } from "@/services/searchService";

export type GroupedSearchResults = Partial<Record<SearchEntityType, SearchResult[]>>;
