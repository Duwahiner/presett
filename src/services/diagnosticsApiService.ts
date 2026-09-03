import { get, post } from "./api";
import type { DiagnosticsReport, DiagnosticsUpdateState } from "./diagnosticsService";

let activeCheck: Promise<DiagnosticsUpdateState> | null = null;

export async function getDiagnostics(): Promise<DiagnosticsReport> {
  return get("/diagnostics");
}

export async function checkDiagnosticsUpdates(): Promise<DiagnosticsUpdateState> {
  if (activeCheck) return activeCheck;

  activeCheck = post<DiagnosticsUpdateState>("/diagnostics/check").finally(() => {
    activeCheck = null;
  });
  return activeCheck;
}
