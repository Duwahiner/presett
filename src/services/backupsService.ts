import { readdir, readFile, stat, writeFile, unlink, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Result } from "@/lib/types";
import { err, ok } from "@/lib/types";
import { isValidBackupId } from "@/lib/localApiSecurity";

const execFileAsync = promisify(execFile);

interface BackupMutationIO {
  writeFile?: typeof writeFile;
  unlink?: typeof unlink;
  rm?: typeof rm;
}

export const DEFAULT_GENTLE_AI_BACKUPS_DIR = join(
  homedir(),
  ".gentle-ai",
  "backups",
);

export interface BackupManifest {
  id: string;
  created_at: string;
  root_dir: string;
  entries: Array<{ original_path: string }>;
}

export interface BackupInfo {
  id: string;
  source: string;
  timestamp: string;
  fileCount: number;
  size: number;
  pinned: boolean;
}

export interface BackupDetail extends BackupInfo {
  files: Array<{ path: string | null }>;
  changePreview: { available: false };
}

function safeEntryPath(originalPath: string, rootDir: string): string | null {
  const normalizedPath = originalPath.replaceAll("\\", "/");
  const normalizedRoot = rootDir.replaceAll("\\", "/").replace(/\/$/, "");
  const isAbsolute = normalizedPath.startsWith("/") || /^[A-Za-z]:\//.test(normalizedPath);

  if (!isAbsolute) {
    const segments = normalizedPath.split("/");
    return segments.some((segment) => segment === "..")
      ? null
      : segments.filter((segment) => segment && segment !== ".").join("/") || null;
  }

  const rootPrefix = `${normalizedRoot}/`;
  if (!normalizedPath.startsWith(rootPrefix)) return null;

  const relativePath = normalizedPath.slice(rootPrefix.length);
  return relativePath && !relativePath.split("/").includes("..") ? relativePath : null;
}

export async function readBackupManifest(
  backupsDir: string,
  id: string,
): Promise<Result<BackupManifest>> {
  const manifestPath = join(backupsDir, id, "manifest.json");
  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf-8");
  } catch (cause) {
    return err({
      code: "FILE_MISSING",
      message: `Backup manifest not found: ${manifestPath}`,
      cause,
    });
  }

  try {
    return ok(JSON.parse(raw) as BackupManifest);
  } catch (cause) {
    return err({
      code: "PARSE_FAILED",
      message: `Backup manifest is not valid JSON: ${manifestPath}`,
      cause,
    });
  }
}

