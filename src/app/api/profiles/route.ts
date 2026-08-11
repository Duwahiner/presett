import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  listProfiles,
  createProfile,
  readOpenCodeConfigSafe,
} from "@/adapters/opencode";
import { readModelCacheSafe } from "@/services/modelCacheService";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { DEFAULT_MODEL_CACHE_DIR } from "@/services/modelCacheService";
import { defaultPresettDir } from "@/lib/paths";

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

export async function GET() {
  const result = await readOpenCodeConfigSafe(configDir());
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.code === "FILE_MISSING" ? 404 : 500 },
    );
  }

  return NextResponse.json({ profiles: listProfiles(result.value) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name: string;
    assignments: Record<string, { provider: string; model: string; variant: string }>;
  };

  const cacheResult = await readModelCacheSafe(cacheDir());
  if (!cacheResult.ok) {
    return NextResponse.json(
      { error: cacheResult.error },
      { status: cacheResult.error.code === "FILE_MISSING" ? 503 : 500 },
    );
  }

  const result = await createProfile(
    configDir(),
    body.name,
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
