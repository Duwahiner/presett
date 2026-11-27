import { homedir } from "node:os";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  readOpenCodeConfigSafe,
  updateProfilePhase,
} from "@/adapters/opencode";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { DEFAULT_MODEL_CACHE_DIR } from "@/services/modelCacheService";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";
import { loadMergedModelCatalogSafe } from "@/services/modelCatalogService";
import {
  detectProfileStrategy,
  guardProfileMutation,
} from "@/services/profileStrategyService";

export const dynamic = "force-dynamic";

function configDir(): string {
  return process.env.PRESETT_TEST_CONFIG_DIR ?? DEFAULT_OPEN_CODE_CONFIG_DIR;
}

function cacheDir(): string {
  return process.env.PRESETT_TEST_MODEL_CACHE_DIR ?? DEFAULT_MODEL_CACHE_DIR;
}

function gentleAiDir(): string {
  return process.env.PRESETT_TEST_GENTLE_AI_DIR ?? join(homedir(), ".gentle-ai");
}

function syncCommand(): string {
  return process.env.PRESETT_TEST_SYNC_COMMAND ?? "gentle-ai";
}

const PROFILE_NAME_PATTERN = /^[a-z0-9_-]+$/;
const PHASE_NAME_PATTERN = /^[a-z0-9_-]+$/;

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

/**
 * Delegate a single phase model assignment to `gentle-ai sync --profile-phase`.
 * PreSett never writes the phase agent directly (gentle-ai owns
 * `sdd-{phase}-{name}`), so this route only spawns the CLI after validating
 * the profile name, the phase and the strategy guardrail. In
 * `external-single-active` and `unknown` strategies it is blocked with 403.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string; phase: string }> },
) {
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), {
      status: originResult.status,
    });
  }

  const { name, phase } = await params;

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

  if (!phase || !PHASE_NAME_PATTERN.test(phase)) {
    return NextResponse.json(
      {
        error: {
          code: "SCHEMA_INVALID",
          message:
            "Phase name must contain only lowercase letters, numbers, underscores, and hyphens",
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

  const body = (await request.json()) as {
    provider: string;
    model: string;
    variant: string;
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

  const result = await updateProfilePhase(
    name,
    phase,
    body,
    cacheResult.value,
    syncCommand(),
  );

  if (!result.ok) {
    const status =
      result.error.code === "SCHEMA_INVALID" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  if (result.value.exitCode !== 0) {
    return NextResponse.json(
      buildSafeError("Gentle-AI failed to assign the profile phase"),
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}