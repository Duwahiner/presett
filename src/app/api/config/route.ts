import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  listModelAssignments,
  readOpenCodeConfigSafe,
  splitModelRef,
  updateModelAssignment,
  writeOpenCodeConfig,
} from "@/adapters/opencode";
import { readModelCacheSafe } from "@/services/modelCacheService";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { DEFAULT_MODEL_CACHE_DIR } from "@/services/modelCacheService";
import { defaultPresettDir } from "@/lib/paths";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";
import { readGentleAiConfigSafe, writeGentleAiConfig } from "@/adapters/gentle-ai";
import { readStateJsonSafe } from "@/services/stateService";
import {
  buildModelCache,
  globalConfigPatchSchema,
  validateModelAssignment,
} from "@/lib/validators";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";

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

function opencodeStateDir(): string {
  return process.env.PRESETT_TEST_OPENCODE_STATE_DIR ?? join(homedir(), ".local", "state", "opencode");
}

/**
 * OpenCode variant preference file updater
 * 
 * OpenCode v2 ignores `agent.variant` in opencode.json (GitHub issue #28803).
 * Instead, it resolves variants from `~/.local/state/opencode/model.json`.
 * Priority order: CLI flag → model.json → session DB → agent.config
 * 
 * We write to model.json to ensure the variant takes effect immediately.
 * If OpenCode fixes #28803 and gives priority to agent.variant, this
 * function becomes redundant but harmless — the variant will be set in
 * both places (opencode.json agent config AND model.json preferences).
 */
async function updateOpenCodeVariantPreference(modelRef: string, variant: string): Promise<void> {
  const modelJsonPath = join(opencodeStateDir(), "model.json");
  try {
    const raw = await readFile(modelJsonPath, "utf-8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    const variants = (data.variant as Record<string, string> | undefined) ?? {};
    variants[modelRef] = variant;
    data.variant = variants;
    await writeFile(modelJsonPath, JSON.stringify(data, null, 2));
  } catch {
    // If file doesn't exist or is malformed, create it
    await writeFile(modelJsonPath, JSON.stringify({ variant: { [modelRef]: variant } }, null, 2));
  }
}

export async function GET() {
  const configResult = await readOpenCodeConfigSafe(configDir());
  const stateResult = await readStateJsonSafe(gentleAiDir());
  return NextResponse.json({
    defaultAgent: configResult.ok ? configResult.value.default_agent : undefined,
    agents: configResult.ok ? Object.keys(configResult.value.agent) : [],
    assignments: configResult.ok ? listModelAssignments(configResult.value) : [],
    gentleAi: stateResult.ok ? { persona: stateResult.value.persona, language: stateResult.value.language } : {},
  });
}

export async function PATCH(request: Request) {
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) return NextResponse.json(buildSafeError(originResult.message), { status: originResult.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(buildSafeError("Invalid JSON body"), { status: 400 });
  }
  const parsed = globalConfigPatchSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (issue.code === "unrecognized_keys") {
        for (const key of issue.keys) fields[key] = "Unrecognized field";
      } else {
        fields[issue.path.join(".") || "body"] = issue.message;
      }
    }
    return NextResponse.json({ error: { message: "Invalid configuration fields", fields } }, { status: 400 });
  }
  if (parsed.data.domain === "gentle-ai") {
    const existing = await readStateJsonSafe(gentleAiDir());
    const result = await writeGentleAiConfig(gentleAiDir(), { ...(existing.ok ? existing.value : {}), language: parsed.data.language, persona: parsed.data.persona }, backupDir());
    return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json(buildSafeError("Configuration could not be saved"), { status: 500 });
  }
  const existing = await readOpenCodeConfigSafe(configDir());
  if (!existing.ok) return NextResponse.json(buildSafeError("OpenCode configuration unavailable"), { status: 503 });
  const agent = existing.value.agent[parsed.data.agentKey];
  if (!agent) return NextResponse.json(buildSafeError("Unknown OpenCode agent"), { status: 400 });

  const cacheResult = await readModelCacheSafe(cacheDir());
  if (!cacheResult.ok) {
    return NextResponse.json(buildSafeError("Model catalog unavailable"), { status: 503 });
  }

  const { provider, model } = splitModelRef(parsed.data.model);
  const validation = validateModelAssignment(buildModelCache(cacheResult.value), {
    provider,
    model,
    variant: parsed.data.variant,
  });
  if (!validation.ok) {
    return NextResponse.json(buildSafeError("Invalid model selection"), { status: 400 });
  }

  const result = await writeOpenCodeConfig(configDir(), { ...existing.value, agent: { ...existing.value.agent, [parsed.data.agentKey]: { ...agent, model: parsed.data.model, variant: parsed.data.variant } } }, backupDir());
  if (!result.ok) return NextResponse.json(buildSafeError("Configuration could not be saved"), { status: 500 });

  // Update OpenCode's variant preference file (required for variant to take effect)
  await updateOpenCodeVariantPreference(parsed.data.model, parsed.data.variant);

  // Also update Gentle-AI's state.json with model_assignments
  const { provider: patchProvider, model: patchModel } = splitModelRef(parsed.data.model);
  const stateResult = await readStateJsonSafe(gentleAiDir());
  if (stateResult.ok) {
    const existingState = stateResult.value;
    const modelAssignments = ((existingState as unknown) as Record<string, unknown>).model_assignments as Record<string, { provider_id: string; model_id: string; effort: string }> | undefined;
    const updatedAssignments = {
      ...(modelAssignments ?? {}),
      [parsed.data.agentKey]: {
        provider_id: patchProvider,
        model_id: patchModel,
        effort: parsed.data.variant,
      },
    };
    await writeGentleAiConfig(
      gentleAiDir(),
      { ...existingState, model_assignments: updatedAssignments },
      backupDir(),
    );
  }

  return NextResponse.json({ ok: true });
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

export async function PUT(request: Request) {
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), {
      status: originResult.status,
    });
  }

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

  // Update OpenCode's variant preference file (required for variant to take effect)
  await updateOpenCodeVariantPreference(`${body.provider}/${body.model}`, body.variant);

  // Also update Gentle-AI's state.json with model_assignments
  const stateResult = await readStateJsonSafe(gentleAiDir());
  if (stateResult.ok) {
    const existingState = stateResult.value;
    const modelAssignments = ((existingState as unknown) as Record<string, unknown>).model_assignments as Record<string, { provider_id: string; model_id: string; effort: string }> | undefined;
    const updatedAssignments = {
      ...(modelAssignments ?? {}),
      [body.agentKey]: {
        provider_id: body.provider,
        model_id: body.model,
        effort: body.variant,
      },
    };
    await writeGentleAiConfig(
      gentleAiDir(),
      { ...existingState, model_assignments: updatedAssignments },
      backupDir(),
    );
  }

  return NextResponse.json({ ok: true });
}
