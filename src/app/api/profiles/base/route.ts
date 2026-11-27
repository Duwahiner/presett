import { homedir } from "node:os";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  DEFAULT_OPEN_CODE_CONFIG_DIR,
  getBaseProfileDetail,
  readOpenCodeConfigSafe,
  updateBaseProfile,
} from "@/adapters/opencode";
import { DEFAULT_MODEL_CACHE_DIR } from "@/services/modelCacheService";
import { defaultPresettDir } from "@/lib/paths";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";
import { loadMergedModelCatalogSafe } from "@/services/modelCatalogService";

export const dynamic = "force-dynamic";

function configDir(): string {
  return process.env.PRESETT_TEST_CONFIG_DIR ?? DEFAULT_OPEN_CODE_CONFIG_DIR;
}

function cacheDir(): string {
  return process.env.PRESETT_TEST_MODEL_CACHE_DIR ?? DEFAULT_MODEL_CACHE_DIR;
}

function backupDir(): string {
  return (
    process.env.PRESETT_TEST_BACKUP_DIR ??
    join(defaultPresettDir(), "backups")
  );
}

function gentleAiDir(): string {
  return process.env.PRESETT_TEST_GENTLE_AI_DIR ?? join(homedir(), ".gentle-ai");
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, OPTIONS, PUT",
      "Access-Control-Allow-Methods": "GET, OPTIONS, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Static GET handler for the Base profile (empty-name identity).
 * Next.js resolves this static route before the dynamic `[name]` route, so the
 * reserved `/api/profiles/base` path never collapses to the list route.
 */
export async function GET() {
  const readResult = await readOpenCodeConfigSafe(configDir());
  if (!readResult.ok) {
    return NextResponse.json(
      { error: readResult.error },
      { status: readResult.error.code === "FILE_MISSING" ? 404 : 500 },
    );
  }

  const detail = getBaseProfileDetail(readResult.value);
  return NextResponse.json(detail);
}

/**
 * Persist the Base profile (empty-name identity). Only Base-owned
 * (non-profile) agents may be written; the adapter rejects named-profile agent
 * keys so a save through this reserved route never mutates a named profile.
 */
export async function PUT(request: Request) {
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), {
      status: originResult.status,
    });
  }

  const body = (await request.json()) as {
    assignments: Record<string, { provider: string; model: string; variant: string }>;
  };

  const cacheResult = await loadMergedModelCatalogSafe({
    cacheDir: cacheDir(),
    openCodeConfigDir: configDir(),
    gentleAiDir: gentleAiDir(),
  });
  if (!cacheResult.ok) {
    return NextResponse.json(
      { error: cacheResult.error },
      { status: cacheResult.error.code === "FILE_MISSING" ? 503 : 500 },
    );
  }

  const result = await updateBaseProfile(
    configDir(),
    body.assignments,
    backupDir(),
    cacheResult.value,
  );

  if (!result.ok) {
    const status =
      result.error.code === "SCHEMA_INVALID"
        ? 400
        : result.error.code === "WRITE_BLOCKED"
          ? 503
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}