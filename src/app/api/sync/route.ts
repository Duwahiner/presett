import { NextResponse } from "next/server";
import { runGentleAiSync } from "@/services/processService";

export const dynamic = "force-dynamic";

function syncCommand(): string {
  return process.env.PRESETT_TEST_SYNC_COMMAND ?? "gentle-ai";
}

export async function POST() {
  const result = await runGentleAiSync(syncCommand());

  if (!result.ok) {
    const status = result.error.code === "FILE_MISSING" ? 503 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result.value);
}
