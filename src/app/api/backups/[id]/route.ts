import { NextResponse } from "next/server";
import {
  restoreBackup,
  pinBackup,
  unpinBackup,
  deleteBackup,
  getBackupDetail,
  DEFAULT_GENTLE_AI_BACKUPS_DIR,
} from "@/services/backupsService";
import {
  buildSafeError,
  requireMutationOrigin,
  resolveBackupPath,
} from "@/lib/localApiSecurity";

export const dynamic = "force-dynamic";

function backupsDir(): string {
  return process.env.PRESETT_TEST_BACKUPS_DIR ?? DEFAULT_GENTLE_AI_BACKUPS_DIR;
}

type BackupAction = "restore" | "pin" | "unpin" | "delete";

const BACKUP_ACTIONS = ["restore", "pin", "unpin", "delete"] as const;

function isBackupAction(action: unknown): action is BackupAction {
  return typeof action === "string" && BACKUP_ACTIONS.includes(action as BackupAction);
}

function statusForErrorCode(code: string): number {
  if (code === "PINNED_CANNOT_DELETE") return 409;
  if (code === "FILE_MISSING") return 404;
  return 500;
}

function safeMessageForErrorCode(code: string): string {
  if (code === "PINNED_CANNOT_DELETE") return "Cannot delete pinned backup";
  if (code === "FILE_MISSING") return "Backup not found";
  if (code === "RESTORE_FAILED") return "Backup restore failed";
  return "Backup action failed";
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "OPTIONS, GET, POST",
      "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const backupPathResult = await resolveBackupPath(backupsDir(), id);
  if (!backupPathResult.ok) {
    return NextResponse.json(buildSafeError(backupPathResult.message), {
      status: backupPathResult.status,
    });
  }

  const result = await getBackupDetail(backupsDir(), id);
  if (!result.ok) {
    const status = result.error.code === "FILE_MISSING" ? 404 : 422;
    return NextResponse.json(buildSafeError("Backup detail unavailable"), { status });
  }

  return NextResponse.json({ backup: result.value });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), {
      status: originResult.status,
    });
  }

  const { id } = await params;
  const backupPathResult = await resolveBackupPath(backupsDir(), id);
  if (!backupPathResult.ok) {
    return NextResponse.json(buildSafeError(backupPathResult.message), {
      status: backupPathResult.status,
    });
  }

  let body: { action?: unknown; confirmed?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      buildSafeError("Invalid JSON body"),
      { status: 400 },
    );
  }

  const action = body.action;
  if (!isBackupAction(action)) {
    return NextResponse.json(
      buildSafeError("Missing or invalid action"),
      { status: 400 },
    );
  }

  if ((action === "restore" || action === "delete") && body.confirmed !== true) {
    return NextResponse.json(buildSafeError("Action requires confirmation"), {
      status: 400,
    });
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
    return NextResponse.json(
      buildSafeError(safeMessageForErrorCode(result!.error.code)),
      { status: statusForErrorCode(result!.error.code) },
    );
  }

  return NextResponse.json({ ok: true });
}
