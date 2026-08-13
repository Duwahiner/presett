import { NextResponse } from "next/server";
import { checkGentleAiReleases } from "@/services/diagnosticsService";
import { probeGentleAiVersion } from "@/services/processService";

export const dynamic = "force-dynamic";

let activeCheck: Promise<Response> | null = null;

export async function POST() {
  if (activeCheck) {
    return NextResponse.json(
      { status: { phase: "checking", message: "Release check already in progress" } },
      { status: 202 },
    );
  }

  activeCheck = runCheck().finally(() => {
    activeCheck = null;
  });
  return activeCheck;
}

async function runCheck() {
  const version = await probeGentleAiVersion();
  if (!version.ok) {
    return NextResponse.json(
      { status: { phase: "error", code: "cli_unavailable", message: "CLI unavailable" } },
      { status: 503 },
    );
  }

  const state = await checkGentleAiReleases({ installedVersion: version.value });
  return NextResponse.json(state);
}
