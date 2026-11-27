import { join } from "node:path";
import { NextResponse } from "next/server";
import { deleteProfile, getProfileDetail, readOpenCodeConfigSafe } from "@/adapters/opencode";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { defaultPresettDir } from "@/lib/paths";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";
import { detectProfileStrategy, guardProfileMutation } from "@/services/profileStrategyService";

export const dynamic = "force-dynamic";

function configDir(): string {
  return process.env.PRESETT_TEST_CONFIG_DIR ?? DEFAULT_OPEN_CODE_CONFIG_DIR;
}

function backupDir(): string {
  return (
    process.env.PRESETT_TEST_BACKUP_DIR ??
    join(defaultPresettDir(), "backups")
  );
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

/**
 * Editing a named profile is retired: it depended on
 * `gentle-ai sync --profile`, which Gentle-AI removed on purpose. The handler
 * answers 410 right after the origin check and never reads the config, loads
 * the catalog, writes a backup or spawns a process. The Base profile is edited
 * through `PUT /api/profiles/base`, a separate route.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  void params;
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), {
      status: originResult.status,
    });
  }

  return NextResponse.json(
    {
      error: {
        code: "FEATURE_RETIRED",
        message:
          "Editing named profiles is no longer available: Gentle-AI retired the profile flags.",
      },
    },
    { status: 410 },
  );
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
