import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, readFile, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAtomicBackup, backupFileName } from "../backup";

describe("createAtomicBackup", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-atomic-backup-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("copies the source file content into the backup directory", async () => {
    const source = join(tempDir, "opencode.json");
    const backupDir = join(tempDir, "backups");
    await writeFile(source, '{"agent":{}}');

    const result = await createAtomicBackup(source, backupDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const content = await readFile(result.value, "utf-8");
    expect(content).toBe('{"agent":{}}');
  });

  it("writes the backup atomically: only the final file exists, no leftover temp", async () => {
    const source = join(tempDir, "opencode.json");
    const backupDir = join(tempDir, "backups");
    await writeFile(source, '{"agent":{"a":{}}}');

    const result = await createAtomicBackup(source, backupDir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const files = await readdir(backupDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe(result.value.split(/[\\/]/).pop());
    expect(files[0].includes(".presett-tmp")).toBe(false);
  });

  it("returns FILE_MISSING when the source file does not exist", async () => {
    const result = await createAtomicBackup(
      join(tempDir, "missing.json"),
      join(tempDir, "backups"),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("FILE_MISSING");
  });

  it("creates the backup directory recursively when missing", async () => {
    const source = join(tempDir, "opencode.json");
    const backupDir = join(tempDir, "nested", "backups");
    await writeFile(source, "{}");

    const result = await createAtomicBackup(source, backupDir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    await expect(stat(result.value)).resolves.toBeDefined();
  });

  it("generates a timestamped backup file name", () => {
    // Construct in local time to match backupFileName's local-time stamping.
    const now = new Date(2026, 8, 4, 12, 0, 0); // Sep 4 2026 12:00:00 local
    const name = backupFileName("opencode.json", now);
    expect(name).toMatch(/^20260904-120000__opencode\.json$/);
  });
});