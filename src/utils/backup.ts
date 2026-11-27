import { copyFile, mkdir, rename, stat, writeFile, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Result } from "@/lib/types";
import { err, ok } from "@/lib/types";

/**
 * Build a timestamped, sortable backup file name for a source file.
 * Format: `YYYYMMDD-HHMMSS__<sourceName>` (second-resolution stamp) so backups
 * sort chronologically and the source name survives.
 */
export function backupFileName(
  sourceName: string,
  now: Date = new Date(),
): string {
  const stamp =
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-` +
    `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `${stamp}__${sourceName}`;
}

/**
 * Create an atomic backup of `sourceFile` inside `backupDir`. The content is
 * first staged at a temp sibling path and then renamed into place, so a
 * concurrent reader never observes a partially-written backup. Returns the
 * final backup path on success.
 */
export async function createAtomicBackup(
  sourceFile: string,
  backupDir: string,
): Promise<Result<string>> {
  try {
    await stat(sourceFile);
  } catch (cause) {
    return err({
      code: "FILE_MISSING",
      message: `Cannot backup missing file: ${sourceFile}`,
      file: sourceFile,
      cause,
    });
  }

  await mkdir(backupDir, { recursive: true });
  const target = join(backupDir, backupFileName(basename(sourceFile)));
  const tmp = `${target}.presett-tmp`;

  try {
    await copyFile(sourceFile, tmp);
    await rename(tmp, target);
    return ok(target);
  } catch (cause) {
    await rm(tmp, { force: true }).catch(() => undefined);
    return err({
      code: "ATOMIC_WRITE_FAILED",
      message: `Failed to atomically back up ${sourceFile}`,
      cause,
    });
  }
}

/**
 * Atomic-write helper: write `content` to `target` via a temp sibling + rename.
 * Used where a backup content needs to be materialized from memory rather than
 * copied from an existing file.
 */
export async function atomicWrite(
  target: string,
  content: string,
): Promise<Result<void>> {
  const tmp = `${target}.presett-tmp`;
  try {
    await writeFile(tmp, content);
    await rename(tmp, target);
    return ok(undefined);
  } catch (cause) {
    await rm(tmp, { force: true }).catch(() => undefined);
    return err({
      code: "ATOMIC_WRITE_FAILED",
      message: `Failed to atomically write ${target}`,
      cause,
    });
  }
}