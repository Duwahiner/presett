import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  listModelAssignments,
  readOpenCodeConfigSafe,
  updateModelAssignment,
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
  const configResult = await readOpenCodeConfigSafe(configDir());
  if (!configResult.ok) {
    return NextResponse.json(
      { error: configResult.error },
      { status: configResult.error.code === "FILE_MISSING" ? 404 : 500 },
    );
  }

  return NextResponse.json({
    defaultAgent: configResult.value.default_agent,
    assignments: listModelAssignments(configResult.value),
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    agentKey: string;
    provider: string;
    model: string;
    variant: string;
  };

  const cacheResult = await readModelCacheSafe(cacheDir());
  if (!cacheResult.ok) {
    return NextResponse.json(
      { error: cacheResult.error },
      { status: cacheResult.error.code === "FILE_MISSING" ? 503 : 500 },
    );
  }

  const result = await updateModelAssignment(
    configDir(),
    body.agentKey,
    {
      provider: body.provider,
      model: body.model,
      variant: body.variant,
    },
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
