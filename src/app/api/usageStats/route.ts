import { NextResponse } from "next/server";
import { collectUsageStats, type DaysFilter, type UsageStatsOptions } from "@/services/usageStatsService";

export const dynamic = "force-dynamic";

const VALID_DAYS = new Set(["7", "30", "0"]);
const MAX_PROJECT_LENGTH = 512;

function invalid(message: string): NextResponse {
  return NextResponse.json({ error: { code: "VALIDATION_ERROR", message } }, { status: 400 });
}

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const daysParam = searchParams.get("days");
  const project = searchParams.get("project");

  if (!daysParam || !VALID_DAYS.has(daysParam)) {
    return invalid("days must be one of 7, 30, or 0");
  }

  const opts: UsageStatsOptions = { days: Number(daysParam) as DaysFilter };

  if (project !== null) {
    if (project.length === 0) {
      return invalid("project must not be empty");
    }
    if (project.length > MAX_PROJECT_LENGTH) {
      return invalid("project must be at most 512 characters");
    }
    if (project.includes("\u0000")) {
      return invalid("project must not contain null bytes");
    }
    opts.project = project;
  }

  const result = await collectUsageStats(opts);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json(result.value);
}
