import { stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

export type SafeRouteError = {
  error: { message: string };
};

export type SecurityGuardResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export type BackupPathResult =
  | { ok: true; path: string }
  | { ok: false; status: number; message: string };

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const BACKUP_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function buildSafeError(message: string): SafeRouteError {
  return { error: { message } };
}

export function requireMutationOrigin(request: Request): SecurityGuardResult {
  const origin = request.headers.get("origin");
  if (!origin) {
    return { ok: false, status: 403, message: "Forbidden local API origin" };
  }

  try {
    const { hostname } = new URL(origin);
    const normalizedHostname = hostname.toLowerCase();
    const bracketedHostname = normalizedHostname.includes(":")
      ? `[${normalizedHostname}]`
      : normalizedHostname;
    if (
      LOOPBACK_HOSTS.has(normalizedHostname) ||
      LOOPBACK_HOSTS.has(bracketedHostname)
    ) {
      return { ok: true };
    }
  } catch {
    return { ok: false, status: 403, message: "Forbidden local API origin" };
  }

  return { ok: false, status: 403, message: "Forbidden local API origin" };
}

export function isValidBackupId(id: string): boolean {
  return (
    BACKUP_ID_PATTERN.test(id) &&
    !id.includes("..") &&
    !id.includes("/") &&
    !id.includes("\\")
  );
}

export async function resolveBackupPath(
  backupsDir: string,
  id: string,
): Promise<BackupPathResult> {
  if (!isValidBackupId(id)) {
    return { ok: false, status: 400, message: "Invalid backup id" };
  }

  const rootPath = resolve(backupsDir);
  const backupPath = resolve(rootPath, id);
  const pathFromRoot = relative(rootPath, backupPath);

  if (
    pathFromRoot === "" ||
    pathFromRoot.startsWith("..") ||
    pathFromRoot.includes(`..${sep}`) ||
    resolve(pathFromRoot) === pathFromRoot
  ) {
    return { ok: false, status: 400, message: "Invalid backup id" };
  }

  try {
    const backupStat = await stat(backupPath);
    if (!backupStat.isDirectory()) {
      return { ok: false, status: 404, message: "Backup not found" };
    }
  } catch {
    return { ok: false, status: 404, message: "Backup not found" };
  }

  return { ok: true, path: backupPath };
}
