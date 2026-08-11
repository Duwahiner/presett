import { NextResponse } from "next/server";
import { readModelCacheSafe } from "@/services/modelCacheService";
import { DEFAULT_MODEL_CACHE_DIR } from "@/services/modelCacheService";

export const dynamic = "force-dynamic";

function cacheDir(): string {
  return process.env.PRESETT_TEST_MODEL_CACHE_DIR ?? DEFAULT_MODEL_CACHE_DIR;
}

export async function GET() {
  const result = await readModelCacheSafe(cacheDir());

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
