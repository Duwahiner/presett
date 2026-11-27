import { NextResponse } from "next/server";
import {
  listProfiles,
  readOpenCodeConfigSafe,
} from "@/adapters/opencode";
import { DEFAULT_OPEN_CODE_CONFIG_DIR } from "@/adapters/opencode";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";
import { detectProfileStrategy } from "@/services/profileStrategyService";

export const dynamic = "force-dynamic";

function configDir(): string {
  return process.env.PRESETT_TEST_CONFIG_DIR ?? DEFAULT_OPEN_CODE_CONFIG_DIR;
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

/**
 * Profile creation is retired: it depended on `gentle-ai sync --profile`,
 * which Gentle-AI removed on purpose. The handler answers 410 right after the
 * origin check and never reads the config, loads the catalog, writes a backup
 * or spawns a process.
 */
export async function POST(request: Request) {
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
          "Creating profiles is no longer available: Gentle-AI retired the profile flags.",
      },
    },
    { status: 410 },
  );
}