export async function listBackups(
  backupsDir: string = DEFAULT_GENTLE_AI_BACKUPS_DIR,
): Promise<BackupInfo[]> {
  let ids: string[];
  try {
    ids = await readdir(backupsDir);
  } catch {
    return [];
  }

  const results: BackupInfo[] = [];
  for (const id of ids) {
    const manifestResult = await readBackupManifest(backupsDir, id);
    if (!manifestResult.ok) continue;

    const manifest = manifestResult.value;
    let size = 0;
    try {
      const tarStat = await stat(join(backupsDir, id, "snapshot.tar.gz"));
      size = tarStat.size;
    } catch {
      size = 0;
    }

    let pinned = false;
    try {
      await stat(join(backupsDir, id, ".pinned"));
      pinned = true;
    } catch {
      pinned = false;
    }

    results.push({
      id,
      source: manifest.root_dir,
      timestamp: manifest.created_at,
      fileCount: manifest.entries.length,
      size,
      pinned,
    });
  }

  return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getBackupDetail(
  backupsDir: string,
  id: string,
): Promise<Result<BackupDetail>> {
  const backupDirResult = await ensureExistingBackupDir(backupsDir, id);
  if (!backupDirResult.ok) return err(backupDirResult.error);

  const manifestResult = await readBackupManifest(backupsDir, id);
  if (!manifestResult.ok) return err(manifestResult.error);

  const manifest = manifestResult.value;
  if (
    typeof manifest.created_at !== "string" ||
    Number.isNaN(Date.parse(manifest.created_at)) ||
    typeof manifest.root_dir !== "string" ||
    manifest.root_dir.length === 0 ||
    !Array.isArray(manifest.entries) ||
    manifest.entries.some((entry) => typeof entry?.original_path !== "string")
  ) {
    return err({ code: "SCHEMA_INVALID", message: "Invalid backup manifest" });
  }

  let size = 0;
  try {
    size = (await stat(join(backupDirResult.value, "snapshot.tar.gz"))).size;
  } catch {
    size = 0;
  }

  return ok({
    id,
    source: manifest.root_dir,
    timestamp: manifest.created_at,
    fileCount: manifest.entries.length,
    size,
    pinned: await isPinned(backupsDir, id),
    files: manifest.entries.map((entry) => ({
      path: safeEntryPath(entry.original_path, manifest.root_dir),
    })),
    changePreview: { available: false },
  });
}

function isPinned(backupsDir: string, id: string): Promise<boolean> {
  return stat(join(backupsDir, id, ".pinned"))
    .then(() => true)
    .catch(() => false);
}

async function ensureExistingBackupDir(
  backupsDir: string,
  id: string,
): Promise<Result<string>> {
  if (!isValidBackupId(id)) {
    return err({
      code: "SCHEMA_INVALID",
      message: "Invalid backup id",
    });
  }

  const backupDir = join(backupsDir, id);
  try {
    const backupStat = await stat(backupDir);
    if (!backupStat.isDirectory()) {
      return err({
        code: "FILE_MISSING",
        message: `Backup not found: ${id}`,
      });
    }
  } catch (cause) {
    return err({
      code: "FILE_MISSING",
      message: `Backup not found: ${id}`,
      cause,
    });
  }

  return ok(backupDir);
}

export async function restoreBackup(
  backupsDir: string,
  id: string,
): Promise<Result<void>> {
  const backupDirResult = await ensureExistingBackupDir(backupsDir, id);
  if (!backupDirResult.ok) {
    return err(backupDirResult.error);
  }

  const manifestResult = await readBackupManifest(backupsDir, id);
  if (!manifestResult.ok) {
    return err(manifestResult.error);
  }

  const tarPath = join(backupsDir, id, "snapshot.tar.gz");
  const rootDir = manifestResult.value.root_dir;

  try {
    await stat(tarPath);
  } catch {
    return err({
      code: "FILE_MISSING",
      message: `Snapshot file not found: ${tarPath}`,
    });
  }

  try {
    await execFileAsync("tar", ["-xzf", tarPath, "-C", rootDir]);
    return ok(undefined);
  } catch (cause) {
    return err({
      code: "RESTORE_FAILED",
      message: `Failed to restore backup ${id} to ${rootDir}`,
      cause,
    });
  }
}

export async function pinBackup(
  backupsDir: string,
  id: string,
  io: BackupMutationIO = {},
): Promise<Result<void>> {
  const backupDirResult = await ensureExistingBackupDir(backupsDir, id);
  if (!backupDirResult.ok) {
    return err(backupDirResult.error);
  }

  const markerPath = join(backupsDir, id, ".pinned");
  try {
    await (io.writeFile ?? writeFile)(markerPath, "");
    return ok(undefined);
  } catch (cause) {
    return err({
      code: "WRITE_BLOCKED",
      message: `Failed to pin backup ${id}`,
      cause,
    });
  }
}

export async function unpinBackup(
  backupsDir: string,
  id: string,
  io: BackupMutationIO = {},
): Promise<Result<void>> {
  const backupDirResult = await ensureExistingBackupDir(backupsDir, id);
  if (!backupDirResult.ok) {
    return err(backupDirResult.error);
  }

  const markerPath = join(backupsDir, id, ".pinned");
  try {
    await (io.unlink ?? unlink)(markerPath);
    return ok(undefined);
  } catch (cause) {
    return err({
      code: "FILE_MISSING",
      message: `Failed to unpin backup ${id} (not pinned)`,
      cause,
    });
  }
}

export async function deleteBackup(
  backupsDir: string,
  id: string,
  io: BackupMutationIO = {},
): Promise<Result<void>> {
  const backupDirResult = await ensureExistingBackupDir(backupsDir, id);
  if (!backupDirResult.ok) {
    return err(backupDirResult.error);
  }

  if (await isPinned(backupsDir, id)) {
    return err({
      code: "PINNED_CANNOT_DELETE",
      message: `Cannot delete pinned backup ${id}`,
    });
  }

  const backupDir = join(backupsDir, id);
  try {
    await (io.rm ?? rm)(backupDir, { recursive: true, force: true });
    return ok(undefined);
  } catch (cause) {
    return err({
      code: "FILE_MISSING",
      message: `Failed to delete backup ${id}`,
      cause,
    });
  }
}
