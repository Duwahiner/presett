import { NextResponse } from "next/server";
import { runGentleAiSync } from "@/services/processService";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";
import { clearServerModelCatalogCache } from "@/services/modelCatalogService";

export const dynamic = "force-dynamic";

function syncCommand(): string {
  return process.env.PRESETT_TEST_SYNC_COMMAND ?? "gentle-ai";
}

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

export async function POST(request: Request) {
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), {
      status: originResult.status,
    });
  }

  const result = await runGentleAiSync(syncCommand());

  if (!result.ok) {
    const status = result.error.code === "FILE_MISSING" ? 503 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  clearServerModelCatalogCache();

  return NextResponse.json(result.value);
}
