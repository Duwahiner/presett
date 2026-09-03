import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runGentleAiSync } from "@/services/processService";
import { writeSyncTimestamp } from "@/services/syncStateService";
import { buildSafeError, requireMutationOrigin } from "@/lib/localApiSecurity";
import { clearServerModelCatalogCache } from "@/services/modelCatalogService";

export const dynamic = "force-dynamic";

const SYNC_PERSIST_WARNING =
  "Failed to persist the last successful sync timestamp";

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

  if (result.value.exitCode !== 0) {
    return NextResponse.json(buildSafeError("Gentle-AI sync failed"), {
      status: 500,
    });
  }

  const persist = await writeSyncTimestamp();
  clearServerModelCatalogCache();
  revalidatePath("/");

  if (!persist.ok) {
    return NextResponse.json({ ...result.value, warning: SYNC_PERSIST_WARNING });
  }

  return NextResponse.json(result.value);
}
