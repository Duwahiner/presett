import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { syncStatePath, type PathContext } from "@/lib/paths";
import type { Result } from "@/lib/types";
import { err, ok } from "@/lib/types";

export function isValidSyncTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export async function readSyncState(
  ctx: PathContext = {},
): Promise<string | undefined> {
  try {
    const raw = await readFile(syncStatePath(ctx), "utf-8");
    const parsed = JSON.parse(raw) as { lastSuccessfulSyncAt?: unknown };
    if (!isValidSyncTimestamp(parsed.lastSuccessfulSyncAt)) return undefined;
    return parsed.lastSuccessfulSyncAt;
  } catch {
    return undefined;
  }
}

export async function writeSyncTimestamp(
  ctx: PathContext = {},
): Promise<Result<void>> {
  const dest = syncStatePath(ctx);
  const tmp = `${dest}.tmp`;
  try {
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(
      tmp,
      JSON.stringify({ lastSuccessfulSyncAt: new Date().toISOString() }, null, 2),
      "utf-8",
    );
    await rename(tmp, dest);
    return ok(undefined);
  } catch (cause) {
    return err({
      code: "ATOMIC_WRITE_FAILED",
      message: "Failed to write sync-state.json",
      file: dest,
      cause,
    });
  }
}