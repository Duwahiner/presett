import { get } from "@/services/api";
import type { SearchResponse } from "@/services/searchService";

export async function searchEntities(query: string, limit?: number): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (limit !== undefined) params.set("limit", String(limit));
  return get<SearchResponse>(`/search?${params.toString()}`);
}
