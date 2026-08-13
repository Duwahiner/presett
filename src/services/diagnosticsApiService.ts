import { post } from "./api";
import type { DiagnosticsUpdateState } from "./diagnosticsService";

export async function checkDiagnosticsUpdates(): Promise<DiagnosticsUpdateState> {
  return post("/diagnostics/check");
}
