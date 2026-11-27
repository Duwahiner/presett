import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  readOpenCodeConfigSafe,
  repairProfile,
} from "@/adapters/opencode";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { defaultPresettDir } from "@/lib/paths";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";
import {
  detectProfileStrategy,
  guardProfileMutation,
} from "@/services/profileStrategyService";

export const dynamic = "force-dynamic";

/**
 * Conservative repair timeout. Repair re-materializes up to ten phase agents,
 * but it is a manual, explicit action — a short bound avoids a long-running
 * sync holding the request. Overridable via `PRESETT_TEST_REPAIR_TIMEOUT_MS`
 * for tests and environments that need a different budget.
 */
const DEFAULT_REPAIR_TIMEOUT_MS = 30_000;

function configDir(): string {
  return process.env.PRESETT_TEST_CONFIG_DIR ?? DEFAULT_OPEN_CODE_CONFIG_DIR;
}

function backupDir(): string {
  return (
    process.env.PRESETT_TEST_BACKUP_DIR ??
    join(defaultPresettDir(), "backups")
  );
}

function syncCommand(): string {
  return process.env.PRESETT_TEST_SYNC_COMMAND ?? "gentle-ai";
}

function repairTimeoutMs(): number {
  const raw = process.env.PRESETT_TEST_REPAIR_TIMEOUT_MS;
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_REPAIR_TIMEOUT_MS;
}

const PROFILE_NAME_PATTERN = /^[a-z0-9_-]+$/;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "OPTIONS, POST",
      "Access-Control-Allow-Methods": "OPTIONS, POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Manually repair a generated-multi profile that is missing its ten phase
 * agents. This route NEVER writes `opencode.json`: it snapshots the current
 * config into an atomic backup (rollback path) and delegates the repair to
 * `gentle-ai sync --profile`. In `external-single-active` and `unknown`
 * strategies it is blocked with 403 STRATEGY_READONLY.
 */
export async function POST(
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

  const result = await repairProfile(
    name,
    configDir(),
    backupDir(),
    syncCommand(),
    repairTimeoutMs(),
  );

  if (!result.ok) {
    const status =
      result.error.code === "SCHEMA_INVALID"
        ? 400
        : result.error.code === "NOT_FOUND" ||
            result.error.code === "FILE_MISSING"
          ? 404
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  if (result.value.sync.exitCode !== 0) {
    return NextResponse.json(
      {
        error: {
          code: "REPAIR_FAILED",
          message: "Gentle-AI failed to repair the profile",
          backup: result.value.backup,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, backup: result.value.backup });
}