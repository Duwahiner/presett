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
}

export async function getConfig(): Promise<ConfigResponse> {
  return get("/config");
}

export async function getCatalog(): Promise<CatalogResponse> {
  return get("/models");
}

export async function saveAssignment(payload: {
  agentKey: string;
  provider: string;
  model: string;
  variant: string;
}): Promise<unknown> {
  return put("/config", payload);
}
