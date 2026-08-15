import { get, patch } from "./api";
import type { Locale } from "@/types/state";
import type { Assignment } from "./modelsApiService";
export interface GlobalConfigResponse { defaultAgent?: string; assignments: Assignment[]; gentleAi: { persona?: string; language?: Locale } }
export async function getGlobalConfig(): Promise<GlobalConfigResponse> { return get("/config"); }
export async function patchGlobalConfig(payload: { domain: "gentle-ai"; language?: Locale; persona?: string } | { domain: "opencode"; agentKey: string; model: string; variant: string }): Promise<unknown> { return patch("/config", payload); }
