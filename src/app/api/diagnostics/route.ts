import { NextResponse } from "next/server";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { DEFAULT_GENTLE_AI_DIR } from "@/services/stateService";
import { collectDiagnostics } from "@/services/diagnosticsService";

export const dynamic = "force-dynamic";

export async function GET() {
  const diagnostics = await collectDiagnostics({
    configDir: process.env.PRESETT_TEST_CONFIG_DIR ?? DEFAULT_OPEN_CODE_CONFIG_DIR,
    gentleAiDir: process.env.PRESETT_TEST_GENTLE_AI_DIR ?? DEFAULT_GENTLE_AI_DIR,
  });

  return NextResponse.json(diagnostics);
}
