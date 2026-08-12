import { NextResponse } from "next/server";
import {
  restoreBackup,
  pinBackup,
  unpinBackup,
  deleteBackup,
  DEFAULT_GENTLE_AI_BACKUPS_DIR,
} from "@/services/backupsService";

export const dynamic = "force-dynamic";

function backupsDir(): string {
  return process.env.PRESETT_TEST_BACKUPS_DIR ?? DEFAULT_GENTLE_AI_BACKUPS_DIR;
}

type BackupAction = "restore" | "pin" | "unpin" | "delete";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { action?: BackupAction };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const action = body.action;
  if (!action || !["restore", "pin", "unpin", "delete"].includes(action)) {
    return NextResponse.json(
      { error: { message: "Missing or invalid action" } },
      { status: 400 },
    );
  }

  let result;
  switch (action) {
    case "restore":
      result = await restoreBackup(backupsDir(), id);
      break;
    case "pin":
      result = await pinBackup(backupsDir(), id);
      break;
    case "unpin":
      result = await unpinBackup(backupsDir(), id);
      break;
    case "delete":
      result = await deleteBackup(backupsDir(), id);
      break;
  }

  if (!result!.ok) {
    const status =
      result!.error.code === "PINNED_CANNOT_DELETE"
        ? 409
        : result!.error.code === "FILE_MISSING"
          ? 404
          : 500;
    return NextResponse.json({ error: result!.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
