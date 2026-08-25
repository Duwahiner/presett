import { readFile, writeFile, rename, rm, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import type { Locale } from "@/types/state";
import type { Result } from "@/lib/types";
import { err, ok } from "@/lib/types";
import { createPreWriteBackup, prunePreWriteBackups } from "@/lib/preWriteBackup";

export interface GentleAiConfig { [key: string]: unknown }

export async function readGentleAiConfigSafe(dir: string): Promise<Result<GentleAiConfig>> {
  try {
    const value = JSON.parse(await readFile(join(dir, "state.json"), "utf8")) as GentleAiConfig;
    return ok(value);
  } catch (cause) {
    return err({ code: "FILE_MISSING", message: "state.json not found", cause });
  }
}

export async function writeGentleAiConfig(dir: string, config: GentleAiConfig, backupDir: string): Promise<Result<void>> {
  const target = join(dir, "state.json");
  const tmp = `${target}.presett-tmp`;
  await mkdir(dir, { recursive: true });
  try { await access(target); } catch { /* First save has no prior file to back up. */ }
  let backup: Result<string> = ok("");
  try { await access(target); backup = await createPreWriteBackup(target, backupDir); } catch { /* no existing state */ }
  if (!backup.ok) return backup;
  try {
    await writeFile(tmp, JSON.stringify(config, null, 2));
    await rename(tmp, target);
    await prunePreWriteBackups(backupDir, 20);
    const verify = await readGentleAiConfigSafe(dir);
    return verify.ok ? ok(undefined) : err({ code: "ATOMIC_WRITE_FAILED", message: "Wrote state.json but could not re-read it" });
  } catch (cause) {
    await rm(tmp, { force: true });
    return err({ code: "ATOMIC_WRITE_FAILED", message: "Failed to atomically write state.json", cause });
  }
}
