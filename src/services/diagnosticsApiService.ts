import { get, post } from "./api";
import type { DiagnosticsReport, DiagnosticsUpdateState } from "./diagnosticsService";

export async function getDiagnostics(): Promise<DiagnosticsReport> {
  return get("/diagnostics");
}

export async function checkDiagnosticsUpdates(): Promise<DiagnosticsUpdateState> {
  return post("/diagnostics/check");
}
