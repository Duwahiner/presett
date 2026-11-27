import { homedir } from "node:os";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { updateProfile, deleteProfile, getProfileDetail, readOpenCodeConfigSafe } from "@/adapters/opencode";
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "DELETE, GET, OPTIONS, PUT",
      "Access-Control-Allow-Methods": "DELETE, GET, OPTIONS, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

const PROFILE_NAME_PATTERN = /^[a-z0-9_-]+$/;

/** Profile names that must never be deleted, rejected before the adapter. */
const RESERVED_PROFILE_NAMES_HTTP = new Set(["base"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;

  if (!name || !PROFILE_NAME_PATTERN.test(name)) {
    return NextResponse.json(
      {
        error: {
          code: "SCHEMA_INVALID",
          message:
            "Profile name must contain only lowercase letters, numbers, underscores, and hyphens",
        },
      },
      { status: 400 },
    );
  }

  const readResult = await readOpenCodeConfigSafe(configDir());
  if (!readResult.ok) {
    return NextResponse.json(
      { error: readResult.error },
      { status: readResult.error.code === "FILE_MISSING" ? 404 : 500 },
    );
  }

  const detail = getProfileDetail(readResult.value, name);
  if (!detail) {
    return NextResponse.json(
      {
        error: { code: "NOT_FOUND", message: `Profile "${name}" does not exist` },
      },
      { status: 404 },
    );
  }

  // Expose the detected strategy on read so the client can enforce the
  // `external-single-active` read-only UI (banner + disabled controls).
  return NextResponse.json({
    ...detail,
    strategy: detectProfileStrategy(readResult.value),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), {
      status: originResult.status,
    });
  }

  const { name } = await params;

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

  const result = await updateProfile(
    name,
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
      buildSafeError("Gentle-AI failed to update the profile"),
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), {
      status: originResult.status,
    });
  }

  const { name } = await params;
  if (name === "base" || RESERVED_PROFILE_NAMES_HTTP.has(name)) {
    return NextResponse.json(
      {
        error: {
          code: "SCHEMA_INVALID",
          message: "The base profile cannot be deleted",
        },
      },
      { status: 400 },
    );
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

  const result = await deleteProfile(configDir(), name, backupDir());

  if (!result.ok) {
    const status = result.error.code === "SCHEMA_INVALID" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
