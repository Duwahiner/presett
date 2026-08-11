import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Result } from "@/lib/types";
import { err, ok } from "@/lib/types";

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

    results.push({
      id,
      source: manifest.root_dir,
      timestamp: manifest.created_at,
      fileCount: manifest.entries.length,
      size,
      pinned: id.startsWith("upgrade-"),
    });
  }

  return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
