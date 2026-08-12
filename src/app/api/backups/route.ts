import { NextResponse } from "next/server";
import { listBackups } from "@/services/backupsService";
import { DEFAULT_GENTLE_AI_BACKUPS_DIR } from "@/services/backupsService";

export const dynamic = "force-dynamic";

function backupsDir(): string {
  return process.env.PRESETT_TEST_BACKUPS_DIR ?? DEFAULT_GENTLE_AI_BACKUPS_DIR;
}

export async function GET() {
  const backups = await listBackups(backupsDir());
  return NextResponse.json({ backups });
}
