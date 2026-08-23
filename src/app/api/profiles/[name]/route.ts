import { join } from "node:path";
import { NextResponse } from "next/server";
import { updateProfile, deleteProfile } from "@/adapters/opencode";
import { readModelCacheSafe } from "@/services/modelCacheService";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { DEFAULT_MODEL_CACHE_DIR } from "@/services/modelCacheService";
import { defaultPresettDir } from "@/lib/paths";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";
import { readGentleAiConfigSafe, writeGentleAiConfig } from "@/adapters/gentle-ai";
import { readStateJsonSafe } from "@/services/stateService";

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

function gentleAiDir(): string { return process.env.PRESETT_TEST_GENTLE_AI_DIR ?? join(process.env.HOME ?? "", ".gentle-ai"); }

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "DELETE, OPTIONS, PUT",
      "Access-Control-Allow-Methods": "DELETE, OPTIONS, PUT",
      "Access-Control-Allow-Headers": "Content-Type",
    },
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
  const body = (await request.json()) as {
    assignments: Record<string, { provider: string; model: string; variant: string }>;
  };

  const cacheResult = await readModelCacheSafe(cacheDir());
  if (!cacheResult.ok) {
    return NextResponse.json(
      { error: cacheResult.error },
      { status: cacheResult.error.code === "FILE_MISSING" ? 503 : 500 },
    );
  }

  const result = await updateProfile(
    configDir(),
    name,
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

  // Also update Gentle-AI's state.json with model_assignments
  const stateResult = await readStateJsonSafe(gentleAiDir());
  if (stateResult.ok) {
    const existingState = stateResult.value;
    const modelAssignments = ((existingState as unknown) as Record<string, unknown>).model_assignments as Record<string, { provider_id: string; model_id: string; effort: string }> | undefined;
    const updatedAssignments = { ...(modelAssignments ?? {}) };
    for (const [agentKey, assignment] of Object.entries(body.assignments)) {
      updatedAssignments[agentKey] = {
        provider_id: assignment.provider,
        model_id: assignment.model,
        effort: assignment.variant,
      };
    }
    await writeGentleAiConfig(
      gentleAiDir(),
      { ...existingState, model_assignments: updatedAssignments },
      backupDir(),
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
  const result = await deleteProfile(configDir(), name, backupDir());

  if (!result.ok) {
    const status = result.error.code === "SCHEMA_INVALID" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
