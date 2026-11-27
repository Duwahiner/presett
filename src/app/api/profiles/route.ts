import { homedir } from "node:os";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  listProfiles,
  createProfile,
  readOpenCodeConfigSafe,
} from "@/adapters/opencode";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { DEFAULT_MODEL_CACHE_DIR } from "@/services/modelCacheService";
import { defaultPresettDir } from "@/lib/paths";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";
import { loadMergedModelCatalogSafe } from "@/services/modelCatalogService";
import { detectProfileStrategy, guardProfileMutation } from "@/services/profileStrategyService";

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

function syncCommand(): string {
  return process.env.PRESETT_TEST_SYNC_COMMAND ?? "gentle-ai";
}

export async function GET() {
  // GET is strictly read-only. `sdd-<phase>-<profile>` keys are valid
  // generated-multi assets owned by gentle-ai, so the listing must never
  // mutate or delete them.
  const result = await readOpenCodeConfigSafe(configDir());
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.code === "FILE_MISSING" ? 404 : 500 },
    );
  }

  return NextResponse.json({
    profiles: await listProfiles(result.value, configDir()),
    strategy: detectProfileStrategy(result.value),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, OPTIONS, POST",
      "Access-Control-Allow-Methods": "GET, OPTIONS, POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: Request) {
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), {
      status: originResult.status,
    });
  }

  const strategyRead = await readOpenCodeConfigSafe(configDir());
  if (!strategyRead.ok) {
    return NextResponse.json(
      { error: strategyRead.error },
      { status: strategyRead.error.code === "FILE_MISSING" ? 404 : 500 },
    );
  }
  const strategyGuard = guardProfileMutation(
    detectProfileStrategy(strategyRead.value),
  );
  if (!strategyGuard.ok) {
    return NextResponse.json(
      { error: { code: strategyGuard.code, message: strategyGuard.message } },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    name: string;
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

  const result = await createProfile(
    body.name,
    body.assignments,
    cacheResult.value,
    syncCommand(),
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

  if (result.value.exitCode !== 0) {
    return NextResponse.json(
      buildSafeError("Gentle-AI failed to create the profile"),
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
