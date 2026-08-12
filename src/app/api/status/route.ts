import { NextResponse } from "next/server";
import { detectOpenCode, readOpenCodeConfigSafe } from "@/adapters/opencode";
import { readStateJsonSafe } from "@/services/stateService";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { DEFAULT_GENTLE_AI_DIR } from "@/services/stateService";

export const dynamic = "force-dynamic";

function configDir(): string {
  return process.env.PRESETT_TEST_CONFIG_DIR ?? DEFAULT_OPEN_CODE_CONFIG_DIR;
}

function gentleAiDir(): string {
  return process.env.PRESETT_TEST_GENTLE_AI_DIR ?? DEFAULT_GENTLE_AI_DIR;
}

export async function GET() {
  const detection = await detectOpenCode(configDir());
  const configResult = await readOpenCodeConfigSafe(configDir());
  const stateResult = await readStateJsonSafe(gentleAiDir());

  return NextResponse.json({
    installed: detection.installed,
    configured: configResult.ok,
    configError: configResult.ok ? undefined : configResult.error,
    stateError: stateResult.ok ? undefined : stateResult.error,
    lastSync: undefined,
  });
}
