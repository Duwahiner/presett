import { get, put } from "./api";

export interface Assignment {
  agentKey: string;
  provider: string;
  model: string;
  variant: string;
}

export interface ConfigResponse {
  defaultAgent?: string;
  assignments: Assignment[];
}

export type ModelCatalog = Record<string, Record<string, string[]>>;

export interface CatalogResponse {
  providers: string[];
  catalog: ModelCatalog;
  connectedProviders: string[];
}

const CLIENT_CATALOG_CACHE_TTL_MS = 30_000;

let cachedCatalogResponse: CatalogResponse | null = null;
let catalogFetchedAt = 0;
let catalogRequest: Promise<CatalogResponse> | null = null;

export async function getConfig(): Promise<ConfigResponse> {
  return get("/config");
}

export function clearModelCatalogCache(): void {
  cachedCatalogResponse = null;
  catalogFetchedAt = 0;
  catalogRequest = null;
}

export async function getCatalog(options?: { forceRefresh?: boolean }): Promise<CatalogResponse> {
  const forceRefresh = options?.forceRefresh === true;
  const now = Date.now();

  if (!forceRefresh && cachedCatalogResponse && now - catalogFetchedAt < CLIENT_CATALOG_CACHE_TTL_MS) {
    return cachedCatalogResponse;
  }

  if (!forceRefresh && catalogRequest) {
    return catalogRequest;
  }

  catalogRequest = get<CatalogResponse>("/models")
    .then((response) => {
      cachedCatalogResponse = response;
      catalogFetchedAt = Date.now();
      return response;
    })
    .finally(() => {
      catalogRequest = null;
    });

  return catalogRequest;
}

export async function saveAssignment(payload: {
  agentKey: string;
  provider: string;
  model: string;
  variant: string;
}): Promise<unknown> {
  return put("/config", payload);
}
