import { NextResponse } from "next/server";
import { homedir } from "node:os";
import { join } from "node:path";
import { DEFAULT_MODEL_CACHE_DIR } from "@/services/modelCacheService";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { loadMergedModelCatalogSafe } from "@/services/modelCatalogService";

export const dynamic = "force-dynamic";

function cacheDir(): string {
  return process.env.PRESETT_TEST_MODEL_CACHE_DIR ?? DEFAULT_MODEL_CACHE_DIR;
}

function openCodeConfigDir(): string {
  return process.env.PRESETT_TEST_CONFIG_DIR ?? DEFAULT_OPEN_CODE_CONFIG_DIR;
}

function gentleAiDir(): string {
  return process.env.PRESETT_TEST_GENTLE_AI_DIR ?? join(homedir(), ".gentle-ai");
}

export async function GET() {
  const result = await loadMergedModelCatalogSafe({
    cacheDir: cacheDir(),
    openCodeConfigDir: openCodeConfigDir(),
    gentleAiDir: gentleAiDir(),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.code === "FILE_MISSING" ? 503 : 500 },
    );
  }

  return NextResponse.json({
    providers: Object.keys(result.value),
    catalog: result.value,
  });
}
