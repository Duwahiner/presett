import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  listModelAssignments,
  readOpenCodeConfigSafe,
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
import { globalConfigPatchSchema } from "@/lib/validators";

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

export async function GET() {
  const configResult = await readOpenCodeConfigSafe(configDir());
  const stateResult = await readStateJsonSafe(gentleAiDir());
  return NextResponse.json({
    defaultAgent: configResult.ok ? configResult.value.default_agent : undefined,
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
  const result = await writeOpenCodeConfig(configDir(), { ...existing.value, agent: { ...existing.value.agent, [parsed.data.agentKey]: { ...agent, model: parsed.data.model, variant: parsed.data.variant } } }, backupDir());
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json(buildSafeError("Configuration could not be saved"), { status: 500 });
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

  return NextResponse.json({ ok: true });
}
