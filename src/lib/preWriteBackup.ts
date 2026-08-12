import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Result } from "@/lib/types";
import { err, ok } from "@/lib/types";

export function backupFileName(sourceName: string): string {
  const now = new Date();
  const stamp =
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-` +
    `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `${stamp}__${sourceName}`;
}

export async function createPreWriteBackup(
  sourceFile: string,
  backupDir: string,
): Promise<Result<string>> {
  try {
    await stat(sourceFile);
  } catch {
    return err({
      code: "FILE_MISSING",
      message: `Cannot backup missing file: ${sourceFile}`,
      file: sourceFile,
    });
  }

  await mkdir(backupDir, { recursive: true });
  const target = join(backupDir, backupFileName(basename(sourceFile)));
  await copyFile(sourceFile, target);
  return ok(target);
}

export async function prunePreWriteBackups(
  backupDir: string,
  keep: number,
): Promise<void> {
  let files: string[];
  try {
    files = await readdir(backupDir);
  } catch {
    return;
  }

  const backups = files
    .filter((f) => f.endsWith("__opencode.json"))
    .sort()
    .reverse();

  const toRemove = backups.slice(keep);
  for (const file of toRemove) {
    await rm(join(backupDir, file), { force: true });
  }
}
